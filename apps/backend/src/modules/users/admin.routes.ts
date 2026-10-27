import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/async-handler.js';
import { authenticate, requireAdmin } from '../../common/middleware.js';
import { AppError, notFound } from '../../common/errors.js';
import { success } from '../../common/response.js';
import { validate } from '../../common/validate.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { env } from '../../config/env.js';
import { hashPassword } from '../auth/password.service.js';

export const adminRouter = Router();
adminRouter.use(authenticate, requireAdmin);

const usersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
}).strict();
const accountParamsSchema = z.object({ id: z.string().uuid() }).strict();
const updateAccountSchema = z.object({
  role: z.enum(['USER', 'ADMIN']).optional(),
  password: z.string().min(10, 'Mật khẩu cần ít nhất 10 ký tự.').max(72, 'Mật khẩu không được quá 72 ký tự.')
    .refine((value) => new TextEncoder().encode(value).length <= 72, 'Mật khẩu dài quá 72 byte.').optional(),
}).strict().refine((value) => value.role !== undefined || value.password !== undefined, 'Hãy chọn vai trò hoặc nhập mật khẩu mới.');
const accountStatusSchema = z.object({ disabled: z.boolean() }).strict();

adminRouter.get('/dashboard', asyncHandler(async (_req, res) => {
  const now = new Date();
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setUTCHours(0, 0, 0, 0);

  // Gộp user counts thành 1 groupBy thay vì 4 count riêng lẻ
  // Gộp reading counts thành 1 groupBy thay vì 4 count riêng lẻ
  // Gộp document counts thành 1 groupBy thay vì 4 count riêng lẻ
  // Thay count(*) bằng aggregate với _count cho aiUsage
  const [
    userStats,
    newUsersThisWeek,
    readingStatusCounts,
    readingsThisWeek,
    cards,
    docStatusCounts,
    chunks,
    aiStatsToday,
    aiStatsTotal,
    recentReadings,
    recentUsers,
    recentAiUsage,
    ragState,
    allTopics,
    allSpreads,
    readingsPast7Days,
    aiUsagePast7Days,
  ] = await Promise.all([
    // 1 query thay 3: user counts nhóm theo isGuest + disabledAt
    prisma.user.groupBy({
      by: ['isGuest'],
      _count: { id: true },
    }),
    // new users this week
    prisma.user.count({ where: { isGuest: false, createdAt: { gte: sevenDaysAgo } } }),
    // 1 query thay 3: reading counts nhóm theo status — dùng index (status, createdAt)
    prisma.reading.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.reading.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    // EXISTS thay count(*) — chỉ cần biết có hay không
    prisma.tarotCard.count(),
    // 1 query thay 4: document counts nhóm theo status — dùng index (status, updatedAt)
    prisma.knowledgeDocument.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.knowledgeChunk.count(),
    // Gộp count + aggregate token thành 1 aggregate
    prisma.aiUsage.aggregate({
      where: { createdAt: { gte: today } },
      _count: { id: true },
      _sum: { promptTokens: true, outputTokens: true },
    }),
    // Gộp count + aggregate token thành 1 aggregate
    prisma.aiUsage.aggregate({
      _count: { id: true },
      _sum: { promptTokens: true, outputTokens: true },
    }),
    // Recent readings — INNER JOIN user qua select (Prisma tự LEFT JOIN nhưng select chỉ lấy cần thiết)
    prisma.reading.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, querentName: true, question: true,
        topic: true, spreadType: true, status: true, createdAt: true,
        user: { select: { displayName: true, email: true } },
      },
    }),
    // Recent users — dùng index (isGuest, createdAt DESC)
    prisma.user.findMany({
      where: { isGuest: false },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, displayName: true, email: true, username: true,
        role: true, disabledAt: true, createdAt: true,
        _count: { select: { readings: true } },
      },
    }),
    // Recent AI usage — INNER JOIN user
    prisma.aiUsage.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, modelName: true, promptTokens: true, outputTokens: true, createdAt: true,
        user: { select: { displayName: true } },
      },
    }),
    prisma.ragIndexState.findUnique({ where: { id: 1 } }),
    prisma.reading.groupBy({ by: ['topic'], _count: { topic: true } }),
    prisma.reading.groupBy({ by: ['spreadType'], _count: { spreadType: true } }),
    // Dùng index (createdAt DESC) — chỉ select createdAt
    prisma.reading.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.aiUsage.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    }),
  ]);

  // Giải nén userStats groupBy
  const totalUsers = userStats.find((r) => r.isGuest === false)?._count.id ?? 0;
  const guests     = userStats.find((r) => r.isGuest === true)?._count.id  ?? 0;
  // activeUsers cần query riêng vì lọc disabledAt — không groupBy được trực tiếp
  const activeUsers = await prisma.user.count({ where: { isGuest: false, disabledAt: null } });

  // Giải nén readingStatusCounts
  const readings            = readingStatusCounts.reduce((s, r) => s + r._count.id, 0);
  const interpretedReadings = readingStatusCounts.find((r) => r.status === 'INTERPRETED')?._count.id ?? 0;
  const drawnReadings       = readingStatusCounts.find((r) => r.status === 'DRAWN')?._count.id       ?? 0;

  // Giải nén docStatusCounts
  const documents    = docStatusCounts.reduce((s, r) => s + r._count.id, 0);
  const readyDocs    = docStatusCounts.find((r) => r.status === 'READY')?._count.id      ?? 0;
  const processingDocs = docStatusCounts.find((r) => r.status === 'PROCESSING')?._count.id ?? 0;
  const failedDocs   = docStatusCounts.find((r) => r.status === 'FAILED')?._count.id     ?? 0;

  // Giải nén AI stats
  const aiRequestsToday = aiStatsToday._count.id;
  const aiRequestsTotal = aiStatsTotal._count.id;
  const tokensToday     = (aiStatsToday._sum.promptTokens ?? 0) + (aiStatsToday._sum.outputTokens ?? 0);
  const tokensAllTime   = (aiStatsTotal._sum.promptTokens ?? 0) + (aiStatsTotal._sum.outputTokens ?? 0);

  // Daily trends — tính từ dữ liệu đã fetch, không thêm query
  const dailyTrends = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    dailyTrends.push({
      date: dateStr,
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      readings: readingsPast7Days.filter((r) => r.createdAt.toISOString().slice(0, 10) === dateStr).length,
      aiRequests: aiUsagePast7Days.filter((a) => a.createdAt.toISOString().slice(0, 10) === dateStr).length,
    });
  }

  const topicBreakdown = (['LOVE', 'CAREER', 'FINANCE', 'PERSONAL_GROWTH', 'GENERAL'] as const).map((t) => {
    const count = allTopics.find((item) => item.topic === t)?._count.topic ?? 0;
    return { topic: t, count, percentage: readings > 0 ? Math.round((count / readings) * 100) : 0 };
  });
  const spreadBreakdown = (['ONE_CARD', 'THREE_CARDS', 'FIVE_CARDS'] as const).map((s) => {
    const count = allSpreads.find((item) => item.spreadType === s)?._count.spreadType ?? 0;
    return { spreadType: s, count, percentage: readings > 0 ? Math.round((count / readings) * 100) : 0 };
  });

  success(res, {
    users: totalUsers, activeUsers, guests, newUsersThisWeek,
    readings, interpretedReadings, drawnReadings, readingsThisWeek,
    interpretationRate: readings > 0 ? Math.round((interpretedReadings / readings) * 100) : 100,
    cards, documents, chunks, readyDocs, processingDocs, failedDocs,
    aiRequestsToday, aiRequestsTotal, tokensToday, tokensAllTime,
    topicBreakdown, spreadBreakdown, dailyTrends,
    recentReadings, recentUsers, recentAiUsage,
    systemHealth: {
      database: 'healthy',
      geminiConfigured: Boolean(env.GEMINI_API_KEY),
      geminiModel: env.GEMINI_MODEL,
      openRouterConfigured: Boolean(env.OPENROUTER_API_KEY),
      openRouterModel: env.OPENROUTER_MODEL,
      embeddingModel: ragState?.embeddingModel ?? env.GEMINI_EMBEDDING_MODEL,
      dimension: ragState?.dimension ?? env.GEMINI_EMBEDDING_DIMENSION,
      dailyLimitPerUser: env.AI_DAILY_LIMIT_PER_USER,
    },
  });
}));

adminRouter.get('/users', validate(usersQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const query = req.query as unknown as z.infer<typeof usersQuerySchema>;
  const where = {
    isGuest: false,
    ...(query.search ? { OR: [
      { displayName: { contains: query.search } },
      { username: { contains: query.search } },
      { email: { contains: query.search } },
    ] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, email: true, username: true, displayName: true, role: true, disabledAt: true, createdAt: true, _count: { select: { readings: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.user.count({ where }),
  ]);
  success(res, items, 200, { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) });
}));

adminRouter.patch('/users/:id', validate(accountParamsSchema, 'params'), validate(updateAccountSchema), asyncHandler(async (req, res) => {
  const { id } = req.params as z.infer<typeof accountParamsSchema>;
  const input = req.body as z.infer<typeof updateAccountSchema>;
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, disabledAt: true, isGuest: true } });
  if (!target || target.isGuest) throw notFound('Account not found.');
  if (target.id === req.user!.id && input.role === 'USER') throw new AppError(409, 'CANNOT_DEMOTE_SELF', 'Bạn không thể tự hạ quyền quản trị của mình.');
  if (target.role === 'ADMIN' && input.role === 'USER') {
    const activeAdmins = await prisma.user.count({ where: { role: 'ADMIN', isGuest: false, disabledAt: null } });
    if (activeAdmins <= 1) throw new AppError(409, 'LAST_ADMIN_REQUIRED', 'Cần giữ lại ít nhất một quản trị viên đang hoạt động.');
  }
  const passwordHash = input.password ? await hashPassword(input.password) : undefined;
  const updated = await prisma.$transaction(async (tx) => {
    const account = await tx.user.update({
      where: { id },
      data: { ...(input.role ? { role: input.role } : {}), ...(passwordHash ? { passwordHash } : {}) },
      select: { id: true, email: true, username: true, displayName: true, role: true, disabledAt: true, createdAt: true, _count: { select: { readings: true } } },
    });
    if (passwordHash || (input.role && input.role !== target.role)) {
      await tx.refreshSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    return account;
  });
  success(res, updated);
}));

adminRouter.patch('/users/:id/status', validate(accountParamsSchema, 'params'), validate(accountStatusSchema), asyncHandler(async (req, res) => {
  const { id } = req.params as z.infer<typeof accountParamsSchema>;
  const { disabled } = req.body as z.infer<typeof accountStatusSchema>;
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, disabledAt: true, isGuest: true } });
  if (!target || target.isGuest) throw notFound('Account not found.');
  if (disabled && target.id === req.user!.id) throw new AppError(409, 'CANNOT_DISABLE_SELF', 'Bạn không thể tự vô hiệu hóa tài khoản đang sử dụng.');
  if (disabled && target.role === 'ADMIN' && !target.disabledAt) {
    const activeAdmins = await prisma.user.count({ where: { role: 'ADMIN', isGuest: false, disabledAt: null } });
    if (activeAdmins <= 1) throw new AppError(409, 'LAST_ADMIN_REQUIRED', 'Cần giữ lại ít nhất một quản trị viên đang hoạt động.');
  }
  const updated = await prisma.$transaction(async (tx) => {
    const account = await tx.user.update({
      where: { id },
      data: { disabledAt: disabled ? target.disabledAt ?? new Date() : null },
      select: { id: true, email: true, username: true, displayName: true, role: true, disabledAt: true, createdAt: true, _count: { select: { readings: true } } },
    });
    if (disabled) await tx.refreshSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    return account;
  });
  success(res, updated);
}));

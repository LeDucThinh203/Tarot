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

  const [
    users,
    activeUsers,
    guests,
    newUsersThisWeek,
    readings,
    interpretedReadings,
    drawnReadings,
    readingsThisWeek,
    cards,
    documents,
    chunks,
    readyDocs,
    processingDocs,
    failedDocs,
    aiRequestsToday,
    aiRequestsTotal,
    aiTokenStatsToday,
    aiTokenStatsTotal,
    recentReadings,
    recentUsers,
    recentAiUsage,
    ragState,
    allTopics,
    allSpreads,
    readingsPast7Days,
    aiUsagePast7Days,
  ] = await Promise.all([
    prisma.user.count({ where: { isGuest: false } }),
    prisma.user.count({ where: { isGuest: false, disabledAt: null } }),
    prisma.user.count({ where: { isGuest: true } }),
    prisma.user.count({ where: { isGuest: false, createdAt: { gte: sevenDaysAgo } } }),
    prisma.reading.count(),
    prisma.reading.count({ where: { status: 'INTERPRETED' } }),
    prisma.reading.count({ where: { status: 'DRAWN' } }),
    prisma.reading.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.tarotCard.count(),
    prisma.knowledgeDocument.count(),
    prisma.knowledgeChunk.count(),
    prisma.knowledgeDocument.count({ where: { status: 'READY' } }),
    prisma.knowledgeDocument.count({ where: { status: 'PROCESSING' } }),
    prisma.knowledgeDocument.count({ where: { status: 'FAILED' } }),
    prisma.aiUsage.count({ where: { createdAt: { gte: today } } }),
    prisma.aiUsage.count(),
    prisma.aiUsage.aggregate({
      where: { createdAt: { gte: today } },
      _sum: { promptTokens: true, outputTokens: true },
    }),
    prisma.aiUsage.aggregate({
      _sum: { promptTokens: true, outputTokens: true },
    }),
    prisma.reading.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        querentName: true,
        question: true,
        topic: true,
        spreadType: true,
        status: true,
        createdAt: true,
        user: { select: { displayName: true, email: true } },
      },
    }),
    prisma.user.findMany({
      where: { isGuest: false },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        displayName: true,
        email: true,
        username: true,
        role: true,
        disabledAt: true,
        createdAt: true,
        _count: { select: { readings: true } },
      },
    }),
    prisma.aiUsage.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        modelName: true,
        promptTokens: true,
        outputTokens: true,
        createdAt: true,
        user: { select: { displayName: true } },
      },
    }),
    prisma.ragIndexState.findFirst(),
    prisma.reading.groupBy({
      by: ['topic'],
      _count: { topic: true },
    }),
    prisma.reading.groupBy({
      by: ['spreadType'],
      _count: { spreadType: true },
    }),
    prisma.reading.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.aiUsage.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    }),
  ]);

  const dailyTrends = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
    
    const dayReadings = readingsPast7Days.filter((r) => r.createdAt.toISOString().slice(0, 10) === dateStr).length;
    const dayAi = aiUsagePast7Days.filter((a) => a.createdAt.toISOString().slice(0, 10) === dateStr).length;
    
    dailyTrends.push({
      date: dateStr,
      label: dayLabel,
      readings: dayReadings,
      aiRequests: dayAi,
    });
  }

  const topicBreakdown = (['LOVE', 'CAREER', 'FINANCE', 'PERSONAL_GROWTH', 'GENERAL'] as const).map((t) => {
    const found = allTopics.find((item) => item.topic === t);
    const count = found?._count.topic ?? 0;
    const percentage = readings > 0 ? Math.round((count / readings) * 100) : 0;
    return { topic: t, count, percentage };
  });

  const spreadBreakdown = (['ONE_CARD', 'THREE_CARDS', 'FIVE_CARDS'] as const).map((s) => {
    const found = allSpreads.find((item) => item.spreadType === s);
    const count = found?._count.spreadType ?? 0;
    const percentage = readings > 0 ? Math.round((count / readings) * 100) : 0;
    return { spreadType: s, count, percentage };
  });

  const tokensToday = (aiTokenStatsToday._sum.promptTokens ?? 0) + (aiTokenStatsToday._sum.outputTokens ?? 0);
  const tokensAllTime = (aiTokenStatsTotal._sum.promptTokens ?? 0) + (aiTokenStatsTotal._sum.outputTokens ?? 0);
  const interpretationRate = readings > 0 ? Math.round((interpretedReadings / readings) * 100) : 100;

  success(res, {
    users,
    activeUsers,
    guests,
    newUsersThisWeek,
    readings,
    interpretedReadings,
    drawnReadings,
    readingsThisWeek,
    interpretationRate,
    cards,
    documents,
    chunks,
    readyDocs,
    processingDocs,
    failedDocs,
    aiRequestsToday,
    aiRequestsTotal,
    tokensToday,
    tokensAllTime,
    topicBreakdown,
    spreadBreakdown,
    dailyTrends,
    recentReadings,
    recentUsers,
    recentAiUsage,
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

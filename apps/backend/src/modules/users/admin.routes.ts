import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/async-handler.js';
import { authenticate, requireAdmin } from '../../common/middleware.js';
import { AppError, notFound } from '../../common/errors.js';
import { success } from '../../common/response.js';
import { validate } from '../../common/validate.js';
import { prisma } from '../../infrastructure/database/prisma.js';
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
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const [users, readings, interpretedReadings, cards, documents, chunks, aiRequestsToday] = await Promise.all([
    prisma.user.count({ where: { isGuest: false } }),
    prisma.reading.count(),
    prisma.reading.count({ where: { status: 'INTERPRETED' } }),
    prisma.tarotCard.count(),
    prisma.knowledgeDocument.count(),
    prisma.knowledgeChunk.count(),
    prisma.aiUsage.count({ where: { createdAt: { gte: today } } }),
  ]);
  success(res, { users, readings, interpretedReadings, cards, documents, chunks, aiRequestsToday });
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

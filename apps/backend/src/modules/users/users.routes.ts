import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/async-handler.js';
import { authenticate } from '../../common/middleware.js';
import { notFound } from '../../common/errors.js';
import { success } from '../../common/response.js';
import { validate } from '../../common/validate.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { env } from '../../config/env.js';

export const usersRouter = Router();
usersRouter.use(authenticate);
const patchSchema = z.object({ displayName: z.string().trim().min(2, 'Tên hiển thị cần ít nhất 2 ký tự.').max(100, 'Tên hiển thị không được quá 100 ký tự.')
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), 'Tên hiển thị chứa ký tự không hợp lệ.') }).strict();

usersRouter.get('/me', asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, email: true, username: true, displayName: true, role: true, isGuest: true, createdAt: true } });
  if (!user) throw notFound('User not found.');
  success(res, user);
}));
usersRouter.get('/me/dashboard', asyncHandler(async (req, res) => {
  const [user, readings, interpretedReadings] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user!.id }, select: { createdAt: true } }),
    prisma.reading.count({ where: { userId: req.user!.id } }),
    prisma.reading.count({ where: { userId: req.user!.id, status: 'INTERPRETED' } }),
  ]);
  if (!user) throw notFound('User not found.');
  success(res, { createdAt: user.createdAt, readings, interpretedReadings });
}));
usersRouter.patch('/me', validate(patchSchema), asyncHandler(async (req, res) => {
  const user = await prisma.user.update({ where: { id: req.user!.id }, data: req.body as z.infer<typeof patchSchema>, select: { id: true, email: true, username: true, displayName: true, role: true, createdAt: true } });
  success(res, user);
}));
usersRouter.delete('/me', asyncHandler(async (req, res) => {
  await prisma.user.delete({ where: { id: req.user!.id } });
  res.clearCookie('refreshToken', { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'strict', path: '/api/v1/auth' });
  success(res, { deleted: true });
}));

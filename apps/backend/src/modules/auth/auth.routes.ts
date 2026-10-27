import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler } from '../../common/async-handler.js';
import { success } from '../../common/response.js';
import { validate } from '../../common/validate.js';
import { authenticate } from '../../common/middleware.js';
import { AppError } from '../../common/errors.js';
import { env } from '../../config/env.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { loginSchema, registerSchema } from './auth.schema.js';
import * as service from './auth.service.js';

export const authRouter = Router();
const refreshCookie = { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: env.COOKIE_SAME_SITE, path: '/api/v1/auth', maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86400000 };
const guestClaimCookie = { ...refreshCookie };
const guestSessionLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false });
function sendSession(res: Parameters<typeof success>[0], session: Awaited<ReturnType<typeof service.login>>) {
  res.cookie('refreshToken', session.refreshToken, refreshCookie);
  success(res, { user: session.user, accessToken: session.accessToken });
}

authRouter.post('/register', validate(registerSchema), asyncHandler(async (req, res) => {
  const session = await service.register(req.body as z.infer<typeof registerSchema>, req.cookies?.guestClaimToken as string | undefined);
  res.cookie('refreshToken', session.refreshToken, refreshCookie);
  res.clearCookie('guestClaimToken', guestClaimCookie);
  success(res, { user: session.user, accessToken: session.accessToken }, 201);
}));
authRouter.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const session = await service.login(req.body as z.infer<typeof loginSchema>, req.cookies?.guestClaimToken as string | undefined);
  res.clearCookie('guestClaimToken', guestClaimCookie);
  sendSession(res, session);
}));
authRouter.post('/guest', guestSessionLimiter, asyncHandler(async (_req, res) => {
  const { session, claimToken } = await service.createGuest();
  res.cookie('refreshToken', session.refreshToken, refreshCookie);
  res.cookie('guestClaimToken', claimToken, guestClaimCookie);
  success(res, { accessToken: session.accessToken }, 201);
}));
authRouter.post('/refresh', asyncHandler(async (req, res) => {
  const session = await service.rotateRefresh(req.cookies?.refreshToken as string | undefined);
  res.cookie('refreshToken', session.refreshToken, { ...refreshCookie, expires: session.refreshExpiresAt });
  success(res, { user: session.user, accessToken: session.accessToken });
}));
authRouter.post('/logout', asyncHandler(async (req, res) => {
  await service.revokeRefresh(req.cookies?.refreshToken as string | undefined);
  res.clearCookie('refreshToken', { ...refreshCookie, maxAge: undefined });
  res.clearCookie('guestClaimToken', { ...guestClaimCookie, maxAge: undefined });
  res.status(204).end();
}));
authRouter.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, email: true, username: true, displayName: true, role: true, isGuest: true } });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found.');
  success(res, user);
}));

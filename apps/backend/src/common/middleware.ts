import type { NextFunction, Request, Response } from 'express';
import { forbidden, unauthorized } from './errors.js';
import { verifyAccessToken } from '../modules/auth/token.service.js';
import { prisma } from '../infrastructure/database/prisma.js';

export type AuthUser = { id: string; email: string; role: 'USER' | 'ADMIN'; isGuest: boolean };
declare global {
  // Express Request needs this shared authentication field across module routers.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express { interface Request { user?: AuthUser } }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authorization = req.header('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  if (!token) { next(unauthorized()); return; }
  try {
    const claims = verifyAccessToken(token);
    void prisma.user.findUnique({ where: { id: claims.id }, select: { role: true, isGuest: true, disabledAt: true } }).then((account) => {
      if (!account || account.disabledAt) { next(unauthorized()); return; }
      req.user = { ...claims, role: account.role, isGuest: account.isGuest };
      next();
    }).catch(next);
  } catch (error) { next(error); }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (req.user?.role !== 'ADMIN') { next(forbidden()); return; }
  next();
}

import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { unauthorized } from '../../common/errors.js';
import type { AuthUser } from '../../common/middleware.js';

export function createAccessToken(user: AuthUser): string {
  const expiresIn = env.ACCESS_TOKEN_TTL as NonNullable<jwt.SignOptions['expiresIn']>;
  return jwt.sign({ email: user.email, role: user.role, isGuest: user.isGuest, type: 'access' }, env.JWT_ACCESS_SECRET, { subject: user.id, expiresIn });
}
export function verifyAccessToken(token: string): AuthUser {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (typeof decoded === 'string' || decoded.type !== 'access' || typeof decoded.sub !== 'string' || typeof decoded.email !== 'string' || (decoded.role !== 'USER' && decoded.role !== 'ADMIN')) throw unauthorized();
    return { id: decoded.sub, email: decoded.email, role: decoded.role, isGuest: decoded.isGuest === true };
  } catch { throw unauthorized(); }
}
export function createRefreshToken(): string { return randomBytes(48).toString('base64url'); }
export function hashRefreshToken(value: string): string { return createHash('sha256').update(value).digest('hex'); }

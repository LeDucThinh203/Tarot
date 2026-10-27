import { randomUUID } from 'node:crypto';
import { prisma } from '../../infrastructure/database/prisma.js';
import { Prisma } from '../../generated/prisma/client.js';
import { env } from '../../config/env.js';
import { AppError, unauthorized } from '../../common/errors.js';
import type { LoginInput, RegisterInput } from './auth.schema.js';
import { hashPassword, verifyPassword } from './password.service.js';
import { createAccessToken, createRefreshToken, hashRefreshToken } from './token.service.js';

type SessionUser = { id: string; email: string; username: string | null; displayName: string; role: 'USER' | 'ADMIN'; isGuest: boolean };
const publicUser = (user: SessionUser) => ({ id: user.id, email: user.email, username: user.username, displayName: user.displayName, role: user.role, isGuest: user.isGuest });

// Track failed login attempts per account identifier (email/username)
const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
type FailRecord = { count: number; firstAt: number };
const failedAttempts = new Map<string, FailRecord>();

function recordFailure(identifier: string): void {
  const now = Date.now();
  const rec = failedAttempts.get(identifier);
  if (!rec || now - rec.firstAt > LOCKOUT_WINDOW_MS) {
    failedAttempts.set(identifier, { count: 1, firstAt: now });
  } else {
    rec.count += 1;
  }
}

function isLockedOut(identifier: string): boolean {
  const rec = failedAttempts.get(identifier);
  if (!rec) return false;
  if (Date.now() - rec.firstAt > LOCKOUT_WINDOW_MS) { failedAttempts.delete(identifier); return false; }
  return rec.count >= MAX_FAILED_ATTEMPTS;
}

function clearFailures(identifier: string): void {
  failedAttempts.delete(identifier);
}

export async function register(input: RegisterInput, guestClaimToken?: string) {
  const exists = await prisma.user.findFirst({ where: { OR: [{ email: input.email }, { username: input.username }] }, select: { id: true } });
  if (exists) throw new AppError(409, 'ACCOUNT_IDENTIFIER_TAKEN', 'Email hoặc tên đăng nhập đã được sử dụng.');
  let user: SessionUser;
  try {
    const passwordHash = await hashPassword(input.password);
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { email: input.email, username: input.username, displayName: input.displayName, passwordHash } });
      await claimGuestReadings(tx, created.id, guestClaimToken);
      return created;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new AppError(409, 'ACCOUNT_IDENTIFIER_TAKEN', 'Email hoặc tên đăng nhập đã được sử dụng.');
    throw error;
  }
  return await createSession(user);
}

export async function login(input: LoginInput, guestClaimToken?: string) {
  const identifier = input.identifier.toLowerCase().trim();
  if (isLockedOut(identifier)) {
    throw new AppError(429, 'TOO_MANY_ATTEMPTS', 'Tài khoản tạm thời bị khóa do nhập sai mật khẩu quá nhiều lần. Vui lòng thử lại sau 15 phút.');
  }
  const user = identifier.includes('@')
    ? await prisma.user.findUnique({ where: { email: identifier } })
    : await prisma.user.findUnique({ where: { username: identifier } });
  if (user?.disabledAt) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email, tên đăng nhập hoặc mật khẩu chưa chính xác.');
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    recordFailure(identifier);
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email hoặc tên đăng nhập hay mật khẩu chưa chính xác.');
  }
  clearFailures(identifier);
  if (guestClaimToken) await prisma.$transaction((tx) => claimGuestReadings(tx, user.id, guestClaimToken));
  return await createSession(user);
}

export async function createGuest() {
  await prisma.user.deleteMany({ where: { isGuest: true, guestExpiresAt: { lt: new Date() } } });
  const claimToken = createRefreshToken();
  const user = await prisma.user.create({ data: {
    email: `guest-${randomUUID()}@guest.mystictarot.local`,
    displayName: 'Khách',
    passwordHash: await hashPassword(createRefreshToken()),
    isGuest: true,
    guestClaimTokenHash: hashRefreshToken(claimToken),
    guestExpiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86400000),
  } });
  return { session: await createSession(user), claimToken };
}

async function claimGuestReadings(tx: Prisma.TransactionClient, userId: string, rawClaimToken?: string): Promise<void> {
  if (!rawClaimToken) return;
  const guest = await tx.user.findUnique({ where: { guestClaimTokenHash: hashRefreshToken(rawClaimToken) }, select: { id: true, isGuest: true } });
  if (!guest?.isGuest) return;
  await tx.reading.updateMany({ where: { userId: guest.id }, data: { userId } });
  await tx.aiUsage.updateMany({ where: { userId: guest.id }, data: { userId } });
  await tx.user.delete({ where: { id: guest.id } });
}

async function createSession(user: SessionUser) {
  const rawRefresh = createRefreshToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86400000);
  await prisma.refreshSession.create({ data: { userId: user.id, tokenHash: hashRefreshToken(rawRefresh), expiresAt } });
  return { user: publicUser(user), accessToken: createAccessToken({ id: user.id, email: user.email, role: user.role, isGuest: user.isGuest }), refreshToken: rawRefresh, refreshExpiresAt: expiresAt };
}

export async function rotateRefresh(rawToken: string | undefined) {
  if (!rawToken) throw unauthorized();
  const session = await prisma.refreshSession.findUnique({ where: { tokenHash: hashRefreshToken(rawToken) }, include: { user: true } });
  if (session?.user.disabledAt) throw unauthorized();
  if (!session || session.revokedAt || session.expiresAt <= new Date()) throw unauthorized();
  const nextToken = createRefreshToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86400000);
  const rotated = await prisma.$transaction(async (tx) => {
    const revoked = await tx.refreshSession.updateMany({ where: { id: session.id, revokedAt: null, expiresAt: { gt: new Date() } }, data: { revokedAt: new Date() } });
    if (revoked.count !== 1) return false;
    await tx.refreshSession.create({ data: { userId: session.userId, tokenHash: hashRefreshToken(nextToken), expiresAt } });
    return true;
  });
  if (!rotated) throw unauthorized();
  return { user: publicUser(session.user), accessToken: createAccessToken({ id: session.user.id, email: session.user.email, role: session.user.role, isGuest: session.user.isGuest }), refreshToken: nextToken, refreshExpiresAt: expiresAt };
}

export async function revokeRefresh(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  await prisma.refreshSession.updateMany({ where: { tokenHash: hashRefreshToken(rawToken), revokedAt: null }, data: { revokedAt: new Date() } });
}

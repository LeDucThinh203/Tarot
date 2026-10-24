import { AppError } from '../../common/errors.js';
import { assertResourceOwner } from '../../common/ownership.js';
import { hashPassword, verifyPassword } from './password.service.js';
import { createAccessToken, createRefreshToken, hashRefreshToken, verifyAccessToken } from './token.service.js';

describe('authentication primitives', () => {
  it('hashes passwords with a one-way bcrypt hash', async () => {
    const hash = await hashPassword('a-long-test-password');
    expect(hash).not.toBe('a-long-test-password');
    expect(await verifyPassword('a-long-test-password', hash)).toBe(true);
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('validates short-lived access tokens and rejects bad tokens', () => {
    const user = { id: 'c10b60bd-04c5-4992-bc20-0cb80e7f73c1', email: 'reader@example.com', role: 'USER' as const, isGuest: false };
    expect(verifyAccessToken(createAccessToken(user))).toEqual(user);
    expect(() => verifyAccessToken('invalid.token.value')).toThrowError(AppError);
  });

  it('stores only a hash of a high-entropy refresh token', () => {
    const token = createRefreshToken();
    expect(token.length).toBeGreaterThan(50);
    expect(hashRefreshToken(token)).not.toBe(token);
    expect(hashRefreshToken(token)).toHaveLength(64);
  });

  it('blocks another account from a protected resource', () => {
    expect(() => assertResourceOwner('owner-id', 'owner-id')).not.toThrow();
    expect(() => assertResourceOwner('owner-id', 'other-id')).toThrowError(AppError);
  });
});

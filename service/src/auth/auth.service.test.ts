/**
 * Smoke tests for password + JWT helpers — pure unit, no DB.
 * Service-level tests that hit Prisma run as integration tests in tests/integration.
 */
import { hashPassword, verifyPassword } from '@/lib/password';
import { hashToken, signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '@/lib/jwt';

describe('password helpers', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('secret123');
    expect(hash).not.toBe('secret123');
    expect(await verifyPassword(hash, 'secret123')).toBe(true);
    expect(await verifyPassword(hash, 'wrong')).toBe(false);
  });
});

describe('jwt helpers', () => {
  it('signs and verifies an access token', () => {
    const token = signAccessToken({ sub: 'u1', role: 'ADMIN', companyId: 'c1', branchId: null });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('u1');
    expect(payload.role).toBe('ADMIN');
    expect(payload.companyId).toBe('c1');
    expect(payload.branchId).toBeNull();
    expect(payload.type).toBe('access');
  });

  it('signs and verifies a refresh token', () => {
    const token = signRefreshToken({ sub: 'u1', tokenId: 't1' });
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe('u1');
    expect(payload.tokenId).toBe('t1');
  });

  it('rejects access token used as refresh', () => {
    const access = signAccessToken({ sub: 'u1', role: 'ADMIN', companyId: null, branchId: null });
    expect(() => verifyRefreshToken(access)).toThrow();
  });

  it('produces deterministic token hashes', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe(hashToken('xyz'));
  });
});

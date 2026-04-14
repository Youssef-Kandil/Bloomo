import crypto from 'node:crypto';

import jwt, { type SignOptions } from 'jsonwebtoken';

import { env } from '@/config/env';
import type { Role } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  companyId: string | null;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
  type: 'refresh';
}

export function signAccessToken(payload: Omit<AccessTokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'access' } satisfies AccessTokenPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
  } as SignOptions);
}

export function signRefreshToken(payload: Omit<RefreshTokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'refresh' } satisfies RefreshTokenPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  if (decoded.type !== 'access') throw new Error('Wrong token type');
  return decoded;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  if (decoded.type !== 'refresh') throw new Error('Wrong token type');
  return decoded;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateTokenId(): string {
  return crypto.randomUUID();
}

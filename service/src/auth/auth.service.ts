import crypto from 'node:crypto';

import type { Role, User } from '@prisma/client';

import { env } from '@/config/env';
import { AppError } from '@/lib/http-error';
import {
  generateTokenId,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '@/lib/jwt';
import { sendMail } from '@/lib/mailer';
import { hashPassword, verifyPassword } from '@/lib/password';

import { authModel } from './auth.model';
import type { LoginInput, RegisterAdminInput, ResetPasswordInput } from './auth.dto';

const REFRESH_TTL_DAYS = 30;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h
const resetTokenStore = new Map<string, { userId: string; expiresAt: number }>();

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId: string | null;
  avatar: string | null;
  whatsappPhone: string | null;
  whatsappVerifiedAt: Date | null;
}

function toPublic(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
    avatar: user.avatar,
    whatsappPhone: user.whatsappPhone,
    whatsappVerifiedAt: user.whatsappVerifiedAt,
  };
}

async function issueTokens(user: User): Promise<AuthResult> {
  const tokenId = generateTokenId();
  const refreshToken = signRefreshToken({ sub: user.id, tokenId });
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await authModel.storeRefreshToken({ userId: user.id, tokenHash, expiresAt });
  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    companyId: user.companyId,
  });
  return { accessToken, refreshToken, user: toPublic(user) };
}

export const authService = {
  async login(input: LoginInput): Promise<AuthResult> {
    const user = await authModel.findUserByEmail(input.email);
    if (!user || !user.active) throw AppError.unauthorized('Invalid credentials');
    const ok = await verifyPassword(user.passwordHash, input.password);
    if (!ok) throw AppError.unauthorized('Invalid credentials');
    return issueTokens(user);
  },

  async registerAdmin(input: RegisterAdminInput): Promise<AuthResult> {
    const existing = await authModel.findUserByEmail(input.email);
    if (existing) throw AppError.conflict('Email already registered');
    const passwordHash = await hashPassword(input.password);
    const { user } = await authModel.createAdminWithCompany({
      email: input.email,
      passwordHash,
      name: input.name,
      companyName: input.companyName,
    });
    return issueTokens(user);
  },

  async refresh(rawRefreshToken: string): Promise<AuthResult> {
    let payload;
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw AppError.unauthorized('Invalid refresh token');
    }
    const tokenHash = hashToken(rawRefreshToken);
    const stored = await authModel.findRefreshToken(tokenHash);
    if (!stored || stored.revokedAt || stored.userId !== payload.sub) {
      throw AppError.unauthorized('Refresh token revoked');
    }
    if (stored.expiresAt.getTime() <= Date.now()) {
      throw AppError.unauthorized('Refresh token expired');
    }
    await authModel.revokeRefreshToken(stored.id);
    const user = await authModel.findUserById(payload.sub);
    if (!user || !user.active) throw AppError.unauthorized('User disabled');
    return issueTokens(user);
  },

  async logout(rawRefreshToken: string | null): Promise<void> {
    if (!rawRefreshToken) return;
    const tokenHash = hashToken(rawRefreshToken);
    const stored = await authModel.findRefreshToken(tokenHash);
    if (stored && !stored.revokedAt) await authModel.revokeRefreshToken(stored.id);
  },

  async forgotPassword(email: string): Promise<void> {
    const user = await authModel.findUserByEmail(email);
    // never disclose whether the email exists
    if (!user) return;
    const token = crypto.randomBytes(32).toString('hex');
    resetTokenStore.set(token, { userId: user.id, expiresAt: Date.now() + RESET_TOKEN_TTL_MS });
    const resetUrl = `${env.FRONTEND_ORIGIN}/reset-password?token=${token}`;
    await sendMail(
      user.email,
      'Reset your Bloomo password',
      `<p>Click the link below to reset your password. It expires in 1 hour.</p>
       <p><a href="${resetUrl}">${resetUrl}</a></p>`,
    );
  },

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const entry = resetTokenStore.get(input.token);
    if (!entry || entry.expiresAt < Date.now()) {
      throw AppError.badRequest('Invalid or expired token');
    }
    resetTokenStore.delete(input.token);
    const passwordHash = await hashPassword(input.newPassword);
    await authModel.updatePassword(entry.userId, passwordHash);
    await authModel.revokeAllUserTokens(entry.userId);
  },

  async me(userId: string): Promise<PublicUser> {
    const user = await authModel.findUserById(userId);
    if (!user) throw AppError.notFound('User not found');
    return toPublic(user);
  },
};

import type { CookieOptions, Request, Response } from 'express';

import { env } from '@/config/env';
import { AppError } from '@/lib/http-error';

import { authService } from './auth.service';
import type { LoginInput, RegisterAdminInput, ResetPasswordInput } from './auth.dto';

const REFRESH_COOKIE = 'bloomo_rt';

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/auth',
  domain: env.COOKIE_DOMAIN,
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions);
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions, maxAge: 0 });
}

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    const result = await authService.login(req.body as LoginInput);
    setRefreshCookie(res, result.refreshToken);
    res.json({ accessToken: result.accessToken, user: result.user });
  },

  async register(req: Request, res: Response): Promise<void> {
    const result = await authService.registerAdmin(req.body as RegisterAdminInput);
    setRefreshCookie(res, result.refreshToken);
    res.status(201).json({ accessToken: result.accessToken, user: result.user });
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const cookie = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!cookie) throw AppError.unauthorized('No refresh cookie');
    const result = await authService.refresh(cookie);
    setRefreshCookie(res, result.refreshToken);
    res.json({ accessToken: result.accessToken, user: result.user });
  },

  async logout(req: Request, res: Response): Promise<void> {
    const cookie = (req.cookies?.[REFRESH_COOKIE] as string | undefined) ?? null;
    await authService.logout(cookie);
    clearRefreshCookie(res);
    res.status(204).end();
  },

  async forgotPassword(req: Request, res: Response): Promise<void> {
    await authService.forgotPassword((req.body as { email: string }).email);
    res.json({ ok: true });
  },

  async resetPassword(req: Request, res: Response): Promise<void> {
    await authService.resetPassword(req.body as ResetPasswordInput);
    res.json({ ok: true });
  },

  async me(req: Request, res: Response): Promise<void> {
    if (!req.user) throw AppError.unauthorized();
    const user = await authService.me(req.user.id);
    res.json({ user });
  },
};

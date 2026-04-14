import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { asyncHandler } from '@/utils/asyncHandler';
import { validate } from '@/utils/validate';

import { authController } from './auth.controller';
import {
  forgotPasswordDto,
  loginDto,
  registerAdminDto,
  resetPasswordDto,
} from './auth.dto';
import { requireAuth } from './auth.middleware';

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const forgotLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5 });

export const authRouter = Router();

authRouter.post(
  '/login',
  loginLimiter,
  validate(loginDto),
  asyncHandler(authController.login),
);

authRouter.post(
  '/register',
  validate(registerAdminDto),
  asyncHandler(authController.register),
);

authRouter.post('/refresh', asyncHandler(authController.refresh));
authRouter.post('/logout', asyncHandler(authController.logout));

authRouter.post(
  '/forgot-password',
  forgotLimiter,
  validate(forgotPasswordDto),
  asyncHandler(authController.forgotPassword),
);

authRouter.post(
  '/reset-password',
  validate(resetPasswordDto),
  asyncHandler(authController.resetPassword),
);

authRouter.get('/me', requireAuth, asyncHandler(authController.me));

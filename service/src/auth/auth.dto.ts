import { z } from 'zod';

const emailSchema = z.string().trim().email().toLowerCase();
const passwordSchema = z
  .string()
  .min(8, 'password must be at least 8 characters')
  .max(128);

export const loginDto = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const registerAdminDto = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(2).max(100),
  companyName: z.string().trim().min(2).max(120),
});

export const forgotPasswordDto = z.object({ email: emailSchema });

export const resetPasswordDto = z.object({
  token: z.string().min(10),
  newPassword: passwordSchema,
});

export const changePasswordDto = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export type LoginInput = z.infer<typeof loginDto>;
export type RegisterAdminInput = z.infer<typeof registerAdminDto>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordDto>;
export type ResetPasswordInput = z.infer<typeof resetPasswordDto>;

import { z } from 'zod';

export const createEmployeeDto = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8),
  name: z.string().trim().min(2).max(100),
  branchId: z.string().cuid().optional(),
  whatsappPhone: z.string().trim().min(5).max(20).optional(),
});

export const createManagerDto = createEmployeeDto.omit({ branchId: true });

export const createClientAccountDto = z.object({
  clientId: z.string().cuid(),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8),
});

export const updateUserDto = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  active: z.boolean().optional(),
  avatar: z.string().url().optional(),
  branchId: z.string().cuid().nullable().optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeDto>;
export type CreateManagerInput = z.infer<typeof createManagerDto>;
export type CreateClientAccountInput = z.infer<typeof createClientAccountDto>;
export type UpdateUserInput = z.infer<typeof updateUserDto>;

import { z } from 'zod';

const timeHHmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/u, 'Time must be HH:mm');

const offDaysArray = z
  .array(z.number().int().min(0).max(6))
  .max(7)
  .refine((arr) => new Set(arr).size === arr.length, 'Duplicate weekdays');

export const createEmployeeDto = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8),
  name: z.string().trim().min(2).max(100),
  branchId: z.string().min(1).optional(),
  whatsappPhone: z.string().trim().min(5).max(20).optional(),
  checkInTime: timeHHmm.optional(),
  checkOutTime: timeHHmm.optional(),
  offDays: offDaysArray.optional(),
  monthlySalary: z.number().min(0).optional(),
  overtimeRateOverride: z.number().min(0).nullable().optional(),
  offDayHourRateOverride: z.number().min(0).nullable().optional(),
});

export const createManagerDto = createEmployeeDto;

export const createClientAccountDto = z.object({
  clientId: z.string().min(1),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8),
});

export const updateUserDto = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  active: z.boolean().optional(),
  avatar: z.string().url().optional(),
  branchId: z.string().min(1).nullable().optional(),
  whatsappPhone: z.string().trim().min(5).max(20).nullable().optional(),
  password: z.string().min(8).optional(),
  checkInTime: timeHHmm.nullable().optional(),
  checkOutTime: timeHHmm.nullable().optional(),
  offDays: offDaysArray.optional(),
  monthlySalary: z.number().min(0).optional(),
  overtimeRateOverride: z.number().min(0).nullable().optional(),
  offDayHourRateOverride: z.number().min(0).nullable().optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeDto>;
export type CreateManagerInput = z.infer<typeof createManagerDto>;
export type CreateClientAccountInput = z.infer<typeof createClientAccountDto>;
export type UpdateUserInput = z.infer<typeof updateUserDto>;

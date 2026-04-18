import { z } from 'zod';

export const payrollQueryDto = z.object({
  employeeId: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(3000),
  month: z.coerce.number().int().min(1).max(12),
});

export const payrollSummaryQueryDto = z.object({
  year: z.coerce.number().int().min(2000).max(3000),
  month: z.coerce.number().int().min(1).max(12),
});

export type PayrollQuery = z.infer<typeof payrollQueryDto>;
export type PayrollSummaryQuery = z.infer<typeof payrollSummaryQueryDto>;

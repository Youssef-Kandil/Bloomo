import { z } from 'zod';

export const planEnum = z.enum(['BASIC', 'PRO', 'ENTERPRISE']);
export const billingCycleEnum = z.enum(['MONTHLY', 'YEARLY']);

export const contactSalesDto = z.object({
  plan: planEnum,
  billingCycle: billingCycleEnum,
  contactName: z.string().trim().min(1).max(120),
  contactEmail: z.string().email(),
  contactPhone: z.string().trim().max(40).optional(),
  note: z.string().trim().max(2000).optional(),
  // Optional custom-limits ask — applied on OWNER approval if present.
  customClientsLimit: z.coerce.number().int().min(1).max(100_000).optional(),
  customEmployeesLimit: z.coerce.number().int().min(1).max(10_000).optional(),
  customBranchesLimit: z.coerce.number().int().min(1).max(1_000).optional(),
});

export type ContactSalesInput = z.infer<typeof contactSalesDto>;

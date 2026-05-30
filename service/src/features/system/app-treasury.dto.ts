import { z } from 'zod';

const planEnum = z.enum(['TRIAL', 'BASIC', 'PRO', 'ENTERPRISE']);
const billingCycleEnum = z.enum(['MONTHLY', 'YEARLY']);
const kindEnum = z.enum(['INCOME', 'EXPENSE']);
const categoryEnum = z.enum([
  'INFRASTRUCTURE',
  'SALARIES',
  'MARKETING',
  'TOOLS',
  'TAXES',
  'REFUND',
  'OTHER',
]);

const dateRange = {
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
};

export const listAppTreasuryDto = z.object({
  ...dateRange,
  kind: kindEnum.optional(),
  plan: planEnum.optional(),
  category: categoryEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const summaryAppTreasuryDto = z.object({
  ...dateRange,
  plan: planEnum.optional(),
});

export const createAppTreasuryEntryDto = z
  .object({
    kind: kindEnum,
    amount: z.coerce.number().positive(),
    reason: z.string().trim().min(1).max(500),
    category: categoryEnum.optional(),
    plan: planEnum.optional(),
    billingCycle: billingCycleEnum.optional(),
    companyId: z.string().min(1).optional(),
  })
  .refine((v) => v.kind === 'INCOME' || v.category !== undefined, {
    message: 'category is required for EXPENSE entries',
    path: ['category'],
  });

export type ListAppTreasuryQuery = z.infer<typeof listAppTreasuryDto>;
export type SummaryAppTreasuryQuery = z.infer<typeof summaryAppTreasuryDto>;
export type CreateAppTreasuryEntryInput = z.infer<typeof createAppTreasuryEntryDto>;

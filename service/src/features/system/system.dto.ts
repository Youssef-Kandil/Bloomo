import { z } from 'zod';

const planEnum = z.enum(['TRIAL', 'BASIC', 'PRO', 'ENTERPRISE']);
const billingCycleEnum = z.enum(['MONTHLY', 'YEARLY']);

export const activatePlanDto = z.object({
  plan: z.enum(['BASIC', 'PRO', 'ENTERPRISE']),
  billingCycle: billingCycleEnum,
  durationDays: z.coerce.number().int().min(1).max(3650).optional(),
});

export const extendSubscriptionDto = z.object({
  days: z.coerce.number().int().min(1).max(3650),
});

export const setLimitsDto = z.object({
  customClientsLimit: z.coerce.number().int().min(0).nullable(),
  customEmployeesLimit: z.coerce.number().int().min(0).nullable(),
  customBranchesLimit: z.coerce.number().int().min(0).nullable(),
});

export const banUserDto = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const resetPasswordDto = z.object({
  newPassword: z.string().min(8).max(128),
});

export const updatePlanDto = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  tagline: z.string().trim().max(200).nullable().optional(),
  monthlyPrice: z.coerce.number().min(0).optional(),
  yearlyPrice: z.coerce.number().min(0).optional(),
  currency: z.string().trim().length(3).optional(),
  clientsLimit: z.coerce.number().int().min(0).optional(),
  employeesLimit: z.coerce.number().int().min(0).optional(),
  branchesLimit: z.coerce.number().int().min(0).optional(),
  active: z.boolean().optional(),
  highlight: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const offerCreateDto = z.object({
  code: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  discountPercent: z.coerce.number().int().min(1).max(100),
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date(),
  active: z.boolean().optional(),
  appliesTo: z.array(planEnum).default([]),
});

export const offerUpdateDto = offerCreateDto.partial();

export const subscriptionRequestUpdateDto = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
});

export type ActivatePlanInput = z.infer<typeof activatePlanDto>;
export type ExtendSubscriptionInput = z.infer<typeof extendSubscriptionDto>;
export type SetLimitsInput = z.infer<typeof setLimitsDto>;
export type BanUserInput = z.infer<typeof banUserDto>;
export type ResetPasswordInput = z.infer<typeof resetPasswordDto>;
export type UpdatePlanInput = z.infer<typeof updatePlanDto>;
export type OfferCreateInput = z.infer<typeof offerCreateDto>;
export type OfferUpdateInput = z.infer<typeof offerUpdateDto>;
export type SubscriptionRequestUpdateInput = z.infer<typeof subscriptionRequestUpdateDto>;

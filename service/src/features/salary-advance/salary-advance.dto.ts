import { z } from 'zod';

export const submitAdvanceDto = z.object({
  amount: z.number().positive(),
  appliedYear: z.number().int().min(2000).max(3000),
  appliedMonth: z.number().int().min(1).max(12),
  reason: z.string().trim().max(2000).optional(),
});

export const decideAdvanceDto = z.object({
  approve: z.boolean(),
  rejectReason: z.string().trim().max(500).optional(),
});

export type SubmitAdvanceInput = z.infer<typeof submitAdvanceDto>;
export type DecideAdvanceInput = z.infer<typeof decideAdvanceDto>;

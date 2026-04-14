import { z } from 'zod';

export const createTreasuryEntryDto = z.object({
  kind: z.enum(['INCOME', 'EXPENSE']),
  amount: z.number().positive(),
  reason: z.string().trim().min(1).max(255),
  requestId: z.string().cuid().optional(),
});

export type CreateTreasuryEntryInput = z.infer<typeof createTreasuryEntryDto>;

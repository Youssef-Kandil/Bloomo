import { z } from 'zod';

export const createTreasuryEntryDto = z.object({
  kind: z.enum(['INCOME', 'EXPENSE']),
  amount: z.number().positive(),
  reason: z.string().trim().min(1).max(255),
  requestId: z.string().min(1).optional(),
});

export const treasuryListQueryDto = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
});

export type CreateTreasuryEntryInput = z.infer<typeof createTreasuryEntryDto>;
export type TreasuryListQuery = z.infer<typeof treasuryListQueryDto>;

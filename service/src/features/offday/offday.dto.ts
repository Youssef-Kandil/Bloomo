import { z } from 'zod';

export const submitOffDayRequestDto = z.object({
  date: z.coerce.date(),
  reason: z.string().trim().max(2000).optional(),
});

export const decideOffDayRequestDto = z.object({
  approve: z.boolean(),
  rejectReason: z.string().trim().max(500).optional(),
});

export type SubmitOffDayInput = z.infer<typeof submitOffDayRequestDto>;
export type DecideOffDayInput = z.infer<typeof decideOffDayRequestDto>;

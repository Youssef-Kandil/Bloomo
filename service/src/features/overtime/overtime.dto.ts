import { z } from 'zod';

export const submitOvertimeDto = z
  .object({
    date: z.coerce.date(),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    reason: z.string().trim().max(2000).optional(),
  })
  .refine((d) => d.endAt > d.startAt, {
    message: 'endAt must be after startAt',
    path: ['endAt'],
  });

export const decideOvertimeDto = z.object({
  approve: z.boolean(),
  rejectReason: z.string().trim().max(500).optional(),
});

export type SubmitOvertimeInput = z.infer<typeof submitOvertimeDto>;
export type DecideOvertimeInput = z.infer<typeof decideOvertimeDto>;

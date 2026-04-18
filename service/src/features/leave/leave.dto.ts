import { z } from 'zod';

export const submitLeaveDto = z
  .object({
    fromDate: z.coerce.date(),
    toDate: z.coerce.date(),
    reason: z.string().trim().max(2000).optional(),
  })
  .refine((d) => d.toDate >= d.fromDate, {
    message: 'toDate must be on or after fromDate',
    path: ['toDate'],
  });

export const decideLeaveDto = z.object({
  approve: z.boolean(),
  rejectReason: z.string().trim().max(500).optional(),
});

export type SubmitLeaveInput = z.infer<typeof submitLeaveDto>;
export type DecideLeaveInput = z.infer<typeof decideLeaveDto>;

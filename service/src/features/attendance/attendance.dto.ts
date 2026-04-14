import { z } from 'zod';

export const submitAttendanceDto = z.object({
  type: z.enum(['CHECK_IN', 'CHECK_OUT']),
});

export const decideAttendanceDto = z.object({
  approve: z.boolean(),
  reason: z.string().trim().max(500).optional(),
});

export type SubmitAttendanceInput = z.infer<typeof submitAttendanceDto>;
export type DecideAttendanceInput = z.infer<typeof decideAttendanceDto>;

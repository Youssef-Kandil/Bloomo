import { z } from 'zod';

export const createRatingDto = z.object({
  requestId: z.string().cuid(),
  stars: z.number().int().min(1).max(5),
  note: z.string().trim().max(2000).optional(),
});

export const staffRecordRatingDto = createRatingDto;

export type CreateRatingInput = z.infer<typeof createRatingDto>;

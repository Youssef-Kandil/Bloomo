import { z } from 'zod';

export const requestTypeSchema = z.enum([
  'MAINTENANCE',
  'INSPECTION',
  'REPAIR',
  'SUPPLY',
  'INSTALL',
  'SUPPLY_INSTALL',
]);

export const createRequestDto = z.object({
  clientId: z.string().cuid(),
  type: requestTypeSchema,
  note: z.string().trim().max(2000).optional(),
});

export const clientSelfRequestDto = z.object({
  type: requestTypeSchema,
  note: z.string().trim().max(2000).optional(),
});

export const assignRequestDto = z.object({
  employeeId: z.string().cuid(),
  plannedStart: z.coerce.date(),
  plannedEnd: z.coerce.date(),
});

export const listRequestsDto = z.object({
  status: z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  clientId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateRequestInput = z.infer<typeof createRequestDto>;
export type AssignRequestInput = z.infer<typeof assignRequestDto>;
export type ListRequestsQuery = z.infer<typeof listRequestsDto>;

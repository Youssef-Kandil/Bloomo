import { z } from 'zod';

export const requestTypeSchema = z.enum([
  'MAINTENANCE',
  'INSPECTION',
  'REPAIR',
  'SUPPLY',
  'INSTALL',
  'SUPPLY_INSTALL',
]);

// `clientId` is optional at the DTO level because CLIENT-role accounts
// derive the client server-side from `accountUserId`. Staff (ADMIN/MANAGER)
// callers MUST supply it — that is enforced in the service layer.
//
// `voiceNoteUrl` must be a relative `/uploads/voice-notes/...` URL produced
// by the dedicated upload endpoint — we validate the prefix to prevent
// arbitrary URL injection.
export const createRequestDto = z.object({
  clientId: z.string().min(1).optional(),
  type: requestTypeSchema,
  note: z.string().trim().max(2000).optional(),
  voiceNoteUrl: z
    .string()
    .regex(/^\/uploads\/voice-notes\/[A-Za-z0-9_-]+\.[a-z0-9]+$/u, 'Invalid voice note URL')
    .optional(),
  voiceDurationMs: z.coerce.number().int().min(100).max(70_000).optional(),
});

export const assignRequestDto = z.object({
  employeeIds: z.array(z.string().min(1)).min(1),
  plannedStart: z.coerce.date().optional(),
  plannedEnd: z.coerce.date().optional(),
});

export const listRequestsDto = z.object({
  status: z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  clientId: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateRequestInput = z.infer<typeof createRequestDto>;
export type AssignRequestInput = z.infer<typeof assignRequestDto>;
export type ListRequestsQuery = z.infer<typeof listRequestsDto>;

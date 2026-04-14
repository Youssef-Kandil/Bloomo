import { z } from 'zod';

export const upsertPermissionDto = z.object({
  managerId: z.string().cuid(),
  screenKey: z.string().trim().min(1).max(64),
  canView: z.boolean().default(false),
  canEdit: z.boolean().default(false),
});

export const bulkUpsertDto = z.object({
  managerId: z.string().cuid(),
  screens: z.array(
    z.object({
      screenKey: z.string().trim().min(1).max(64),
      canView: z.boolean(),
      canEdit: z.boolean(),
    }),
  ),
});

export type UpsertPermissionInput = z.infer<typeof upsertPermissionDto>;
export type BulkUpsertInput = z.infer<typeof bulkUpsertDto>;

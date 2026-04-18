import { z } from 'zod';

const permissionFlags = {
  canView: z.boolean().default(false),
  canCreate: z.boolean().default(false),
  canEdit: z.boolean().default(false),
  canDelete: z.boolean().default(false),
  canAssign: z.boolean().default(false),
};

export const upsertPermissionDto = z.object({
  managerId: z.string().min(1),
  screenKey: z.string().trim().min(1).max(64),
  ...permissionFlags,
});

export const bulkUpsertDto = z.object({
  managerId: z.string().min(1),
  screens: z.array(
    z.object({
      screenKey: z.string().trim().min(1).max(64),
      canView: z.boolean(),
      canCreate: z.boolean(),
      canEdit: z.boolean(),
      canDelete: z.boolean(),
      canAssign: z.boolean(),
    }),
  ),
});

export type UpsertPermissionInput = z.infer<typeof upsertPermissionDto>;
export type BulkUpsertInput = z.infer<typeof bulkUpsertDto>;

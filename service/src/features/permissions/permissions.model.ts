import { prisma } from '@/config/prisma';

export interface PermissionFlags {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAssign: boolean;
}

export const permissionsModel = {
  listForManager(managerId: string) {
    return prisma.permission.findMany({ where: { managerId }, orderBy: { screenKey: 'asc' } });
  },
  upsert(managerId: string, screenKey: string, flags: PermissionFlags) {
    return prisma.permission.upsert({
      where: { managerId_screenKey: { managerId, screenKey } },
      update: flags,
      create: { managerId, screenKey, ...flags },
    });
  },
  bulkUpsert(managerId: string, rows: Array<{ screenKey: string } & PermissionFlags>) {
    return prisma.$transaction(
      rows.map((r) =>
        prisma.permission.upsert({
          where: { managerId_screenKey: { managerId, screenKey: r.screenKey } },
          update: {
            canView: r.canView,
            canCreate: r.canCreate,
            canEdit: r.canEdit,
            canDelete: r.canDelete,
            canAssign: r.canAssign,
          },
          create: { managerId, ...r },
        }),
      ),
    );
  },
};

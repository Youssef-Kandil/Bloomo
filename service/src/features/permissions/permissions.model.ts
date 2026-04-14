import { prisma } from '@/config/prisma';

export const permissionsModel = {
  listForManager(managerId: string) {
    return prisma.permission.findMany({ where: { managerId }, orderBy: { screenKey: 'asc' } });
  },
  upsert(managerId: string, screenKey: string, canView: boolean, canEdit: boolean) {
    return prisma.permission.upsert({
      where: { managerId_screenKey: { managerId, screenKey } },
      update: { canView, canEdit },
      create: { managerId, screenKey, canView, canEdit },
    });
  },
  bulkUpsert(managerId: string, rows: Array<{ screenKey: string; canView: boolean; canEdit: boolean }>) {
    return prisma.$transaction(
      rows.map((r) =>
        prisma.permission.upsert({
          where: { managerId_screenKey: { managerId, screenKey: r.screenKey } },
          update: { canView: r.canView, canEdit: r.canEdit },
          create: { managerId, ...r },
        }),
      ),
    );
  },
};

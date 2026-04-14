import type { AttendanceType, Prisma } from '@prisma/client';

import { prisma } from '@/config/prisma';

export const attendanceModel = {
  create(employeeId: string, type: AttendanceType) {
    return prisma.attendance.create({
      data: { employeeId, type, requestedAt: new Date() },
    });
  },
  list(companyId: string, where: Prisma.AttendanceWhereInput = {}) {
    return prisma.attendance.findMany({
      where: { employee: { user: { companyId } }, ...where },
      include: { employee: { include: { user: { select: { name: true } } } } },
      orderBy: { requestedAt: 'desc' },
      take: 200,
    });
  },
  listMine(employeeId: string) {
    return prisma.attendance.findMany({
      where: { employeeId },
      orderBy: { requestedAt: 'desc' },
      take: 100,
    });
  },
  findById(id: string) {
    return prisma.attendance.findUnique({ where: { id } });
  },
  decide(id: string, approved: boolean, decidedByUserId: string, reason?: string) {
    return prisma.attendance.update({
      where: { id },
      data: {
        status: approved ? 'APPROVED' : 'REJECTED',
        decidedByUserId,
        decidedAt: new Date(),
        rejectReason: approved ? null : reason ?? null,
      },
    });
  },
};

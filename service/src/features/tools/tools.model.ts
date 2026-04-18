import type { Prisma } from '@prisma/client';

import { prisma } from '@/config/prisma';

export const toolsModel = {
  list(companyId: string) {
    return prisma.tool.findMany({ where: { companyId }, orderBy: { name: 'asc' } });
  },
  create(data: Prisma.ToolUncheckedCreateInput) {
    return prisma.tool.create({ data });
  },
  update(id: string, data: Prisma.ToolUpdateInput) {
    return prisma.tool.update({ where: { id }, data });
  },
  delete(id: string) {
    return prisma.tool.delete({ where: { id } });
  },
  listCustody(employeeId: string) {
    return prisma.toolAssignment.findMany({
      where: { employeeId, returnedAt: null },
      include: { tool: true },
      orderBy: { assignedAt: 'desc' },
    });
  },
  listActiveCustody(companyId: string) {
    return prisma.toolAssignment.findMany({
      where: { returnedAt: null, tool: { companyId } },
      include: {
        tool: { select: { id: true, name: true, code: true } },
        employee: { select: { id: true, user: { select: { name: true, email: true } } } },
      },
      orderBy: { assignedAt: 'desc' },
    });
  },
  assignCustody(data: Prisma.ToolAssignmentUncheckedCreateInput) {
    return prisma.toolAssignment.create({ data });
  },
  returnCustody(id: string) {
    return prisma.toolAssignment.update({
      where: { id },
      data: { returnedAt: new Date() },
    });
  },
};

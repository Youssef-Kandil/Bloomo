import type { Prisma } from '@prisma/client';

import { prisma } from '@/config/prisma';

export const requestsModel = {
  list(
    companyId: string,
    filters: Prisma.RequestWhereInput,
    skip: number,
    take: number,
    branchScope?: string | null,
  ) {
    const where: Prisma.RequestWhereInput = { companyId, ...filters };
    // Branch-scoped listing: a manager sees PENDING/unassigned requests
    // (any branch can claim them) plus any request that already has an
    // assignment to one of their branch's employees.
    if (branchScope) {
      where.OR = [
        { status: 'PENDING' },
        { assignments: { some: { employee: { branchId: branchScope } } } },
      ];
    }
    return prisma.$transaction([
      prisma.request.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, lat: true, lng: true } },
          assignments: { include: { employee: { select: { id: true, user: { select: { name: true } } } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.request.count({ where }),
    ]);
  },

  findById(companyId: string, id: string) {
    return prisma.request.findFirst({
      where: { id, companyId },
      include: {
        client: true,
        assignments: true,
        history: { orderBy: { createdAt: 'desc' } },
        custody: { include: { inventoryItem: true } },
        ratings: true,
      },
    });
  },

  create(data: Prisma.RequestCreateInput) {
    return prisma.request.create({
      data,
      include: { client: true },
    });
  },

  update(id: string, data: Prisma.RequestUpdateInput) {
    return prisma.request.update({ where: { id }, data });
  },

  appendHistory(requestId: string, event: string, meta?: unknown) {
    return prisma.requestHistory.create({
      data: {
        requestId,
        event,
        meta: (meta ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  },

  createAssignment(data: Prisma.AssignmentUncheckedCreateInput) {
    return prisma.assignment.create({ data });
  },

  remove(id: string) {
    return prisma.request.delete({ where: { id } });
  },
};

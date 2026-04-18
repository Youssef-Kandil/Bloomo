import type { Prisma } from '@prisma/client';

import { prisma } from '@/config/prisma';

export const supplyModel = {
  list(where: Prisma.SupplyOperationWhereInput) {
    return prisma.supplyOperation.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true } },
        items: { include: { inventoryItem: { select: { id: true, name: true, sku: true } } } },
        tasks: { select: { id: true, type: true, status: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
  findById(id: string) {
    return prisma.supplyOperation.findUnique({
      where: { id },
      include: {
        items: true,
        tasks: true,
      },
    });
  },
};

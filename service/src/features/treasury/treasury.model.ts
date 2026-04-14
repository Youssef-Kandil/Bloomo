import type { Prisma } from '@prisma/client';

import { prisma } from '@/config/prisma';

export const treasuryModel = {
  list(companyId: string, skip: number, take: number) {
    return prisma.$transaction([
      prisma.treasuryEntry.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { id: true, name: true } } },
        skip,
        take,
      }),
      prisma.treasuryEntry.count({ where: { companyId } }),
    ]);
  },
  create(data: Prisma.TreasuryEntryUncheckedCreateInput) {
    return prisma.treasuryEntry.create({ data });
  },
  totals(companyId: string) {
    return prisma.treasuryEntry.groupBy({
      by: ['kind'],
      where: { companyId },
      _sum: { amount: true },
    });
  },
};

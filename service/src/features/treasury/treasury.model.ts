import type { Prisma } from '@prisma/client';

import { prisma } from '@/config/prisma';

interface DateRange {
  from?: Date;
  to?: Date;
}

function rangeWhere(companyId: string, range: DateRange): Prisma.TreasuryEntryWhereInput {
  const where: Prisma.TreasuryEntryWhereInput = { companyId };
  if (range.from || range.to) {
    where.createdAt = {
      ...(range.from ? { gte: range.from } : {}),
      ...(range.to ? { lte: range.to } : {}),
    };
  }
  return where;
}

export const treasuryModel = {
  list(companyId: string, range: DateRange, skip: number, take: number) {
    const where = rangeWhere(companyId, range);
    return prisma.$transaction([
      prisma.treasuryEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { id: true, name: true } } },
        skip,
        take,
      }),
      prisma.treasuryEntry.count({ where }),
    ]);
  },
  create(data: Prisma.TreasuryEntryUncheckedCreateInput) {
    return prisma.treasuryEntry.create({ data });
  },
  totals(companyId: string, range: DateRange) {
    return prisma.treasuryEntry.groupBy({
      by: ['kind'],
      where: rangeWhere(companyId, range),
      _sum: { amount: true },
    });
  },
};

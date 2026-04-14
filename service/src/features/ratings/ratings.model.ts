import type { Prisma } from '@prisma/client';

import { prisma } from '@/config/prisma';

export const ratingsModel = {
  create(data: Prisma.RatingUncheckedCreateInput) {
    return prisma.rating.create({ data });
  },
  listForRequest(requestId: string) {
    return prisma.rating.findMany({ where: { requestId }, orderBy: { createdAt: 'desc' } });
  },
  listForClient(clientId: string) {
    return prisma.rating.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: { request: { select: { id: true, type: true } } },
    });
  },
};

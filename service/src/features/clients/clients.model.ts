import type { Prisma } from '@prisma/client';

import { prisma } from '@/config/prisma';

export const clientsModel = {
  list(companyId: string, q: string | undefined, skip: number, take: number) {
    const where: Prisma.ClientWhereInput = {
      companyId,
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { address: { contains: q } },
              { phones: { some: { phone: { contains: q } } } },
            ],
          }
        : {}),
    };
    return prisma.$transaction([
      prisma.client.findMany({
        where,
        include: { phones: true, accountUser: { select: { id: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.client.count({ where }),
    ]);
  },

  findById(companyId: string, id: string) {
    return prisma.client.findFirst({
      where: { id, companyId },
      include: { phones: true, accountUser: { select: { id: true, email: true } } },
    });
  },

  create(companyId: string, data: Prisma.ClientCreateInput) {
    return prisma.client.create({ data, include: { phones: true } });
  },

  update(companyId: string, id: string, data: Prisma.ClientUpdateInput) {
    return prisma.client.update({
      where: { id },
      data,
      include: { phones: true, accountUser: { select: { id: true, email: true } } },
    });
  },

  replacePhones(clientId: string, phones: Prisma.ClientPhoneCreateManyInput[]) {
    return prisma.$transaction([
      prisma.clientPhone.deleteMany({ where: { clientId } }),
      prisma.clientPhone.createMany({ data: phones }),
    ]);
  },

  delete(id: string) {
    return prisma.client.delete({ where: { id } });
  },
};

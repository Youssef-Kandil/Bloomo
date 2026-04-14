import type { Prisma, WaHealthState, WaMessageStatus, WaSessionStatus, WaTemplate } from '@prisma/client';

import { prisma } from '@/config/prisma';

export const whatsappModel = {
  upsertSession(companyId: string, data: Prisma.WhatsappSessionUpdateInput) {
    const create = { ...(data as unknown as Prisma.WhatsappSessionUncheckedCreateInput), companyId };
    return prisma.whatsappSession.upsert({
      where: { companyId },
      update: data,
      create,
    });
  },

  setStatus(companyId: string, status: WaSessionStatus, extra: Prisma.WhatsappSessionUpdateInput = {}) {
    const create = { ...(extra as unknown as Prisma.WhatsappSessionUncheckedCreateInput), companyId, status };
    return prisma.whatsappSession.upsert({
      where: { companyId },
      update: { status, ...extra },
      create,
    });
  },

  setHealth(companyId: string, healthState: WaHealthState, throttledUntil?: Date | null) {
    return prisma.whatsappSession.update({
      where: { companyId },
      data: { healthState, throttledUntil: throttledUntil ?? null },
    });
  },

  getSession(companyId: string) {
    return prisma.whatsappSession.findUnique({ where: { companyId } });
  },

  countDaily(companyId: string, windowStart: Date) {
    return prisma.whatsappMessage.count({
      where: { companyId, status: { in: ['SENT', 'DELIVERED', 'READ'] }, sentAt: { gte: windowStart } },
    });
  },

  enqueueMessage(data: Prisma.WhatsappMessageUncheckedCreateInput) {
    return prisma.whatsappMessage.create({ data });
  },

  updateMessage(id: string, data: Prisma.WhatsappMessageUpdateInput) {
    return prisma.whatsappMessage.update({ where: { id }, data });
  },

  pickNextQueued(companyId: string) {
    return prisma.whatsappMessage.findFirst({
      where: { companyId, status: 'QUEUED' },
      orderBy: [{ template: 'asc' }, { createdAt: 'asc' }],
    });
  },

  listMessages(companyId: string, filters: Prisma.WhatsappMessageWhereInput, skip: number, take: number) {
    return prisma.$transaction([
      prisma.whatsappMessage.findMany({
        where: { companyId, ...filters },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.whatsappMessage.count({ where: { companyId, ...filters } }),
    ]);
  },

  updateStatus(id: string, status: WaMessageStatus, error?: string) {
    return prisma.whatsappMessage.update({
      where: { id },
      data: { status, error: error ?? null, sentAt: status === 'SENT' ? new Date() : undefined },
    });
  },

  recentFailCount(companyId: string, windowMs: number) {
    return prisma.whatsappMessage.count({
      where: {
        companyId,
        status: 'FAILED',
        createdAt: { gte: new Date(Date.now() - windowMs) },
      },
    });
  },

  templateIs(_template: WaTemplate) {
    return true;
  },
};

import type { Prisma } from '@prisma/client';

import { prisma } from '@/config/prisma';

export const inventoryModel = {
  list(companyId: string) {
    return prisma.inventoryItem.findMany({ where: { companyId }, orderBy: { name: 'asc' } });
  },
  create(data: Prisma.InventoryItemUncheckedCreateInput) {
    return prisma.inventoryItem.create({ data });
  },
  update(id: string, data: Prisma.InventoryItemUpdateInput) {
    return prisma.inventoryItem.update({ where: { id }, data });
  },
  delete(id: string) {
    return prisma.inventoryItem.delete({ where: { id } });
  },
  custodyForRequest(requestId: string) {
    return prisma.requestCustody.findMany({
      where: { requestId },
      include: { inventoryItem: true },
    });
  },
  assignRequestCustody(
    requestId: string,
    rows: Array<{ inventoryItemId: string; qty: number; unitPrice: number }>,
  ) {
    const data = rows.map((r) => ({
      requestId,
      inventoryItemId: r.inventoryItemId,
      qty: r.qty,
      unitPrice: r.unitPrice,
      total: r.qty * r.unitPrice,
    }));
    return prisma.requestCustody.createMany({ data });
  },
};

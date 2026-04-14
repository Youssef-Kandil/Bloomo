import { prisma } from '@/config/prisma';
import { whatsappQueue } from '@/features/whatsapp/whatsapp.queue';
import { AppError } from '@/lib/http-error';

import { inventoryModel } from './inventory.model';
import type { CreateItemInput, RequestCustodyInput, UpdateItemInput } from './inventory.dto';

export const inventoryService = {
  list(companyId: string) {
    return inventoryModel.list(companyId);
  },
  create(companyId: string, input: CreateItemInput) {
    return inventoryModel.create({ companyId, ...input });
  },
  update(id: string, input: UpdateItemInput) {
    return inventoryModel.update(id, input);
  },
  delete(id: string) {
    return inventoryModel.delete(id);
  },
  async assignRequestCustody(companyId: string, input: RequestCustodyInput) {
    const request = await prisma.request.findFirst({
      where: { id: input.requestId, companyId },
      include: { assignments: true },
    });
    if (!request) throw AppError.notFound('Request not found');
    await inventoryModel.assignRequestCustody(input.requestId, input.items);

    const latest = request.assignments[request.assignments.length - 1];
    if (latest) {
      const itemRows = await prisma.inventoryItem.findMany({
        where: { id: { in: input.items.map((i) => i.inventoryItemId) } },
        select: { id: true, name: true },
      });
      const nameById = new Map(itemRows.map((r) => [r.id, r.name]));
      whatsappQueue.enqueueForEmployee(latest.employeeId, 'EMP_INVENTORY_CUSTODY', {
        items: input.items.map((i) => ({
          name: nameById.get(i.inventoryItemId) ?? 'item',
          qty: i.qty,
          unitPrice: i.unitPrice,
        })),
      });
    }
    return inventoryModel.custodyForRequest(input.requestId);
  },
};

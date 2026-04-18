import { prisma } from '@/config/prisma';
import { AppError } from '@/lib/http-error';

import type { CreateSupplyOperationInput, ListSupplyOperationsQuery } from './supply.dto';
import { supplyModel } from './supply.model';

export const supplyService = {
  list(companyId: string, filters: ListSupplyOperationsQuery = {}) {
    const where: Record<string, unknown> = { companyId };
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.status === 'paid') where.paidAt = { not: null };
    else if (filters.status === 'unpaid') {
      where.paidAt = null;
      where.invoiceAmount = { not: null };
      where.isDeferred = false;
    } else if (filters.status === 'deferred') {
      where.isDeferred = true;
      where.paidAt = null;
    } else if (filters.status === 'noInvoice') {
      where.invoiceAmount = null;
    }
    return supplyModel.list(where);
  },

  async create(companyId: string, createdById: string, input: CreateSupplyOperationInput) {
    const [employee, client, items] = await Promise.all([
      prisma.user.findFirst({
        where: { id: input.employeeId, companyId, role: 'EMPLOYEE', deletedAt: null },
      }),
      prisma.client.findFirst({ where: { id: input.clientId, companyId } }),
      prisma.inventoryItem.findMany({
        where: { companyId, id: { in: input.items.map((i) => i.inventoryItemId) } },
      }),
    ]);
    if (!employee) throw AppError.notFound('Employee not found');
    if (!client) throw AppError.notFound('Client not found');

    const itemsById = new Map(items.map((it) => [it.id, it]));
    for (const line of input.items) {
      const it = itemsById.get(line.inventoryItemId);
      if (!it) throw AppError.notFound(`Inventory item ${line.inventoryItemId} not found`);
      if (it.qty < line.qty) {
        throw AppError.badRequest(`Not enough stock for "${it.name}" (available ${it.qty})`);
      }
    }

    const hasInvoice = typeof input.invoiceAmount === 'number' && input.invoiceAmount > 0;
    const taskType = input.needsInstall ? 'SUPPLY_INSTALL' : 'SUPPLY';

    return prisma.$transaction(async (tx) => {
      // Decrement inventory qty for each line
      for (const line of input.items) {
        await tx.inventoryItem.update({
          where: { id: line.inventoryItemId },
          data: { qty: { decrement: line.qty } },
        });
      }

      // Create operation
      const op = await tx.supplyOperation.create({
        data: {
          companyId,
          employeeId: input.employeeId,
          clientId: input.clientId,
          needsInstall: input.needsInstall,
          invoiceAmount: hasInvoice ? input.invoiceAmount : null,
          isDeferred: hasInvoice ? input.isDeferred : false,
          note: input.note ?? null,
          createdById,
          items: {
            create: input.items.map((line) => {
              const it = itemsById.get(line.inventoryItemId)!;
              return {
                inventoryItemId: line.inventoryItemId,
                qty: line.qty,
                unitPrice: line.unitPrice ?? it.unitPrice,
              };
            }),
          },
        },
        include: { items: true },
      });

      // Supply or supply+install task
      const supplyTitle = input.needsInstall
        ? `توريد وتركيب لـ ${client.name}`
        : `توريد لـ ${client.name}`;
      await tx.task.create({
        data: {
          companyId,
          title: supplyTitle,
          type: taskType,
          priority: 'MEDIUM',
          status: 'PENDING',
          clientId: input.clientId,
          assigneeId: input.employeeId,
          createdById,
          operationId: op.id,
        },
      });

      // Collection task only when cash is expected now (not deferred).
      // Deferred invoices are collected later via `markPaid` or `createCollectionTask`.
      if (hasInvoice && !input.isDeferred) {
        await tx.task.create({
          data: {
            companyId,
            title: `تحصيل ${input.invoiceAmount} من ${client.name}`,
            type: 'COLLECTION',
            priority: 'MEDIUM',
            status: 'PENDING',
            clientId: input.clientId,
            assigneeId: input.employeeId,
            createdById,
            operationId: op.id,
            collectionAmount: input.invoiceAmount,
          },
        });
      }

      return op;
    });
  },

  async delete(id: string, companyId: string) {
    const op = await prisma.supplyOperation.findFirst({
      where: { id, companyId },
      include: { items: true, tasks: true },
    });
    if (!op) throw AppError.notFound('Supply operation not found');

    return prisma.$transaction(async (tx) => {
      // Restore inventory qty
      for (const line of op.items) {
        await tx.inventoryItem.update({
          where: { id: line.inventoryItemId },
          data: { qty: { increment: line.qty } },
        });
      }
      // Delete related tasks (Task.operationId has onDelete: SetNull, so we
      // must delete explicitly to remove the auto-created work).
      await tx.task.deleteMany({ where: { operationId: id } });
      // Delete items (cascade) + operation
      await tx.supplyOperation.delete({ where: { id } });
    });
  },

  async markPaid(id: string, companyId: string, byUserId: string) {
    const op = await prisma.supplyOperation.findFirst({ where: { id, companyId } });
    if (!op) throw AppError.notFound('Supply operation not found');
    if (op.paidAt) throw AppError.badRequest('Already paid');
    if (!op.invoiceAmount || op.invoiceAmount <= 0) {
      throw AppError.badRequest('No invoice to collect');
    }
    const amount = op.invoiceAmount;
    await prisma.$transaction([
      prisma.supplyOperation.update({
        where: { id },
        data: { paidAt: new Date() },
      }),
      prisma.treasuryEntry.create({
        data: {
          companyId,
          kind: 'INCOME',
          amount,
          reason: `تحصيل آجل من عملية توريد #${id.slice(-6)}`,
          createdByUserId: byUserId,
        },
      }),
    ]);
    return prisma.supplyOperation.findUnique({ where: { id } });
  },

  /**
   * Called after a COLLECTION task transitions to COMPLETED.
   * Records the amount in the treasury and marks the operation as paid.
   */
  async recordCollectionPayment(taskId: string, completedByUserId: string): Promise<void> {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.type !== 'COLLECTION' || !task.operationId) return;
    if (!task.collectionAmount || task.collectionAmount <= 0) return;

    const op = await prisma.supplyOperation.findUnique({ where: { id: task.operationId } });
    if (!op || op.paidAt) return;

    await prisma.$transaction([
      prisma.supplyOperation.update({
        where: { id: op.id },
        data: { paidAt: new Date() },
      }),
      prisma.treasuryEntry.create({
        data: {
          companyId: op.companyId,
          kind: 'INCOME',
          amount: task.collectionAmount,
          reason: `تحصيل من عملية توريد #${op.id.slice(-6)}`,
          createdByUserId: completedByUserId,
        },
      }),
    ]);
  },
};

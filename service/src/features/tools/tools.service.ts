import type { AssignCustodyInput, CreateToolInput, UpdateToolInput } from './tools.dto';
import { toolsModel } from './tools.model';

import { prisma } from '@/config/prisma';
import { whatsappQueue } from '@/features/whatsapp/whatsapp.queue';
import { AppError } from '@/lib/http-error';


export const toolsService = {
  list(companyId: string) {
    return toolsModel.list(companyId);
  },
  create(companyId: string, input: CreateToolInput) {
    return toolsModel.create({ companyId, ...input });
  },
  update(id: string, input: UpdateToolInput) {
    return toolsModel.update(id, input);
  },
  delete(id: string) {
    return toolsModel.delete(id);
  },
  async assignCustody(companyId: string, input: AssignCustodyInput) {
    const { tool, assignment } = await prisma.$transaction(async (tx) => {
      const t = await tx.tool.findFirst({ where: { id: input.toolId, companyId } });
      if (!t) throw AppError.notFound('Tool not found');
      if (t.qty < input.qty) throw AppError.badRequest('Not enough stock available');
      await tx.tool.update({ where: { id: t.id }, data: { qty: { decrement: input.qty } } });
      const a = await tx.toolAssignment.create({ data: input });
      return { tool: t, assignment: a };
    });
    whatsappQueue.enqueueForEmployee(input.employeeId, 'EMP_TOOL_CUSTODY', {
      tools: [{ name: tool.name, qty: input.qty }],
    });
    return assignment;
  },
  listCustody(employeeId: string) {
    return toolsModel.listCustody(employeeId);
  },
  listActiveCustody(companyId: string) {
    return toolsModel.listActiveCustody(companyId);
  },
  async return(id: string) {
    return prisma.$transaction(async (tx) => {
      const a = await tx.toolAssignment.findUnique({ where: { id } });
      if (!a) throw AppError.notFound('Assignment not found');
      if (a.returnedAt) throw AppError.badRequest('Already returned');
      await tx.tool.update({ where: { id: a.toolId }, data: { qty: { increment: a.qty } } });
      return tx.toolAssignment.update({ where: { id }, data: { returnedAt: new Date() } });
    });
  },
};

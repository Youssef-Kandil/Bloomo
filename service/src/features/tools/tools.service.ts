import { prisma } from '@/config/prisma';
import { whatsappQueue } from '@/features/whatsapp/whatsapp.queue';
import { AppError } from '@/lib/http-error';

import { toolsModel } from './tools.model';
import type { AssignCustodyInput, CreateToolInput, UpdateToolInput } from './tools.dto';

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
    const tool = await prisma.tool.findFirst({ where: { id: input.toolId, companyId } });
    if (!tool) throw AppError.notFound('Tool not found');
    const assignment = await toolsModel.assignCustody(input);
    whatsappQueue.enqueueForEmployee(input.employeeId, 'EMP_TOOL_CUSTODY', {
      tools: [{ name: tool.name, qty: input.qty }],
    });
    return assignment;
  },
  listCustody(employeeId: string) {
    return toolsModel.listCustody(employeeId);
  },
  return(id: string) {
    return toolsModel.returnCustody(id);
  },
};

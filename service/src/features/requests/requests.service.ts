import { prisma } from '@/config/prisma';
import { AppError } from '@/lib/http-error';
import { whatsappQueue } from '@/features/whatsapp/whatsapp.queue';

import { requestsModel } from './requests.model';
import type { AssignRequestInput, CreateRequestInput, ListRequestsQuery } from './requests.dto';

export const requestsService = {
  async list(companyId: string, q: ListRequestsQuery) {
    const skip = (q.page - 1) * q.pageSize;
    const [items, total] = await requestsModel.list(
      companyId,
      { ...(q.status ? { status: q.status } : {}), ...(q.clientId ? { clientId: q.clientId } : {}) },
      skip,
      q.pageSize,
    );
    return {
      items,
      total,
      page: q.page,
      pageSize: q.pageSize,
      totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
    };
  },

  async get(companyId: string, id: string) {
    const request = await requestsModel.findById(companyId, id);
    if (!request) throw AppError.notFound('Request not found');
    return request;
  },

  async createByStaff(companyId: string, input: CreateRequestInput) {
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, companyId },
    });
    if (!client) throw AppError.notFound('Client not found');

    const request = await requestsModel.create({
      company: { connect: { id: companyId } },
      client: { connect: { id: client.id } },
      type: input.type,
      note: input.note ?? null,
      status: 'PENDING',
    });
    await requestsModel.appendHistory(request.id, 'CREATED', { by: 'staff' });
    whatsappQueue.enqueueForClient(client.id, 'ORDER_RECEIVED', { requestId: request.id });
    return request;
  },

  async createByClientAccount(clientUserId: string, input: CreateRequestInput) {
    const client = await prisma.client.findUnique({ where: { accountUserId: clientUserId } });
    if (!client) throw AppError.forbidden('Client profile not found for this account');

    const request = await requestsModel.create({
      company: { connect: { id: client.companyId } },
      client: { connect: { id: client.id } },
      type: input.type,
      note: input.note ?? null,
      status: 'PENDING',
    });
    await requestsModel.appendHistory(request.id, 'CREATED', { by: 'client' });
    whatsappQueue.enqueueForClient(client.id, 'ORDER_RECEIVED', { requestId: request.id });
    return request;
  },

  async assign(
    companyId: string,
    requestId: string,
    assignedByUserId: string,
    input: AssignRequestInput,
  ) {
    const request = await requestsModel.findById(companyId, requestId);
    if (!request) throw AppError.notFound('Request not found');
    if (request.status === 'COMPLETED' || request.status === 'CANCELLED') {
      throw AppError.conflict('Request is finalized');
    }

    const employee = await prisma.employee.findUnique({
      where: { id: input.employeeId },
      include: { user: true },
    });
    if (!employee || employee.user.companyId !== companyId) {
      throw AppError.notFound('Employee not found');
    }

    if (input.plannedEnd <= input.plannedStart) {
      throw AppError.badRequest('plannedEnd must be after plannedStart');
    }

    const assignment = await requestsModel.createAssignment({
      requestId,
      employeeId: input.employeeId,
      plannedStart: input.plannedStart,
      plannedEnd: input.plannedEnd,
      assignedByUserId,
    });
    await requestsModel.update(requestId, { status: 'ASSIGNED' });
    await requestsModel.appendHistory(requestId, 'ASSIGNED', {
      employeeId: input.employeeId,
      plannedStart: input.plannedStart,
      plannedEnd: input.plannedEnd,
    });

    whatsappQueue.enqueueForClient(request.clientId, 'TECH_ASSIGNED', {
      employeeName: employee.user.name,
      requestId,
    });
    whatsappQueue.enqueueForClient(request.clientId, 'ETA', {
      plannedStart: input.plannedStart,
      plannedEnd: input.plannedEnd,
      requestId,
    });
    whatsappQueue.enqueueForEmployee(input.employeeId, 'EMP_TASK_ASSIGNED', {
      requestId,
      clientName: request.client.name,
      address: request.client.address,
      plannedStart: input.plannedStart,
    });
    return assignment;
  },

  async cancel(companyId: string, requestId: string) {
    const request = await requestsModel.findById(companyId, requestId);
    if (!request) throw AppError.notFound('Request not found');
    if (request.status === 'COMPLETED') throw AppError.conflict('Already completed');
    await requestsModel.update(requestId, { status: 'CANCELLED' });
    await requestsModel.appendHistory(requestId, 'CANCELLED');
  },
};

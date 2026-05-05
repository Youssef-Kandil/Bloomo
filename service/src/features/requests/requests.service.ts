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

    const employees = await prisma.employee.findMany({
      where: { id: { in: input.employeeIds } },
      include: { user: true },
    });
    const validEmployees = employees.filter((e) => e.user.companyId === companyId);
    if (validEmployees.length !== input.employeeIds.length) {
      throw AppError.notFound('One or more employees not found');
    }

    // Guard: only employees who are checked-in today AND haven't checked-out
    // can be assigned. Mirrors the on-duty rule shown in the UI.
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const todays = await prisma.attendance.findMany({
      where: {
        employeeId: { in: validEmployees.map((e) => e.id) },
        status: 'APPROVED',
        requestedAt: { gte: dayStart, lte: dayEnd },
      },
      select: { employeeId: true, type: true },
    });
    const offDuty: string[] = [];
    for (const emp of validEmployees) {
      const ids = todays.filter((a) => a.employeeId === emp.id);
      const checkedIn = ids.some((a) => a.type === 'CHECK_IN');
      const checkedOut = ids.some((a) => a.type === 'CHECK_OUT');
      if (!checkedIn || checkedOut) offDuty.push(emp.user.name);
    }
    if (offDuty.length > 0) {
      throw AppError.badRequest(
        `Employees not on duty (must be checked-in and not checked-out today): ${offDuty.join(', ')}`,
      );
    }

    const plannedStart = input.plannedStart ?? new Date();
    const plannedEnd =
      input.plannedEnd ?? new Date(plannedStart.getTime() + 2 * 60 * 60 * 1000);

    if (plannedEnd <= plannedStart) {
      throw AppError.badRequest('plannedEnd must be after plannedStart');
    }

    const assignments = await Promise.all(
      validEmployees.map((emp) =>
        requestsModel.createAssignment({
          requestId,
          employeeId: emp.id,
          plannedStart,
          plannedEnd,
          assignedByUserId,
        }),
      ),
    );
    await requestsModel.update(requestId, { status: 'ASSIGNED' });
    await requestsModel.appendHistory(requestId, 'ASSIGNED', {
      employeeIds: validEmployees.map((e) => e.id),
      plannedStart,
      plannedEnd,
    });

    for (const emp of validEmployees) {
      whatsappQueue.enqueueForClient(request.clientId, 'TECH_ASSIGNED', {
        employeeName: emp.user.name,
        requestId,
      });
      whatsappQueue.enqueueForEmployee(emp.id, 'EMP_TASK_ASSIGNED', {
        requestId,
        clientName: request.client.name,
        address: request.client.address,
        plannedStart,
      });
    }
    whatsappQueue.enqueueForClient(request.clientId, 'ETA', {
      plannedStart,
      plannedEnd,
      requestId,
    });
    return assignments;
  },

  async cancel(companyId: string, requestId: string) {
    const request = await requestsModel.findById(companyId, requestId);
    if (!request) throw AppError.notFound('Request not found');
    if (request.status === 'COMPLETED') throw AppError.conflict('Already completed');
    await requestsModel.update(requestId, { status: 'CANCELLED' });
    await requestsModel.appendHistory(requestId, 'CANCELLED');
  },

  async remove(companyId: string, requestId: string) {
    const request = await requestsModel.findById(companyId, requestId);
    if (!request) throw AppError.notFound('Request not found');
    await requestsModel.remove(requestId);
  },
};

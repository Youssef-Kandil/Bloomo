import { env } from '@/config/env';
import { prisma } from '@/config/prisma';
import { whatsappQueue } from '@/features/whatsapp/whatsapp.queue';
import { haversine } from '@/lib/geo';
import { AppError } from '@/lib/http-error';

import type { Prisma } from '@prisma/client';

import { tasksModel } from './tasks.model';
import type {
  CreateTaskInput,
  FinishTaskInput,
  StartTaskInput,
  TaskQuery,
  UpdateTaskInput,
} from './tasks.dto';

export const tasksService = {
  myOpen(employeeId: string) {
    return tasksModel.listMyTasks(employeeId);
  },

  async start(employeeId: string, assignmentId: string, loc: StartTaskInput) {
    const assignment = await tasksModel.findAssignmentForEmployee(assignmentId, employeeId);
    if (!assignment) throw AppError.notFound('Assignment not found');
    if (assignment.actualStart) throw AppError.conflict('Task already started');
    if (assignment.actualEnd) throw AppError.conflict('Task already finished');

    const distance = haversine(loc, {
      lat: assignment.request.client.lat,
      lng: assignment.request.client.lng,
    });
    if (distance.meters > env.START_TASK_RADIUS_M) {
      throw AppError.badRequest(
        `You must be within ${env.START_TASK_RADIUS_M}m of the client to start the task (current: ${distance.display})`,
        { distanceMeters: distance.m },
      );
    }

    const updated = await tasksModel.updateAssignment(assignmentId, {
      actualStart: new Date(),
    });
    await tasksModel.updateRequestStatus(assignment.requestId, 'IN_PROGRESS');
    await prisma.requestHistory.create({
      data: {
        requestId: assignment.requestId,
        event: 'TASK_STARTED',
        meta: { employeeId, distanceMeters: distance.m },
      },
    });
    return updated;
  },

  async finish(employeeId: string, assignmentId: string, input: FinishTaskInput) {
    const assignment = await tasksModel.findAssignmentForEmployee(assignmentId, employeeId);
    if (!assignment) throw AppError.notFound('Assignment not found');
    if (!assignment.actualStart) throw AppError.conflict('Task has not been started');
    if (assignment.actualEnd) throw AppError.conflict('Task already finished');

    const updated = await tasksModel.updateAssignment(assignmentId, {
      actualEnd: new Date(),
      finishNote: input.note,
    });
    await tasksModel.updateRequestStatus(assignment.requestId, 'COMPLETED');
    await prisma.requestHistory.create({
      data: {
        requestId: assignment.requestId,
        event: 'TASK_FINISHED',
        meta: { employeeId, note: input.note },
      },
    });
    whatsappQueue.enqueueForClient(assignment.request.client.id, 'COMPLETED', {
      requestId: assignment.requestId,
    });
    return updated;
  },

  /* Standalone tasks */

  async listTasks(companyId: string, query: TaskQuery) {
    const where: Prisma.TaskWhereInput = {
      companyId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q } },
              { description: { contains: query.q } },
            ],
          }
        : {}),
    };
    const items = await tasksModel.listTasks(where);
    return { items, total: items.length };
  },

  async createTask(companyId: string, createdById: string, input: CreateTaskInput) {
    const assignee = await prisma.user.findFirst({
      where: { id: input.assigneeId, companyId },
    });
    if (!assignee) throw AppError.notFound('Assignee not found in this company');

    if (input.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: input.clientId, companyId },
        select: { id: true },
      });
      if (!client) throw AppError.notFound('Client not found');
    }

    return tasksModel.createTask({
      companyId,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority,
      type: input.type,
      assigneeId: input.assigneeId,
      clientId: input.clientId ?? null,
      createdById,
      plannedStart: input.plannedStart ?? null,
      plannedEnd: input.plannedEnd ?? null,
    });
  },

  async updateTask(companyId: string, id: string, input: UpdateTaskInput) {
    const existing = await tasksModel.findTask(id, companyId);
    if (!existing) throw AppError.notFound('Task not found');
    if (input.assigneeId && input.assigneeId !== existing.assigneeId) {
      const assignee = await prisma.user.findFirst({
        where: { id: input.assigneeId, companyId },
      });
      if (!assignee) throw AppError.notFound('Assignee not found in this company');
    }
    if (input.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: input.clientId, companyId },
        select: { id: true },
      });
      if (!client) throw AppError.notFound('Client not found');
    }
    const data: Prisma.TaskUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.type !== undefined) data.type = input.type;
    if (input.assigneeId !== undefined) data.assignee = { connect: { id: input.assigneeId } };
    if (input.clientId !== undefined) {
      data.client = input.clientId
        ? { connect: { id: input.clientId } }
        : { disconnect: true };
    }
    if (input.plannedStart !== undefined) data.plannedStart = input.plannedStart;
    if (input.plannedEnd !== undefined) data.plannedEnd = input.plannedEnd;
    if (input.actualStart !== undefined) data.actualStart = input.actualStart;
    if (input.actualEnd !== undefined) data.actualEnd = input.actualEnd;
    if (input.status !== undefined) data.status = input.status;
    return tasksModel.updateTask(id, data);
  },

  async deleteTask(companyId: string, id: string) {
    const existing = await tasksModel.findTask(id, companyId);
    if (!existing) throw AppError.notFound('Task not found');
    await tasksModel.deleteTask(id);
  },
};

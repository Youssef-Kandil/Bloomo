import type { Prisma } from '@prisma/client';

import { prisma } from '@/config/prisma';

export const tasksModel = {
  findAssignmentForEmployee(assignmentId: string, employeeId: string) {
    return prisma.assignment.findFirst({
      where: { id: assignmentId, employeeId },
      include: {
        request: {
          include: { client: { select: { id: true, lat: true, lng: true, name: true } } },
        },
      },
    });
  },

  updateAssignment(id: string, data: Prisma.AssignmentUpdateInput) {
    return prisma.assignment.update({ where: { id }, data });
  },

  updateRequestStatus(id: string, status: Prisma.RequestUpdateInput['status']) {
    return prisma.request.update({ where: { id }, data: { status } });
  },

  listMyTasks(employeeId: string) {
    return prisma.assignment.findMany({
      where: { employeeId, actualEnd: null },
      include: {
        request: { include: { client: true } },
      },
      orderBy: { plannedStart: 'asc' },
    });
  },

  listMyStandaloneTasks(employeeId: string) {
    return prisma.task.findMany({
      where: {
        assigneeId: employeeId,
        status: { notIn: ['COMPLETED', 'CANCELED'] },
      },
      include: {
        client: { select: { id: true, name: true, address: true, lat: true, lng: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  },

  /* Standalone tasks */

  taskInclude: {
    assignee: { select: { id: true, name: true, email: true, role: true, avatar: true } },
    createdBy: { select: { id: true, name: true, email: true } },
  } as const,

  listTasks(where: Prisma.TaskWhereInput) {
    return prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, address: true, lat: true, lng: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  },

  findTask(id: string, companyId: string) {
    return prisma.task.findFirst({
      where: { id, companyId },
      include: {
        assignee: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, address: true, lat: true, lng: true } },
      },
    });
  },

  createTask(data: Prisma.TaskUncheckedCreateInput) {
    return prisma.task.create({
      data,
      include: {
        assignee: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, address: true, lat: true, lng: true } },
      },
    });
  },

  updateTask(id: string, data: Prisma.TaskUpdateInput) {
    return prisma.task.update({
      where: { id },
      data,
      include: {
        assignee: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, address: true, lat: true, lng: true } },
      },
    });
  },

  deleteTask(id: string) {
    return prisma.task.delete({ where: { id } });
  },
};

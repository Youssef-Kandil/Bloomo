import { env } from '@/config/env';
import { prisma } from '@/config/prisma';
import { supplyService } from '@/features/supply/supply.service';
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

  myStandaloneTasks(employeeId: string) {
    return tasksModel.listMyStandaloneTasks(employeeId);
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

  async listTasks(companyId: string, query: TaskQuery, branchScope?: string | null) {
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
      // Branch-scoped listing: a manager sees only tasks whose assignee
      // belongs to their branch (via Employee.branchId).
      ...(branchScope ? { assignee: { employee: { branchId: branchScope } } } : {}),
    };
    const items = await tasksModel.listTasks(where);
    return { items, total: items.length };
  },

  async createTask(
    companyId: string,
    createdById: string,
    input: CreateTaskInput,
    branchScope?: string | null,
  ) {
    const assignee = await prisma.user.findFirst({
      where: { id: input.assigneeId, companyId },
      include: { employee: true },
    });
    if (!assignee) throw AppError.notFound('Assignee not found in this company');
    if (branchScope && assignee.employee?.branchId !== branchScope) {
      throw AppError.forbidden("Manager can only assign tasks to their own branch's employees");
    }

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
      collectionAmount: input.collectionAmount ?? null,
      plannedStart: input.plannedStart ?? null,
      plannedEnd: input.plannedEnd ?? null,
    });
  },

  async updateTask(
    companyId: string,
    id: string,
    input: UpdateTaskInput,
    actorId?: string,
    branchScope?: string | null,
  ) {
    const existing = await tasksModel.findTask(id, companyId);
    if (!existing) throw AppError.notFound('Task not found');
    if (branchScope) {
      // Manager may only edit tasks whose current assignee is in their branch.
      const currentAssignee = await prisma.user.findUnique({
        where: { id: existing.assigneeId },
        include: { employee: true },
      });
      if (currentAssignee?.employee?.branchId !== branchScope) {
        throw AppError.forbidden("Manager can only edit tasks for their own branch's employees");
      }
    }
    if (input.assigneeId && input.assigneeId !== existing.assigneeId) {
      const assignee = await prisma.user.findFirst({
        where: { id: input.assigneeId, companyId },
        include: { employee: true },
      });
      if (!assignee) throw AppError.notFound('Assignee not found in this company');
      if (branchScope && assignee.employee?.branchId !== branchScope) {
        throw AppError.forbidden("Manager can only reassign within their own branch");
      }
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
    if (input.collectionAmount !== undefined) data.collectionAmount = input.collectionAmount;

    // A COLLECTION task finishing requires explicit approval via the
    // approve-collection endpoint — no actor (employee, manager, or admin)
    // may transition it to COMPLETED through a plain PATCH. We park any
    // such request in PENDING_APPROVAL; the approver then calls
    // approveCollection() which also records the treasury entry atomically.
    if (input.status !== undefined) {
      if (
        input.status === 'COMPLETED' &&
        existing.type === 'COLLECTION' &&
        existing.status !== 'COMPLETED'
      ) {
        data.status = 'PENDING_APPROVAL';
      } else {
        data.status = input.status;
      }
    }
    // Prevent reverting out of PENDING_APPROVAL via a plain PATCH — use
    // approveCollection / rejectCollection endpoints instead.
    if (
      existing.status === 'PENDING_APPROVAL' &&
      existing.type === 'COLLECTION' &&
      input.status !== undefined &&
      input.status !== 'PENDING_APPROVAL'
    ) {
      throw AppError.badRequest(
        'Use approve-collection or reject-collection endpoints',
      );
    }
    // Once a task is COMPLETED (post-approval), status can only be changed
    // to CANCELED by an explicit admin action — block reopening via PATCH.
    if (
      existing.status === 'COMPLETED' &&
      input.status !== undefined &&
      input.status !== 'COMPLETED' &&
      input.status !== 'CANCELED'
    ) {
      throw AppError.badRequest('Completed task cannot be reopened');
    }
    return tasksModel.updateTask(id, data);
  },

  /**
   * Employee marks their own standalone task as done. COLLECTION tasks are
   * parked in PENDING_APPROVAL and await manager/admin approval; other task
   * types transition straight to COMPLETED.
   */
  async employeeComplete(companyId: string, taskId: string, employeeId: string) {
    const task = await tasksModel.findTask(taskId, companyId);
    if (!task) throw AppError.notFound('Task not found');
    if (task.assigneeId !== employeeId) {
      throw AppError.forbidden('You can only complete your own tasks');
    }
    if (task.status === 'COMPLETED' || task.status === 'CANCELED') {
      throw AppError.badRequest('Task is already closed');
    }
    if (task.status === 'PENDING_APPROVAL') {
      throw AppError.badRequest('Task is awaiting approval — status cannot be changed');
    }

    const now = new Date();
    const data: Prisma.TaskUpdateInput = { actualEnd: now };
    data.status = task.type === 'COLLECTION' ? 'PENDING_APPROVAL' : 'COMPLETED';
    if (!task.actualStart) data.actualStart = now;
    return tasksModel.updateTask(taskId, data);
  },

  async approveCollection(companyId: string, taskId: string, actorId: string) {
    const task = await tasksModel.findTask(taskId, companyId);
    if (!task) throw AppError.notFound('Task not found');
    if (task.type !== 'COLLECTION') {
      throw AppError.badRequest('Only collection tasks require approval');
    }
    if (task.status !== 'PENDING_APPROVAL') {
      throw AppError.badRequest('Task is not pending approval');
    }

    const approver = await prisma.user.findUnique({
      where: { id: actorId },
      include: { employee: true },
    });
    if (!approver) throw AppError.forbidden('Approver not found');

    if (approver.role !== 'ADMIN') {
      if (approver.role !== 'MANAGER') {
        throw AppError.forbidden('Only admins or branch managers can approve');
      }
      const assignee = await prisma.user.findUnique({
        where: { id: task.assigneeId },
        include: { employee: true },
      });
      const employeeBranchId = assignee?.employee?.branchId ?? null;
      if (!approver.branchId || approver.branchId !== employeeBranchId) {
        throw AppError.forbidden("Manager can only approve their own branch's employees");
      }
    }

    const now = new Date();
    await tasksModel.updateTask(taskId, {
      status: 'COMPLETED',
      actualEnd: task.actualEnd ?? now,
      approvedAt: now,
      approvedBy: { connect: { id: actorId } },
    });

    if (task.operationId) {
      // Supply-linked: recordCollectionPayment both creates the treasury
      // entry and marks the SupplyOperation as paid (atomically).
      await supplyService.recordCollectionPayment(taskId, actorId);
    } else if (task.collectionAmount && task.collectionAmount > 0) {
      // Manual COLLECTION task: record income directly in treasury.
      await prisma.treasuryEntry.create({
        data: {
          companyId,
          kind: 'INCOME',
          amount: task.collectionAmount,
          reason: `تحصيل من مهمة #${taskId.slice(-6)}`,
          createdByUserId: actorId,
        },
      });
    }

    return tasksModel.findTask(taskId, companyId);
  },

  async rejectCollection(companyId: string, taskId: string, actorId: string) {
    const task = await tasksModel.findTask(taskId, companyId);
    if (!task) throw AppError.notFound('Task not found');
    if (task.type !== 'COLLECTION') {
      throw AppError.badRequest('Only collection tasks can be rejected this way');
    }
    if (task.status !== 'PENDING_APPROVAL') {
      throw AppError.badRequest('Task is not pending approval');
    }
    const approver = await prisma.user.findUnique({ where: { id: actorId } });
    if (!approver || (approver.role !== 'ADMIN' && approver.role !== 'MANAGER')) {
      throw AppError.forbidden('Only admins or managers can reject');
    }
    return tasksModel.updateTask(taskId, { status: 'IN_PROGRESS', actualEnd: null });
  },

  async deleteTask(companyId: string, id: string, branchScope?: string | null) {
    const existing = await tasksModel.findTask(id, companyId);
    if (!existing) throw AppError.notFound('Task not found');
    if (branchScope) {
      const currentAssignee = await prisma.user.findUnique({
        where: { id: existing.assigneeId },
        include: { employee: true },
      });
      if (currentAssignee?.employee?.branchId !== branchScope) {
        throw AppError.forbidden("Manager can only delete tasks for their own branch's employees");
      }
    }
    await tasksModel.deleteTask(id);
  },
};

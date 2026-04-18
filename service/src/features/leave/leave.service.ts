import { prisma } from '@/config/prisma';
import { AppError } from '@/lib/http-error';

import type { DecideLeaveInput, SubmitLeaveInput } from './leave.dto';

export const leaveService = {
  async submit(employeeId: string, input: SubmitLeaveInput) {
    const user = await prisma.user.findUnique({ where: { id: employeeId } });
    if (!user || !user.companyId) throw AppError.forbidden('No company context');
    return prisma.leaveRequest.create({
      data: {
        companyId: user.companyId,
        employeeId,
        fromDate: input.fromDate,
        toDate: input.toDate,
        reason: input.reason ?? null,
      },
    });
  },

  listMine(employeeId: string) {
    return prisma.leaveRequest.findMany({
      where: { employeeId },
      orderBy: { fromDate: 'desc' },
    });
  },

  listForCompany(companyId: string, status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return prisma.leaveRequest.findMany({
      where: { companyId, ...(status ? { status } : {}) },
      include: {
        employee: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            branch: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { fromDate: 'desc' }],
    });
  },

  async decide(id: string, actorId: string, companyId: string, input: DecideLeaveInput) {
    const req = await prisma.leaveRequest.findFirst({
      where: { id, companyId },
      include: { employee: { include: { user: { select: { branchId: true } } } } },
    });
    if (!req) throw AppError.notFound('Request not found');
    if (req.status !== 'PENDING') throw AppError.badRequest('Already decided');

    const approver = await prisma.user.findUnique({ where: { id: actorId } });
    if (!approver) throw AppError.forbidden('Approver not found');
    if (approver.role !== 'ADMIN') {
      if (approver.role !== 'MANAGER') {
        throw AppError.forbidden('Only admins or branch managers can decide');
      }
      const empBranch = req.employee.branchId ?? null;
      if (!approver.branchId || approver.branchId !== empBranch) {
        throw AppError.forbidden("Manager can only decide their own branch's employees");
      }
    }

    if (!input.approve && !input.rejectReason) {
      throw AppError.badRequest('Reject reason required');
    }

    return prisma.leaveRequest.update({
      where: { id },
      data: {
        status: input.approve ? 'APPROVED' : 'REJECTED',
        decidedAt: new Date(),
        decidedByUserId: actorId,
        rejectReason: input.approve ? null : input.rejectReason ?? null,
      },
    });
  },
};

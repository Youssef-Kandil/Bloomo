import { prisma } from '@/config/prisma';
import { AppError } from '@/lib/http-error';

import type { DecideOvertimeInput, SubmitOvertimeInput } from './overtime.dto';

export const overtimeService = {
  async submit(employeeId: string, input: SubmitOvertimeInput) {
    const user = await prisma.user.findUnique({ where: { id: employeeId } });
    if (!user || !user.companyId) throw AppError.forbidden('No company context');
    return prisma.overtimeRequest.create({
      data: {
        companyId: user.companyId,
        employeeId,
        date: input.date,
        startAt: input.startAt,
        endAt: input.endAt,
        reason: input.reason ?? null,
      },
    });
  },

  listMine(employeeId: string) {
    return prisma.overtimeRequest.findMany({
      where: { employeeId },
      orderBy: { date: 'desc' },
    });
  },

  listForCompany(companyId: string, status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return prisma.overtimeRequest.findMany({
      where: { companyId, ...(status ? { status } : {}) },
      include: {
        employee: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            branch: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { date: 'desc' }],
    });
  },

  async decide(id: string, actorId: string, companyId: string, input: DecideOvertimeInput) {
    const req = await prisma.overtimeRequest.findFirst({
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

    return prisma.overtimeRequest.update({
      where: { id },
      data: {
        status: input.approve ? 'APPROVED' : 'REJECTED',
        decidedAt: new Date(),
        decidedByUserId: actorId,
        rejectReason: input.approve ? null : input.rejectReason ?? null,
      },
    });
  },

  /**
   * Sum of approved overtime hours for an employee in a given month.
   */
  async approvedHoursForMonth(
    employeeId: string,
    year: number,
    month: number,
  ): Promise<number> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    const rows = await prisma.overtimeRequest.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        date: { gte: start, lte: end },
      },
      select: { startAt: true, endAt: true },
    });
    let hours = 0;
    for (const r of rows) {
      const ms = new Date(r.endAt).getTime() - new Date(r.startAt).getTime();
      if (ms > 0) hours += ms / 3_600_000;
    }
    return hours;
  },
};

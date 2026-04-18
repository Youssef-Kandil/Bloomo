import { prisma } from '@/config/prisma';
import { AppError } from '@/lib/http-error';

import type { DecideAdvanceInput, SubmitAdvanceInput } from './salary-advance.dto';

export const salaryAdvanceService = {
  async submit(employeeId: string, input: SubmitAdvanceInput) {
    const user = await prisma.user.findUnique({ where: { id: employeeId } });
    if (!user || !user.companyId) throw AppError.forbidden('No company context');
    return prisma.salaryAdvance.create({
      data: {
        companyId: user.companyId,
        employeeId,
        amount: input.amount,
        reason: input.reason ?? null,
        appliedYear: input.appliedYear,
        appliedMonth: input.appliedMonth,
      },
    });
  },

  listMine(employeeId: string) {
    return prisma.salaryAdvance.findMany({
      where: { employeeId },
      orderBy: [{ appliedYear: 'desc' }, { appliedMonth: 'desc' }, { createdAt: 'desc' }],
    });
  },

  listForCompany(companyId: string, status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return prisma.salaryAdvance.findMany({
      where: { companyId, ...(status ? { status } : {}) },
      include: {
        employee: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            branch: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  },

  async decide(id: string, actorId: string, companyId: string, input: DecideAdvanceInput) {
    const req = await prisma.salaryAdvance.findFirst({
      where: { id, companyId },
      include: {
        employee: {
          include: { user: { select: { branchId: true, companyId: true } } },
        },
      },
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

    if (!input.approve) {
      if (!input.rejectReason) throw AppError.badRequest('Reject reason required');
      return prisma.salaryAdvance.update({
        where: { id },
        data: {
          status: 'REJECTED',
          decidedAt: new Date(),
          decidedByUserId: actorId,
          rejectReason: input.rejectReason,
        },
      });
    }

    // Approval path: enforce cap against monthly salary.
    const employee = req.employee;
    const monthlySalary = employee.monthlySalary ?? 0;
    const existingSum = await prisma.salaryAdvance.aggregate({
      where: {
        employeeId: req.employeeId,
        appliedYear: req.appliedYear,
        appliedMonth: req.appliedMonth,
        status: 'APPROVED',
      },
      _sum: { amount: true },
    });
    const already = existingSum._sum.amount ?? 0;
    if (already + req.amount > monthlySalary) {
      throw AppError.badRequest(
        'Advance would exceed this month salary cap',
      );
    }

    // Atomically: mark approved, create treasury expense, link them.
    return prisma.$transaction(async (tx) => {
      const entry = await tx.treasuryEntry.create({
        data: {
          companyId,
          kind: 'EXPENSE',
          amount: req.amount,
          reason: `سلفة راتب — ${employee.user ? '' : ''}${req.appliedYear}/${String(
            req.appliedMonth,
          ).padStart(2, '0')}`,
          createdByUserId: actorId,
        },
      });
      return tx.salaryAdvance.update({
        where: { id },
        data: {
          status: 'APPROVED',
          decidedAt: new Date(),
          decidedByUserId: actorId,
          treasuryEntryId: entry.id,
        },
      });
    });
  },

  async approvedTotalForMonth(
    employeeId: string,
    year: number,
    month: number,
  ): Promise<number> {
    const agg = await prisma.salaryAdvance.aggregate({
      where: {
        employeeId,
        appliedYear: year,
        appliedMonth: month,
        status: 'APPROVED',
      },
      _sum: { amount: true },
    });
    return agg._sum.amount ?? 0;
  },
};

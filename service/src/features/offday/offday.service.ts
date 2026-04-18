import { prisma } from '@/config/prisma';
import { AppError } from '@/lib/http-error';

import type { DecideOffDayInput, SubmitOffDayInput } from './offday.dto';

/** Normalize to midnight UTC so we can use `@unique([employeeId, date])`. */
function dayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export const offDayService = {
  async submit(employeeId: string, input: SubmitOffDayInput) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw AppError.notFound('Employee profile not found');

    const date = dayStart(input.date);
    const weekday = date.getUTCDay();
    const offDays = (employee.offDays as number[] | null) ?? [];
    if (!offDays.includes(weekday)) {
      throw AppError.badRequest('Selected date is not one of your off days');
    }

    // Upsert so re-submitting for the same day replaces a previous REJECTED one.
    const existing = await prisma.offDayAttendanceRequest.findUnique({
      where: { employeeId_date: { employeeId, date } },
    });
    if (existing && existing.status !== 'REJECTED') {
      throw AppError.conflict('Request already exists for this date');
    }
    if (existing) {
      return prisma.offDayAttendanceRequest.update({
        where: { id: existing.id },
        data: {
          reason: input.reason ?? null,
          status: 'PENDING',
          decidedAt: null,
          decidedByUserId: null,
        },
      });
    }
    return prisma.offDayAttendanceRequest.create({
      data: {
        companyId: (await prisma.user.findUnique({ where: { id: employeeId } }))?.companyId ?? '',
        employeeId,
        date,
        reason: input.reason ?? null,
      },
    });
  },

  listMine(employeeId: string) {
    return prisma.offDayAttendanceRequest.findMany({
      where: { employeeId },
      orderBy: { date: 'desc' },
    });
  },

  listForCompany(companyId: string, status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return prisma.offDayAttendanceRequest.findMany({
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

  async decide(id: string, actorId: string, companyId: string, input: DecideOffDayInput) {
    const req = await prisma.offDayAttendanceRequest.findFirst({
      where: { id, companyId },
      include: {
        employee: { include: { user: { select: { branchId: true } } } },
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

    if (!input.approve && !input.rejectReason) {
      throw AppError.badRequest('Reject reason required');
    }

    return prisma.offDayAttendanceRequest.update({
      where: { id },
      data: {
        status: input.approve ? 'APPROVED' : 'REJECTED',
        decidedAt: new Date(),
        decidedByUserId: actorId,
      },
    });
  },

  async hasApprovedForDate(employeeId: string, date: Date): Promise<boolean> {
    const d = dayStart(date);
    const found = await prisma.offDayAttendanceRequest.findUnique({
      where: { employeeId_date: { employeeId, date: d } },
    });
    return !!found && found.status === 'APPROVED';
  },
};

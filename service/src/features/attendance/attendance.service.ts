import { prisma } from '@/config/prisma';
import { offDayService } from '@/features/offday/offday.service';
import { overtimeService } from '@/features/overtime/overtime.service';
import { AppError } from '@/lib/http-error';

import { attendanceModel } from './attendance.model';
import type { DecideAttendanceInput, SubmitAttendanceInput } from './attendance.dto';

export type AttendanceBlockReason =
  | 'OFF_DAY_NEEDS_APPROVED_REQUEST'
  | 'ALREADY_CHECKED_IN'
  | 'NOT_CHECKED_IN'
  | 'ALREADY_CHECKED_OUT'
  | 'COMPLETED_NEEDS_OVERTIME_APPROVAL'
  | 'OVERTIME_DAY_DONE';

export interface AttendanceState {
  canCheckIn: boolean;
  canCheckOut: boolean;
  /** Why an action is blocked (only meaningful when canCheckIn = canCheckOut = false). */
  reason: AttendanceBlockReason | null;
  isOffDay: boolean;
  hasOffDayApproval: boolean;
  hasOvertimeApproval: boolean;
  todayCheckIns: number;
  todayCheckOuts: number;
  /** ISO of the most recent CHECK_IN today (null if not checked-in). */
  lastCheckInAt: string | null;
  /** ISO of the most recent CHECK_OUT today (null if still on duty). */
  lastCheckOutAt: string | null;
}

function dayBoundsLocal(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

async function deriveState(employeeId: string): Promise<AttendanceState> {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw AppError.notFound('Employee profile not found');

  const today = new Date();
  const weekday = today.getDay();
  const offDays = (employee.offDays as number[] | null) ?? [];
  const isOffDay = offDays.includes(weekday);

  const [hasOffDayApproval, hasOvertimeApproval, records] = await Promise.all([
    offDayService.hasApprovedForDate(employeeId, today),
    overtimeService.hasApprovedForDate(employeeId, today),
    (async () => {
      const { start, end } = dayBoundsLocal();
      return prisma.attendance.findMany({
        where: { employeeId, requestedAt: { gte: start, lte: end } },
        orderBy: { requestedAt: 'asc' },
        select: { type: true, requestedAt: true, status: true },
      });
    })(),
  ]);

  const checkIns = records.filter((r) => r.type === 'CHECK_IN');
  const checkOuts = records.filter((r) => r.type === 'CHECK_OUT');

  const baseAllowed = !isOffDay || hasOffDayApproval;
  let canCheckIn = false;
  let canCheckOut = false;
  let reason: AttendanceBlockReason | null = null;

  if (checkIns.length === 0 && checkOuts.length === 0) {
    if (baseAllowed) canCheckIn = true;
    else reason = 'OFF_DAY_NEEDS_APPROVED_REQUEST';
  } else if (checkIns.length > checkOuts.length) {
    canCheckOut = true;
  } else if (checkIns.length === checkOuts.length) {
    // Day is balanced. Allow another check-in only via approved overtime, and
    // only once (one overtime block = one extra in/out pair).
    if (checkIns.length >= 2) reason = 'OVERTIME_DAY_DONE';
    else if (hasOvertimeApproval) canCheckIn = true;
    else reason = 'COMPLETED_NEEDS_OVERTIME_APPROVAL';
  }

  return {
    canCheckIn,
    canCheckOut,
    reason,
    isOffDay,
    hasOffDayApproval,
    hasOvertimeApproval,
    todayCheckIns: checkIns.length,
    todayCheckOuts: checkOuts.length,
    lastCheckInAt:
      checkIns.length > 0 ? checkIns[checkIns.length - 1].requestedAt.toISOString() : null,
    lastCheckOutAt:
      checkOuts.length > 0 ? checkOuts[checkOuts.length - 1].requestedAt.toISOString() : null,
  };
}

function blockMessage(reason: AttendanceBlockReason | null): string {
  switch (reason) {
    case 'OFF_DAY_NEEDS_APPROVED_REQUEST':
      return 'Today is your off day — submit an approved off-day request first';
    case 'ALREADY_CHECKED_IN':
      return 'Already checked in';
    case 'NOT_CHECKED_IN':
      return 'Cannot check out before checking in';
    case 'ALREADY_CHECKED_OUT':
      return 'Already checked out';
    case 'COMPLETED_NEEDS_OVERTIME_APPROVAL':
      return 'Working hours done — submit an approved overtime request to check in again';
    case 'OVERTIME_DAY_DONE':
      return "You've already finished your overtime for today";
    default:
      return 'Action not allowed';
  }
}

export const attendanceService = {
  async submit(employeeId: string, input: SubmitAttendanceInput) {
    const state = await deriveState(employeeId);
    if (input.type === 'CHECK_IN') {
      if (!state.canCheckIn) {
        let r: AttendanceBlockReason | null = state.reason;
        if (state.todayCheckIns > state.todayCheckOuts) r = 'ALREADY_CHECKED_IN';
        throw AppError.forbidden(blockMessage(r));
      }
    } else {
      if (!state.canCheckOut) {
        let r: AttendanceBlockReason | null = state.reason;
        if (state.todayCheckIns === 0) r = 'NOT_CHECKED_IN';
        else if (state.todayCheckOuts >= state.todayCheckIns) r = 'ALREADY_CHECKED_OUT';
        throw AppError.forbidden(blockMessage(r));
      }
    }
    return attendanceModel.create(employeeId, input.type);
  },

  async getState(employeeId: string): Promise<AttendanceState> {
    return deriveState(employeeId);
  },

  /** Today's on-duty employees: have at least one CHECK_IN today and the
   * count of CHECK_INs exceeds the count of CHECK_OUTs. Excludes anyone
   * whose checkout has already been recorded. */
  async listOnDuty(companyId: string) {
    const { start, end } = dayBoundsLocal();
    const records = await prisma.attendance.findMany({
      where: {
        employee: { user: { companyId } },
        requestedAt: { gte: start, lte: end },
      },
      select: {
        employeeId: true,
        type: true,
        requestedAt: true,
        employee: { include: { user: { select: { id: true, name: true } } } },
      },
    });
    const counts = new Map<
      string,
      { ins: number; outs: number; lastIn: Date | null; name: string }
    >();
    for (const r of records) {
      const cur = counts.get(r.employeeId) ?? {
        ins: 0,
        outs: 0,
        lastIn: null,
        name: r.employee.user.name,
      };
      if (r.type === 'CHECK_IN') {
        cur.ins++;
        if (!cur.lastIn || r.requestedAt > cur.lastIn) cur.lastIn = r.requestedAt;
      } else {
        cur.outs++;
      }
      counts.set(r.employeeId, cur);
    }
    const out: Array<{ employeeId: string; name: string; lastCheckInAt: string | null }> = [];
    for (const [employeeId, c] of counts) {
      if (c.ins > c.outs) {
        out.push({
          employeeId,
          name: c.name,
          lastCheckInAt: c.lastIn ? c.lastIn.toISOString() : null,
        });
      }
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  },

  /** Manager/admin force check-out: creates an APPROVED CHECK_OUT directly. */
  async forceCheckOut(actorUserId: string, employeeId: string, companyId: string) {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, user: { companyId } },
      include: { user: true },
    });
    if (!employee) throw AppError.notFound('Employee not found in your company');

    const { start, end } = dayBoundsLocal();
    const records = await prisma.attendance.findMany({
      where: { employeeId, requestedAt: { gte: start, lte: end } },
      orderBy: { requestedAt: 'asc' },
      select: { id: true, type: true },
    });
    const ins = records.filter((r) => r.type === 'CHECK_IN').length;
    const outs = records.filter((r) => r.type === 'CHECK_OUT').length;
    if (ins === 0) throw AppError.badRequest('Employee has not checked in today');
    if (ins <= outs) throw AppError.conflict('Employee has already checked out');

    return prisma.attendance.create({
      data: {
        employeeId,
        type: 'CHECK_OUT',
        requestedAt: new Date(),
        status: 'APPROVED',
        decidedAt: new Date(),
        decidedByUserId: actorUserId,
      },
    });
  },

  listPending(companyId: string) {
    return attendanceModel.list(companyId, { status: 'PENDING' });
  },
  listAll(companyId: string) {
    return attendanceModel.list(companyId);
  },
  mine(employeeId: string) {
    return attendanceModel.listMine(employeeId);
  },
  async decide(id: string, deciderUserId: string, input: DecideAttendanceInput) {
    const row = await attendanceModel.findById(id);
    if (!row) throw AppError.notFound('Attendance not found');
    if (row.status !== 'PENDING') throw AppError.conflict('Already decided');
    if (!input.approve && !input.reason) throw AppError.badRequest('Rejection reason required');
    return attendanceModel.decide(id, input.approve, deciderUserId, input.reason);
  },
};

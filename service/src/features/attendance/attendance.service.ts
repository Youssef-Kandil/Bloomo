import { prisma } from '@/config/prisma';
import { offDayService } from '@/features/offday/offday.service';
import { AppError } from '@/lib/http-error';

import { attendanceModel } from './attendance.model';
import type { DecideAttendanceInput, SubmitAttendanceInput } from './attendance.dto';

export const attendanceService = {
  async submit(employeeId: string, input: SubmitAttendanceInput) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw AppError.notFound('Employee profile not found');
    const today = new Date();
    const weekday = today.getUTCDay();
    const offDays = (employee.offDays as number[] | null) ?? [];
    if (offDays.includes(weekday)) {
      const ok = await offDayService.hasApprovedForDate(employeeId, today);
      if (!ok) {
        throw AppError.forbidden(
          'Today is your off day — submit an approved off-day attendance request first',
        );
      }
    }
    return attendanceModel.create(employeeId, input.type);
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

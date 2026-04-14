import { AppError } from '@/lib/http-error';

import { attendanceModel } from './attendance.model';
import type { DecideAttendanceInput, SubmitAttendanceInput } from './attendance.dto';

export const attendanceService = {
  submit(employeeId: string, input: SubmitAttendanceInput) {
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

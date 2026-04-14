import { Router } from 'express';

import { requireRole } from '@/auth/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { validate } from '@/utils/validate';

import { attendanceController } from './attendance.controller';
import { decideAttendanceDto, submitAttendanceDto } from './attendance.dto';

export const attendanceRouter = Router();

attendanceRouter.post(
  '/',
  requireRole('EMPLOYEE'),
  validate(submitAttendanceDto),
  asyncHandler(attendanceController.submit),
);
attendanceRouter.get('/mine', requireRole('EMPLOYEE'), asyncHandler(attendanceController.mine));
attendanceRouter.get('/pending', requireRole('ADMIN', 'MANAGER'), asyncHandler(attendanceController.pending));
attendanceRouter.get('/', requireRole('ADMIN', 'MANAGER'), asyncHandler(attendanceController.all));
attendanceRouter.post(
  '/:id/decide',
  requireRole('ADMIN', 'MANAGER'),
  validate(decideAttendanceDto),
  asyncHandler(attendanceController.decide),
);

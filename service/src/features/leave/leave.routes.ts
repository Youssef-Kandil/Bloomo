import { Router } from 'express';

import { requireRole } from '@/auth/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { validate } from '@/utils/validate';

import { leaveController } from './leave.controller';
import { decideLeaveDto, submitLeaveDto } from './leave.dto';

export const leaveRouter = Router();

leaveRouter.post(
  '/',
  requireRole('EMPLOYEE'),
  validate(submitLeaveDto),
  asyncHandler(leaveController.submit),
);
leaveRouter.get('/mine', requireRole('EMPLOYEE'), asyncHandler(leaveController.mine));
leaveRouter.get('/', requireRole('ADMIN', 'MANAGER'), asyncHandler(leaveController.list));
leaveRouter.post(
  '/:id/decide',
  requireRole('ADMIN', 'MANAGER'),
  validate(decideLeaveDto),
  asyncHandler(leaveController.decide),
);

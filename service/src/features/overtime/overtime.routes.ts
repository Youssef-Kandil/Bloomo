import { Router } from 'express';

import { requireRole } from '@/auth/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { validate } from '@/utils/validate';

import { overtimeController } from './overtime.controller';
import { decideOvertimeDto, submitOvertimeDto } from './overtime.dto';

export const overtimeRouter = Router();

overtimeRouter.post(
  '/',
  requireRole('EMPLOYEE'),
  validate(submitOvertimeDto),
  asyncHandler(overtimeController.submit),
);
overtimeRouter.get('/mine', requireRole('EMPLOYEE'), asyncHandler(overtimeController.mine));
overtimeRouter.get('/', requireRole('ADMIN', 'MANAGER'), asyncHandler(overtimeController.list));
overtimeRouter.post(
  '/:id/decide',
  requireRole('ADMIN', 'MANAGER'),
  validate(decideOvertimeDto),
  asyncHandler(overtimeController.decide),
);

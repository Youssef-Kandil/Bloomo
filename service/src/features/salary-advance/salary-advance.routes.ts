import { Router } from 'express';

import { requireRole } from '@/auth/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { validate } from '@/utils/validate';

import { salaryAdvanceController } from './salary-advance.controller';
import { decideAdvanceDto, submitAdvanceDto } from './salary-advance.dto';

export const salaryAdvanceRouter = Router();

salaryAdvanceRouter.post(
  '/',
  requireRole('EMPLOYEE'),
  validate(submitAdvanceDto),
  asyncHandler(salaryAdvanceController.submit),
);
salaryAdvanceRouter.get('/mine', requireRole('EMPLOYEE'), asyncHandler(salaryAdvanceController.mine));
salaryAdvanceRouter.get(
  '/',
  requireRole('ADMIN', 'MANAGER'),
  asyncHandler(salaryAdvanceController.list),
);
salaryAdvanceRouter.post(
  '/:id/decide',
  requireRole('ADMIN', 'MANAGER'),
  validate(decideAdvanceDto),
  asyncHandler(salaryAdvanceController.decide),
);

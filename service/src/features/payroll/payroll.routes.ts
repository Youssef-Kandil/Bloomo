import { Router } from 'express';

import { requireRole } from '@/auth/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { validate } from '@/utils/validate';

import { payrollController } from './payroll.controller';
import { payrollQueryDto, payrollSummaryQueryDto } from './payroll.dto';

export const payrollRouter = Router();

payrollRouter.get(
  '/',
  requireRole('ADMIN', 'MANAGER'),
  validate(payrollQueryDto, 'query'),
  asyncHandler(payrollController.forEmployee),
);

payrollRouter.get(
  '/summary',
  requireRole('ADMIN', 'MANAGER'),
  validate(payrollSummaryQueryDto, 'query'),
  asyncHandler(payrollController.summary),
);

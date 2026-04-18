import { Router } from 'express';

import { requireRole } from '@/auth/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { validate } from '@/utils/validate';

import { offDayController } from './offday.controller';
import { decideOffDayRequestDto, submitOffDayRequestDto } from './offday.dto';

export const offDayRouter = Router();

offDayRouter.post(
  '/',
  requireRole('EMPLOYEE'),
  validate(submitOffDayRequestDto),
  asyncHandler(offDayController.submit),
);

offDayRouter.get('/mine', requireRole('EMPLOYEE'), asyncHandler(offDayController.mine));

offDayRouter.get(
  '/',
  requireRole('ADMIN', 'MANAGER'),
  asyncHandler(offDayController.list),
);

offDayRouter.post(
  '/:id/decide',
  requireRole('ADMIN', 'MANAGER'),
  validate(decideOffDayRequestDto),
  asyncHandler(offDayController.decide),
);

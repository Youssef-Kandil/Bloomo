import { Router } from 'express';

import { requireRole } from '@/auth/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { validate } from '@/utils/validate';

import { trackingController } from './tracking.controller';
import { pingDto } from './tracking.dto';

export const trackingRouter = Router();

trackingRouter.post('/ping', requireRole('EMPLOYEE'), validate(pingDto), asyncHandler(trackingController.ping));
trackingRouter.get('/current', requireRole('ADMIN', 'MANAGER'), asyncHandler(trackingController.current));
trackingRouter.get(
  '/history/:employeeId',
  requireRole('ADMIN', 'MANAGER'),
  asyncHandler(trackingController.history),
);

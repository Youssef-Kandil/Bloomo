import { Router } from 'express';

import { requireRole } from '@/auth/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { validate } from '@/utils/validate';

import { createRatingDto } from './ratings.dto';
import { ratingsController } from './ratings.controller';

export const ratingsRouter = Router();

ratingsRouter.post(
  '/by-client',
  requireRole('CLIENT'),
  validate(createRatingDto),
  asyncHandler(ratingsController.byClient),
);
ratingsRouter.post(
  '/by-staff',
  requireRole('ADMIN', 'MANAGER'),
  validate(createRatingDto),
  asyncHandler(ratingsController.byStaff),
);
ratingsRouter.get('/request/:requestId', asyncHandler(ratingsController.forRequest));

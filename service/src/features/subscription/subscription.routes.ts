import { Router } from 'express';

import { requireRole } from '@/auth/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { validate } from '@/utils/validate';

import { subscriptionController } from './subscription.controller';
import { contactSalesDto } from './subscription.dto';

export const subscriptionRouter = Router();

subscriptionRouter.get('/plans', asyncHandler(subscriptionController.plans));

subscriptionRouter.get(
  '/current',
  requireRole('ADMIN'),
  asyncHandler(subscriptionController.current),
);

subscriptionRouter.post(
  '/contact',
  requireRole('ADMIN'),
  validate(contactSalesDto),
  asyncHandler(subscriptionController.contact),
);

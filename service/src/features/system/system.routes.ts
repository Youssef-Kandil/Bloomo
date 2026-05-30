import { Router } from 'express';

import { requireRole } from '@/auth/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { validate } from '@/utils/validate';

import { appTreasuryController } from './app-treasury.controller';
import {
  createAppTreasuryEntryDto,
  listAppTreasuryDto,
  summaryAppTreasuryDto,
} from './app-treasury.dto';
import { systemController } from './system.controller';
import {
  activatePlanDto,
  banUserDto,
  extendSubscriptionDto,
  offerCreateDto,
  offerUpdateDto,
  resetPasswordDto,
  setLimitsDto,
  subscriptionRequestUpdateDto,
  updatePlanDto,
} from './system.dto';

export const systemRouter = Router();

systemRouter.use(requireRole('OWNER'));

systemRouter.get('/overview', asyncHandler(systemController.overview));

systemRouter.get('/companies', asyncHandler(systemController.listCompanies));
systemRouter.get('/companies/:id', asyncHandler(systemController.getCompany));
systemRouter.get(
  '/companies/:id/activation-preview',
  asyncHandler(systemController.previewActivation),
);
systemRouter.post(
  '/companies/:id/activate-plan',
  validate(activatePlanDto),
  asyncHandler(systemController.activatePlan),
);
systemRouter.post(
  '/companies/:id/extend',
  validate(extendSubscriptionDto),
  asyncHandler(systemController.extend),
);
systemRouter.patch(
  '/companies/:id/limits',
  validate(setLimitsDto),
  asyncHandler(systemController.setLimits),
);

systemRouter.get('/users', asyncHandler(systemController.listUsers));
systemRouter.post(
  '/users/:id/ban',
  validate(banUserDto),
  asyncHandler(systemController.banUser),
);
systemRouter.post('/users/:id/unban', asyncHandler(systemController.unbanUser));
systemRouter.post(
  '/users/:id/reset-password',
  validate(resetPasswordDto),
  asyncHandler(systemController.resetPassword),
);

systemRouter.get('/plans', asyncHandler(systemController.listPlans));
systemRouter.patch(
  '/plans/:id',
  validate(updatePlanDto),
  asyncHandler(systemController.updatePlan),
);

systemRouter.get('/offers', asyncHandler(systemController.listOffers));
systemRouter.post(
  '/offers',
  validate(offerCreateDto),
  asyncHandler(systemController.createOffer),
);
systemRouter.patch(
  '/offers/:id',
  validate(offerUpdateDto),
  asyncHandler(systemController.updateOffer),
);
systemRouter.delete('/offers/:id', asyncHandler(systemController.deleteOffer));

systemRouter.get('/requests', asyncHandler(systemController.listRequests));
systemRouter.patch(
  '/requests/:id',
  validate(subscriptionRequestUpdateDto),
  asyncHandler(systemController.updateRequest),
);

systemRouter.get(
  '/treasury/summary',
  validate(summaryAppTreasuryDto, 'query'),
  asyncHandler(appTreasuryController.summary),
);
systemRouter.get(
  '/treasury',
  validate(listAppTreasuryDto, 'query'),
  asyncHandler(appTreasuryController.list),
);
systemRouter.post(
  '/treasury',
  validate(createAppTreasuryEntryDto),
  asyncHandler(appTreasuryController.create),
);
systemRouter.delete('/treasury/:id', asyncHandler(appTreasuryController.remove));

import { Router } from 'express';

import { requirePermission, requireRole } from '@/auth/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { validate } from '@/utils/validate';

import { requestsController } from './requests.controller';
import { assignRequestDto, createRequestDto, listRequestsDto } from './requests.dto';

export const requestsRouter = Router();

requestsRouter.get(
  '/',
  requirePermission('requests', 'view'),
  validate(listRequestsDto, 'query'),
  asyncHandler(requestsController.list),
);

requestsRouter.get(
  '/:id',
  requirePermission('requests', 'view'),
  asyncHandler(requestsController.get),
);

requestsRouter.post('/', validate(createRequestDto), asyncHandler(requestsController.create));

requestsRouter.post(
  '/:id/assign',
  requireRole('ADMIN', 'MANAGER'),
  validate(assignRequestDto),
  asyncHandler(requestsController.assign),
);

requestsRouter.post(
  '/:id/cancel',
  requireRole('ADMIN', 'MANAGER'),
  asyncHandler(requestsController.cancel),
);

requestsRouter.delete(
  '/:id',
  requireRole('ADMIN', 'MANAGER'),
  asyncHandler(requestsController.remove),
);

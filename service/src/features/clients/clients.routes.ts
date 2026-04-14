import { Router } from 'express';

import { requirePermission } from '@/auth/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { validate } from '@/utils/validate';

import { clientsController } from './clients.controller';
import { clientQueryDto, createClientDto, updateClientDto } from './clients.dto';

export const clientsRouter = Router();

clientsRouter.get(
  '/',
  requirePermission('clients', 'view'),
  validate(clientQueryDto, 'query'),
  asyncHandler(clientsController.list),
);

clientsRouter.get(
  '/:id',
  requirePermission('clients', 'view'),
  asyncHandler(clientsController.get),
);

clientsRouter.post(
  '/',
  requirePermission('clients', 'edit'),
  validate(createClientDto),
  asyncHandler(clientsController.create),
);

clientsRouter.patch(
  '/:id',
  requirePermission('clients', 'edit'),
  validate(updateClientDto),
  asyncHandler(clientsController.update),
);

clientsRouter.delete(
  '/:id',
  requirePermission('clients', 'edit'),
  asyncHandler(clientsController.remove),
);

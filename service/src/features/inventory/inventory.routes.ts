import { Router } from 'express';

import { requireRole } from '@/auth/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { validate } from '@/utils/validate';

import { createItemDto, requestCustodyDto, updateItemDto } from './inventory.dto';
import { inventoryController } from './inventory.controller';

export const inventoryRouter = Router();

inventoryRouter.get('/', asyncHandler(inventoryController.list));
inventoryRouter.post(
  '/',
  requireRole('ADMIN', 'MANAGER'),
  validate(createItemDto),
  asyncHandler(inventoryController.create),
);
inventoryRouter.patch(
  '/:id',
  requireRole('ADMIN', 'MANAGER'),
  validate(updateItemDto),
  asyncHandler(inventoryController.update),
);
inventoryRouter.delete('/:id', requireRole('ADMIN', 'MANAGER'), asyncHandler(inventoryController.remove));
inventoryRouter.post(
  '/request-custody',
  requireRole('ADMIN', 'MANAGER'),
  validate(requestCustodyDto),
  asyncHandler(inventoryController.assignToRequest),
);

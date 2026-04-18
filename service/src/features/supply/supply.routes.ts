import { Router } from 'express';

import { requireRole } from '@/auth/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { validate } from '@/utils/validate';

import { supplyController } from './supply.controller';
import { createSupplyOperationDto, listSupplyOperationsDto } from './supply.dto';

export const supplyRouter = Router();

supplyRouter.get(
  '/',
  requireRole('ADMIN', 'MANAGER'),
  validate(listSupplyOperationsDto, 'query'),
  asyncHandler(supplyController.list),
);
supplyRouter.post(
  '/',
  requireRole('ADMIN', 'MANAGER'),
  validate(createSupplyOperationDto),
  asyncHandler(supplyController.create),
);
supplyRouter.delete(
  '/:id',
  requireRole('ADMIN', 'MANAGER'),
  asyncHandler(supplyController.remove),
);
supplyRouter.post(
  '/:id/mark-paid',
  requireRole('ADMIN', 'MANAGER'),
  asyncHandler(supplyController.markPaid),
);

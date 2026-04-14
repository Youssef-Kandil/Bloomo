import { Router } from 'express';

import { requireRole } from '@/auth/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { validate } from '@/utils/validate';

import { toolsController } from './tools.controller';
import { assignCustodyDto, createToolDto, updateToolDto } from './tools.dto';

export const toolsRouter = Router();

toolsRouter.get('/', asyncHandler(toolsController.list));
toolsRouter.post(
  '/',
  requireRole('ADMIN', 'MANAGER'),
  validate(createToolDto),
  asyncHandler(toolsController.create),
);
toolsRouter.patch(
  '/:id',
  requireRole('ADMIN', 'MANAGER'),
  validate(updateToolDto),
  asyncHandler(toolsController.update),
);
toolsRouter.delete('/:id', requireRole('ADMIN', 'MANAGER'), asyncHandler(toolsController.remove));
toolsRouter.post(
  '/custody',
  requireRole('ADMIN', 'MANAGER'),
  validate(assignCustodyDto),
  asyncHandler(toolsController.assign),
);
toolsRouter.get('/custody/mine', requireRole('EMPLOYEE'), asyncHandler(toolsController.myCustody));
toolsRouter.post('/custody/:id/return', requireRole('ADMIN', 'MANAGER'), asyncHandler(toolsController.return));

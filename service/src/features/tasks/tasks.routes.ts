import { Router } from 'express';

import { requireRole } from '@/auth/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { validate } from '@/utils/validate';

import { tasksController } from './tasks.controller';
import {
  createTaskDto,
  finishTaskDto,
  startTaskDto,
  taskQueryDto,
  updateTaskDto,
} from './tasks.dto';

export const tasksRouter = Router();

tasksRouter.get('/mine', requireRole('EMPLOYEE'), asyncHandler(tasksController.mine));
tasksRouter.get(
  '/mine/standalone',
  requireRole('EMPLOYEE'),
  asyncHandler(tasksController.mineStandalone),
);

tasksRouter.get(
  '/',
  requireRole('ADMIN', 'MANAGER'),
  validate(taskQueryDto, 'query'),
  asyncHandler(tasksController.list),
);

tasksRouter.post(
  '/',
  requireRole('ADMIN', 'MANAGER'),
  validate(createTaskDto),
  asyncHandler(tasksController.create),
);

tasksRouter.patch(
  '/:id',
  requireRole('ADMIN', 'MANAGER'),
  validate(updateTaskDto),
  asyncHandler(tasksController.update),
);

tasksRouter.delete(
  '/:id',
  requireRole('ADMIN', 'MANAGER'),
  asyncHandler(tasksController.remove),
);

tasksRouter.post(
  '/:id/start',
  requireRole('EMPLOYEE'),
  validate(startTaskDto),
  asyncHandler(tasksController.start),
);

tasksRouter.post(
  '/:id/finish',
  requireRole('EMPLOYEE'),
  validate(finishTaskDto),
  asyncHandler(tasksController.finish),
);

tasksRouter.post(
  '/:id/complete',
  requireRole('EMPLOYEE'),
  asyncHandler(tasksController.employeeComplete),
);

tasksRouter.post(
  '/:id/approve-collection',
  requireRole('ADMIN', 'MANAGER'),
  asyncHandler(tasksController.approveCollection),
);

tasksRouter.post(
  '/:id/reject-collection',
  requireRole('ADMIN', 'MANAGER'),
  asyncHandler(tasksController.rejectCollection),
);

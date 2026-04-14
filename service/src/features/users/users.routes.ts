import { Router } from 'express';

import { requireRole } from '@/auth/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { validate } from '@/utils/validate';

import {
  createClientAccountDto,
  createEmployeeDto,
  createManagerDto,
  updateUserDto,
} from './users.dto';
import { usersController } from './users.controller';

export const usersRouter = Router();

usersRouter.get('/employees', requireRole('ADMIN', 'MANAGER'), asyncHandler(usersController.employees));
usersRouter.get('/managers', requireRole('ADMIN'), asyncHandler(usersController.managers));
usersRouter.post(
  '/employees',
  requireRole('ADMIN', 'MANAGER'),
  validate(createEmployeeDto),
  asyncHandler(usersController.createEmployee),
);
usersRouter.post(
  '/managers',
  requireRole('ADMIN'),
  validate(createManagerDto),
  asyncHandler(usersController.createManager),
);
usersRouter.post(
  '/client-accounts',
  requireRole('ADMIN', 'MANAGER'),
  validate(createClientAccountDto),
  asyncHandler(usersController.createClientAccount),
);
usersRouter.patch(
  '/:id',
  requireRole('ADMIN', 'MANAGER'),
  validate(updateUserDto),
  asyncHandler(usersController.update),
);

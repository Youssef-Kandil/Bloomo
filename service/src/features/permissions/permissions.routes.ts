import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';

import { requireRole } from '@/auth/auth.middleware';
import { AppError } from '@/lib/http-error';
import { asyncHandler } from '@/utils/asyncHandler';
import { validate } from '@/utils/validate';

import { bulkUpsertDto, upsertPermissionDto } from './permissions.dto';
import { permissionsController } from './permissions.controller';

/** Allow ADMIN, or a MANAGER reading their OWN permissions row. */
function canReadManagerPerms(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(AppError.unauthorized());
    return;
  }
  if (req.user.role === 'ADMIN' || req.user.role === 'OWNER') {
    next();
    return;
  }
  if (req.user.role === 'MANAGER' && req.params.managerId === req.user.id) {
    next();
    return;
  }
  next(AppError.forbidden('Role not allowed'));
}

export const permissionsRouter = Router();

permissionsRouter.get(
  '/manager/:managerId',
  canReadManagerPerms,
  asyncHandler(permissionsController.list),
);
permissionsRouter.put(
  '/',
  requireRole('ADMIN'),
  validate(upsertPermissionDto),
  asyncHandler(permissionsController.upsert),
);
permissionsRouter.put(
  '/bulk',
  requireRole('ADMIN'),
  validate(bulkUpsertDto),
  asyncHandler(permissionsController.bulk),
);

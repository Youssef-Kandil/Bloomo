import { Router } from 'express';

import { requireRole } from '@/auth/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { validate } from '@/utils/validate';

import { bulkUpsertDto, upsertPermissionDto } from './permissions.dto';
import { permissionsController } from './permissions.controller';

export const permissionsRouter = Router();

permissionsRouter.use(requireRole('ADMIN'));
permissionsRouter.get('/manager/:managerId', asyncHandler(permissionsController.list));
permissionsRouter.put('/', validate(upsertPermissionDto), asyncHandler(permissionsController.upsert));
permissionsRouter.put('/bulk', validate(bulkUpsertDto), asyncHandler(permissionsController.bulk));

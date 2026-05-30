import { Router } from 'express';

import { requirePermission, requireRole } from '@/auth/auth.middleware';
import { voiceNoteUploader } from '@/lib/uploads';
import { asyncHandler } from '@/utils/asyncHandler';
import { validate } from '@/utils/validate';

import { requestsController } from './requests.controller';
import { assignRequestDto, createRequestDto, listRequestsDto } from './requests.dto';

export const requestsRouter = Router();

// Upload route is intentionally NOT permission-gated beyond `requireAuth`
// (applied at the mount point) — any authenticated caller, including CLIENT,
// can upload a voice note to attach to a request. The file URL alone is
// useless until referenced by a created request.
requestsRouter.post(
  '/voice-note',
  voiceNoteUploader.single('audio'),
  asyncHandler(requestsController.uploadVoiceNote),
);

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

import { Router } from 'express';

import { requireRole } from '@/auth/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';

import { rankingController } from './ranking.controller';

export const rankingRouter = Router();

rankingRouter.get(
  '/requests/:requestId',
  requireRole('ADMIN', 'MANAGER'),
  asyncHandler(rankingController.forRequest),
);

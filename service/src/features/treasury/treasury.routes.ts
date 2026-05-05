import { Router } from 'express';

import { requireRole } from '@/auth/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { validate } from '@/utils/validate';

import { createTreasuryEntryDto, treasuryListQueryDto } from './treasury.dto';
import { treasuryController } from './treasury.controller';

export const treasuryRouter = Router();

treasuryRouter.use(requireRole('ADMIN', 'MANAGER'));

treasuryRouter.get(
  '/',
  validate(treasuryListQueryDto, 'query'),
  asyncHandler(treasuryController.list),
);
treasuryRouter.get('/summary', asyncHandler(treasuryController.summary));
treasuryRouter.post('/', validate(createTreasuryEntryDto), asyncHandler(treasuryController.create));

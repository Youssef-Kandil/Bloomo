import { Router } from 'express';

import { requireRole } from '@/auth/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { validate } from '@/utils/validate';

import { companiesController } from './companies.controller';
import { createBranchDto, updateBranchDto, updateCompanyDto } from './companies.dto';

export const companiesRouter = Router();

companiesRouter.get('/me', asyncHandler(companiesController.me));
companiesRouter.patch(
  '/me',
  requireRole('ADMIN'),
  validate(updateCompanyDto),
  asyncHandler(companiesController.update),
);
companiesRouter.get('/me/branches', asyncHandler(companiesController.branches));
companiesRouter.post(
  '/me/branches',
  requireRole('ADMIN', 'MANAGER'),
  validate(createBranchDto),
  asyncHandler(companiesController.createBranch),
);
companiesRouter.patch(
  '/branches/:id',
  requireRole('ADMIN', 'MANAGER'),
  validate(updateBranchDto),
  asyncHandler(companiesController.updateBranch),
);
companiesRouter.delete(
  '/branches/:id',
  requireRole('ADMIN'),
  asyncHandler(companiesController.deleteBranch),
);

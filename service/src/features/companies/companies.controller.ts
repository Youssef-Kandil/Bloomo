import type { Request, Response } from 'express';

import { AppError } from '@/lib/http-error';
import { param } from '@/utils/reqParams';

import { companiesService } from './companies.service';
import type { CreateBranchInput, UpdateBranchInput, UpdateCompanyInput } from './companies.dto';

function companyId(req: Request): string {
  const id = req.user?.companyId;
  if (!id) throw AppError.forbidden('No company context');
  return id;
}

export const companiesController = {
  async me(req: Request, res: Response): Promise<void> {
    res.json({ company: await companiesService.get(companyId(req)) });
  },
  async update(req: Request, res: Response): Promise<void> {
    res.json({ company: await companiesService.update(companyId(req), req.body as UpdateCompanyInput) });
  },
  async branches(req: Request, res: Response): Promise<void> {
    res.json({ branches: await companiesService.listBranches(companyId(req)) });
  },
  async createBranch(req: Request, res: Response): Promise<void> {
    res.status(201).json({
      branch: await companiesService.createBranch(companyId(req), req.body as CreateBranchInput),
    });
  },
  async updateBranch(req: Request, res: Response): Promise<void> {
    res.json({
      branch: await companiesService.updateBranch(param(req, 'id'), req.body as UpdateBranchInput),
    });
  },
  async deleteBranch(req: Request, res: Response): Promise<void> {
    await companiesService.deleteBranch(param(req, 'id'));
    res.status(204).end();
  },
};

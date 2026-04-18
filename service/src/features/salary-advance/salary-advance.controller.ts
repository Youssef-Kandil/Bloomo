import type { Request, Response } from 'express';

import { AppError } from '@/lib/http-error';
import { param } from '@/utils/reqParams';

import type { DecideAdvanceInput, SubmitAdvanceInput } from './salary-advance.dto';
import { salaryAdvanceService } from './salary-advance.service';

function companyId(req: Request): string {
  const id = req.user?.companyId;
  if (!id) throw AppError.forbidden('No company context');
  return id;
}

export const salaryAdvanceController = {
  async submit(req: Request, res: Response): Promise<void> {
    const user = req.user;
    if (!user || user.role !== 'EMPLOYEE') throw AppError.forbidden('Employees only');
    const request = await salaryAdvanceService.submit(user.id, req.body as SubmitAdvanceInput);
    res.status(201).json({ request });
  },
  async mine(req: Request, res: Response): Promise<void> {
    const user = req.user;
    if (!user) throw AppError.forbidden('Unauthorized');
    res.json({ requests: await salaryAdvanceService.listMine(user.id) });
  },
  async list(req: Request, res: Response): Promise<void> {
    const status = req.query.status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined;
    res.json({
      requests: await salaryAdvanceService.listForCompany(companyId(req), status),
    });
  },
  async decide(req: Request, res: Response): Promise<void> {
    const request = await salaryAdvanceService.decide(
      param(req, 'id'),
      req.user!.id,
      companyId(req),
      req.body as DecideAdvanceInput,
    );
    res.json({ request });
  },
};

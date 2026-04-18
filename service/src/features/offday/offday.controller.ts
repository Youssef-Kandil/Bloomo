import type { Request, Response } from 'express';

import { AppError } from '@/lib/http-error';
import { param } from '@/utils/reqParams';

import type { DecideOffDayInput, SubmitOffDayInput } from './offday.dto';
import { offDayService } from './offday.service';

function companyId(req: Request): string {
  const id = req.user?.companyId;
  if (!id) throw AppError.forbidden('No company context');
  return id;
}

export const offDayController = {
  async submit(req: Request, res: Response): Promise<void> {
    const user = req.user;
    if (!user || user.role !== 'EMPLOYEE') throw AppError.forbidden('Employees only');
    const request = await offDayService.submit(user.id, req.body as SubmitOffDayInput);
    res.status(201).json({ request });
  },

  async mine(req: Request, res: Response): Promise<void> {
    const user = req.user;
    if (!user) throw AppError.forbidden('Unauthorized');
    res.json({ requests: await offDayService.listMine(user.id) });
  },

  async list(req: Request, res: Response): Promise<void> {
    const status = req.query.status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined;
    res.json({ requests: await offDayService.listForCompany(companyId(req), status) });
  },

  async decide(req: Request, res: Response): Promise<void> {
    const request = await offDayService.decide(
      param(req, 'id'),
      req.user!.id,
      companyId(req),
      req.body as DecideOffDayInput,
    );
    res.json({ request });
  },
};

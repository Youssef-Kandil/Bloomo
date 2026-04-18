import type { Request, Response } from 'express';

import { AppError } from '@/lib/http-error';
import { param } from '@/utils/reqParams';

import type { DecideOvertimeInput, SubmitOvertimeInput } from './overtime.dto';
import { overtimeService } from './overtime.service';

function companyId(req: Request): string {
  const id = req.user?.companyId;
  if (!id) throw AppError.forbidden('No company context');
  return id;
}

export const overtimeController = {
  async submit(req: Request, res: Response): Promise<void> {
    const user = req.user;
    if (!user || user.role !== 'EMPLOYEE') throw AppError.forbidden('Employees only');
    const request = await overtimeService.submit(user.id, req.body as SubmitOvertimeInput);
    res.status(201).json({ request });
  },
  async mine(req: Request, res: Response): Promise<void> {
    const user = req.user;
    if (!user) throw AppError.forbidden('Unauthorized');
    res.json({ requests: await overtimeService.listMine(user.id) });
  },
  async list(req: Request, res: Response): Promise<void> {
    const status = req.query.status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined;
    res.json({ requests: await overtimeService.listForCompany(companyId(req), status) });
  },
  async decide(req: Request, res: Response): Promise<void> {
    const request = await overtimeService.decide(
      param(req, 'id'),
      req.user!.id,
      companyId(req),
      req.body as DecideOvertimeInput,
    );
    res.json({ request });
  },
};

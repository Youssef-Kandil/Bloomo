import type { Request, Response } from 'express';

import { AppError } from '@/lib/http-error';

import { treasuryService } from './treasury.service';
import type { CreateTreasuryEntryInput } from './treasury.dto';

function companyId(req: Request): string {
  const id = req.user?.companyId;
  if (!id) throw AppError.forbidden('No company context');
  return id;
}

export const treasuryController = {
  async list(req: Request, res: Response): Promise<void> {
    res.json(await treasuryService.list(companyId(req), Number(req.query.page ?? 1)));
  },
  async summary(req: Request, res: Response): Promise<void> {
    res.json(await treasuryService.summary(companyId(req)));
  },
  async create(req: Request, res: Response): Promise<void> {
    res.status(201).json({
      entry: await treasuryService.create(
        companyId(req),
        req.user!.id,
        req.body as CreateTreasuryEntryInput,
      ),
    });
  },
};

import type { Request, Response } from 'express';

import { AppError } from '@/lib/http-error';

import { treasuryService } from './treasury.service';
import type { CreateTreasuryEntryInput, TreasuryListQuery } from './treasury.dto';

function companyId(req: Request): string {
  const id = req.user?.companyId;
  if (!id) throw AppError.forbidden('No company context');
  return id;
}

function parseDate(v: unknown): Date | undefined {
  if (typeof v !== 'string' || !v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export const treasuryController = {
  async list(req: Request, res: Response): Promise<void> {
    res.json(await treasuryService.list(companyId(req), req.query as unknown as TreasuryListQuery));
  },
  async summary(req: Request, res: Response): Promise<void> {
    res.json(
      await treasuryService.summary(companyId(req), {
        from: parseDate(req.query.from),
        to: parseDate(req.query.to),
      }),
    );
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

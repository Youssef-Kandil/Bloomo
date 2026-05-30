import type { Request, Response } from 'express';

import { AppError } from '@/lib/http-error';
import { param } from '@/utils/reqParams';

import { appTreasuryService } from './app-treasury.service';
import type {
  CreateAppTreasuryEntryInput,
  ListAppTreasuryQuery,
  SummaryAppTreasuryQuery,
} from './app-treasury.dto';

function actorId(req: Request): string {
  const id = req.user?.id;
  if (!id) throw AppError.unauthorized();
  return id;
}

export const appTreasuryController = {
  async list(req: Request, res: Response): Promise<void> {
    res.json(await appTreasuryService.list(req.query as unknown as ListAppTreasuryQuery));
  },

  async summary(req: Request, res: Response): Promise<void> {
    res.json(await appTreasuryService.summary(req.query as unknown as SummaryAppTreasuryQuery));
  },

  async create(req: Request, res: Response): Promise<void> {
    const entry = await appTreasuryService.createManualEntry(
      req.body as CreateAppTreasuryEntryInput,
      actorId(req),
    );
    res.status(201).json({ entry });
  },

  async remove(req: Request, res: Response): Promise<void> {
    await appTreasuryService.deleteEntry(param(req, 'id'));
    res.status(204).end();
  },
};

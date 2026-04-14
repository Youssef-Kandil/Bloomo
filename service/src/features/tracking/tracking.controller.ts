import type { Request, Response } from 'express';

import { AppError } from '@/lib/http-error';
import { param } from '@/utils/reqParams';

import { trackingService } from './tracking.service';
import type { PingInput } from './tracking.dto';

function companyId(req: Request): string {
  const id = req.user?.companyId;
  if (!id) throw AppError.forbidden();
  return id;
}

export const trackingController = {
  async ping(req: Request, res: Response): Promise<void> {
    await trackingService.ping(req.user!.id, req.body as PingInput);
    res.status(204).end();
  },
  async current(req: Request, res: Response): Promise<void> {
    res.json({ employees: await trackingService.current(companyId(req)) });
  },
  async history(req: Request, res: Response): Promise<void> {
    const minutes = Number(req.query.minutes ?? 60);
    res.json({ pings: await trackingService.history(param(req, 'employeeId'), minutes) });
  },
};

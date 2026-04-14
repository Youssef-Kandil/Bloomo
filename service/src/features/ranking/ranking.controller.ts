import type { Request, Response } from 'express';

import { AppError } from '@/lib/http-error';
import { param } from '@/utils/reqParams';

import { rankingService } from './ranking.service';

export const rankingController = {
  async forRequest(req: Request, res: Response): Promise<void> {
    const companyId = req.user?.companyId;
    if (!companyId) throw AppError.forbidden('No company context');
    const candidates = await rankingService.rankForRequest(companyId, param(req, 'requestId'));
    res.json({ candidates });
  },
};

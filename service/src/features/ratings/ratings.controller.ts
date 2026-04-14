import type { Request, Response } from 'express';

import { AppError } from '@/lib/http-error';
import { param } from '@/utils/reqParams';

import { ratingsService } from './ratings.service';
import type { CreateRatingInput } from './ratings.dto';

export const ratingsController = {
  async byClient(req: Request, res: Response): Promise<void> {
    res.status(201).json({
      rating: await ratingsService.recordByClient(req.user!.id, req.body as CreateRatingInput),
    });
  },
  async byStaff(req: Request, res: Response): Promise<void> {
    const companyId = req.user?.companyId;
    if (!companyId) throw AppError.forbidden();
    res.status(201).json({
      rating: await ratingsService.recordByStaff(companyId, req.user!.id, req.body as CreateRatingInput),
    });
  },
  async forRequest(req: Request, res: Response): Promise<void> {
    res.json({ ratings: await ratingsService.forRequest(param(req, 'requestId')) });
  },
};

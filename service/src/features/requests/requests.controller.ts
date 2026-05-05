import type { Request, Response } from 'express';

import { AppError } from '@/lib/http-error';
import { param } from '@/utils/reqParams';

import { requestsService } from './requests.service';
import type { AssignRequestInput, CreateRequestInput, ListRequestsQuery } from './requests.dto';

function companyId(req: Request): string {
  const id = req.user?.companyId;
  if (!id) throw AppError.forbidden('No company context');
  return id;
}

export const requestsController = {
  async list(req: Request, res: Response): Promise<void> {
    res.json(await requestsService.list(companyId(req), req.query as unknown as ListRequestsQuery));
  },

  async get(req: Request, res: Response): Promise<void> {
    const data = await requestsService.get(companyId(req), param(req, 'id'));
    res.json({ request: data });
  },

  async create(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    let request;
    if (user.role === 'CLIENT') {
      request = await requestsService.createByClientAccount(user.id, req.body as CreateRequestInput);
    } else {
      request = await requestsService.createByStaff(companyId(req), req.body as CreateRequestInput);
    }
    res.status(201).json({ request });
  },

  async assign(req: Request, res: Response): Promise<void> {
    const assignments = await requestsService.assign(
      companyId(req),
      param(req, 'id'),
      req.user!.id,
      req.body as AssignRequestInput,
    );
    res.status(201).json({ assignments });
  },

  async cancel(req: Request, res: Response): Promise<void> {
    await requestsService.cancel(companyId(req), param(req, 'id'));
    res.status(204).end();
  },

  async remove(req: Request, res: Response): Promise<void> {
    await requestsService.remove(companyId(req), param(req, 'id'));
    res.status(204).end();
  },
};

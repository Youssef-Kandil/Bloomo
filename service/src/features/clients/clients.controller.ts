import type { Request, Response } from 'express';

import { AppError } from '@/lib/http-error';
import { param } from '@/utils/reqParams';

import { clientsService } from './clients.service';
import type { ClientQuery, CreateClientInput, UpdateClientInput } from './clients.dto';

function companyId(req: Request): string {
  const id = req.user?.companyId;
  if (!id) throw AppError.forbidden('No company context');
  return id;
}

export const clientsController = {
  async list(req: Request, res: Response): Promise<void> {
    const data = await clientsService.list(companyId(req), req.query as unknown as ClientQuery);
    res.json(data);
  },

  async get(req: Request, res: Response): Promise<void> {
    const data = await clientsService.get(companyId(req), param(req, 'id'));
    res.json({ client: data });
  },

  async create(req: Request, res: Response): Promise<void> {
    const data = await clientsService.create(companyId(req), req.body as CreateClientInput);
    res.status(201).json({ client: data });
  },

  async update(req: Request, res: Response): Promise<void> {
    const data = await clientsService.update(
      companyId(req),
      param(req, 'id'),
      req.body as UpdateClientInput,
    );
    res.json({ client: data });
  },

  async remove(req: Request, res: Response): Promise<void> {
    await clientsService.delete(companyId(req), param(req, 'id'));
    res.status(204).end();
  },
};

import type { Request, Response } from 'express';

import { AppError } from '@/lib/http-error';
import { param } from '@/utils/reqParams';

import { inventoryService } from './inventory.service';
import type { CreateItemInput, RequestCustodyInput, UpdateItemInput } from './inventory.dto';

function companyId(req: Request): string {
  const id = req.user?.companyId;
  if (!id) throw AppError.forbidden('No company context');
  return id;
}

export const inventoryController = {
  async list(req: Request, res: Response): Promise<void> {
    res.json({ items: await inventoryService.list(companyId(req)) });
  },
  async create(req: Request, res: Response): Promise<void> {
    res.status(201).json({
      item: await inventoryService.create(companyId(req), req.body as CreateItemInput),
    });
  },
  async update(req: Request, res: Response): Promise<void> {
    res.json({ item: await inventoryService.update(param(req, 'id'), req.body as UpdateItemInput) });
  },
  async remove(req: Request, res: Response): Promise<void> {
    await inventoryService.delete(param(req, 'id'));
    res.status(204).end();
  },
  async assignToRequest(req: Request, res: Response): Promise<void> {
    res.status(201).json({
      custody: await inventoryService.assignRequestCustody(
        companyId(req),
        req.body as RequestCustodyInput,
      ),
    });
  },
};

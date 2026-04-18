import type { Request, Response } from 'express';

import { AppError } from '@/lib/http-error';

import { param } from '@/utils/reqParams';

import type {
  CreateSupplyOperationInput,
  ListSupplyOperationsQuery,
} from './supply.dto';
import { supplyService } from './supply.service';

function companyId(req: Request): string {
  const id = req.user?.companyId;
  if (!id) throw AppError.forbidden('No company context');
  return id;
}

export const supplyController = {
  async list(req: Request, res: Response): Promise<void> {
    const filters = req.query as ListSupplyOperationsQuery;
    res.json({ operations: await supplyService.list(companyId(req), filters) });
  },
  async create(req: Request, res: Response): Promise<void> {
    const op = await supplyService.create(
      companyId(req),
      req.user!.id,
      req.body as CreateSupplyOperationInput,
    );
    res.status(201).json({ operation: op });
  },
  async remove(req: Request, res: Response): Promise<void> {
    await supplyService.delete(param(req, 'id'), companyId(req));
    res.status(204).end();
  },
  async markPaid(req: Request, res: Response): Promise<void> {
    const op = await supplyService.markPaid(
      param(req, 'id'),
      companyId(req),
      req.user!.id,
    );
    res.json({ operation: op });
  },
};

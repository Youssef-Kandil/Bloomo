import type { Request, Response } from 'express';

import { AppError } from '@/lib/http-error';
import { param } from '@/utils/reqParams';

import { toolsService } from './tools.service';
import type { AssignCustodyInput, CreateToolInput, UpdateToolInput } from './tools.dto';

function companyId(req: Request): string {
  const id = req.user?.companyId;
  if (!id) throw AppError.forbidden('No company context');
  return id;
}

export const toolsController = {
  async list(req: Request, res: Response): Promise<void> {
    res.json({ tools: await toolsService.list(companyId(req)) });
  },
  async create(req: Request, res: Response): Promise<void> {
    res.status(201).json({ tool: await toolsService.create(companyId(req), req.body as CreateToolInput) });
  },
  async update(req: Request, res: Response): Promise<void> {
    res.json({ tool: await toolsService.update(param(req, 'id'), req.body as UpdateToolInput) });
  },
  async remove(req: Request, res: Response): Promise<void> {
    await toolsService.delete(param(req, 'id'));
    res.status(204).end();
  },
  async assign(req: Request, res: Response): Promise<void> {
    res.status(201).json({
      assignment: await toolsService.assignCustody(companyId(req), req.body as AssignCustodyInput),
    });
  },
  async myCustody(req: Request, res: Response): Promise<void> {
    res.json({ custody: await toolsService.listCustody(req.user!.id) });
  },
  async return(req: Request, res: Response): Promise<void> {
    res.json({ assignment: await toolsService.return(param(req, 'id')) });
  },
};

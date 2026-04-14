import type { Request, Response } from 'express';

import { param } from '@/utils/reqParams';

import { permissionsService } from './permissions.service';
import type { BulkUpsertInput, UpsertPermissionInput } from './permissions.dto';

export const permissionsController = {
  async list(req: Request, res: Response): Promise<void> {
    res.json({ permissions: await permissionsService.list(param(req, 'managerId')) });
  },
  async upsert(req: Request, res: Response): Promise<void> {
    res.json({ permission: await permissionsService.upsert(req.body as UpsertPermissionInput) });
  },
  async bulk(req: Request, res: Response): Promise<void> {
    res.json({ permissions: await permissionsService.bulk(req.body as BulkUpsertInput) });
  },
};

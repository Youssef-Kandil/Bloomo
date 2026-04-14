import type { Request, Response } from 'express';

import { AppError } from '@/lib/http-error';
import { param } from '@/utils/reqParams';

import { usersService } from './users.service';
import type {
  CreateClientAccountInput,
  CreateEmployeeInput,
  CreateManagerInput,
  UpdateUserInput,
} from './users.dto';

function companyId(req: Request): string {
  const id = req.user?.companyId;
  if (!id) throw AppError.forbidden('No company context');
  return id;
}

export const usersController = {
  async employees(req: Request, res: Response): Promise<void> {
    res.json(await usersService.listEmployees(companyId(req), Number(req.query.page ?? 1)));
  },
  async managers(req: Request, res: Response): Promise<void> {
    res.json(await usersService.listManagers(companyId(req)));
  },
  async createEmployee(req: Request, res: Response): Promise<void> {
    res.status(201).json({
      user: await usersService.createEmployee(companyId(req), req.body as CreateEmployeeInput),
    });
  },
  async createManager(req: Request, res: Response): Promise<void> {
    res.status(201).json({
      user: await usersService.createManager(companyId(req), req.body as CreateManagerInput),
    });
  },
  async createClientAccount(req: Request, res: Response): Promise<void> {
    res.status(201).json({
      user: await usersService.createClientAccount(
        companyId(req),
        req.body as CreateClientAccountInput,
      ),
    });
  },
  async update(req: Request, res: Response): Promise<void> {
    res.json({ user: await usersService.update(param(req, 'id'), req.body as UpdateUserInput) });
  },
};

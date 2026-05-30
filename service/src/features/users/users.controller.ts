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

/** Restrict listings/writes to a manager's own branch; admin/owner see all. */
function managerBranchScope(req: Request): string | null {
  if (req.user?.role === 'MANAGER') return req.user.branchId ?? null;
  return null;
}

export const usersController = {
  async employees(req: Request, res: Response): Promise<void> {
    res.json(
      await usersService.listEmployees(
        companyId(req),
        Number(req.query.page ?? 1),
        undefined,
        managerBranchScope(req),
      ),
    );
  },
  async managers(req: Request, res: Response): Promise<void> {
    res.json(await usersService.listManagers(companyId(req)));
  },
  async createEmployee(req: Request, res: Response): Promise<void> {
    res.status(201).json({
      user: await usersService.createEmployee(
        companyId(req),
        req.body as CreateEmployeeInput,
        managerBranchScope(req),
      ),
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
  async remove(req: Request, res: Response): Promise<void> {
    await usersService.softDelete(param(req, 'id'), companyId(req));
    res.status(204).end();
  },
};

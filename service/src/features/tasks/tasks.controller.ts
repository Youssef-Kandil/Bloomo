import type { Request, Response } from 'express';

import { AppError } from '@/lib/http-error';
import { param } from '@/utils/reqParams';

import { tasksService } from './tasks.service';
import type {
  CreateTaskInput,
  FinishTaskInput,
  StartTaskInput,
  TaskQuery,
  UpdateTaskInput,
} from './tasks.dto';

function employeeId(req: Request): string {
  const user = req.user;
  if (!user || user.role !== 'EMPLOYEE') throw AppError.forbidden('Employees only');
  return user.id;
}

function companyId(req: Request): string {
  const id = req.user?.companyId;
  if (!id) throw AppError.forbidden('No company context');
  return id;
}

function managerBranchScope(req: Request): string | null {
  if (req.user?.role === 'MANAGER') return req.user.branchId ?? null;
  return null;
}

export const tasksController = {
  async mine(req: Request, res: Response): Promise<void> {
    const tasks = await tasksService.myOpen(employeeId(req));
    res.json({ tasks });
  },

  async mineStandalone(req: Request, res: Response): Promise<void> {
    const tasks = await tasksService.myStandaloneTasks(employeeId(req));
    res.json({ tasks });
  },

  async start(req: Request, res: Response): Promise<void> {
    const assignment = await tasksService.start(
      employeeId(req),
      param(req, 'id'),
      req.body as StartTaskInput,
    );
    res.json({ assignment });
  },

  async finish(req: Request, res: Response): Promise<void> {
    const assignment = await tasksService.finish(
      employeeId(req),
      param(req, 'id'),
      req.body as FinishTaskInput,
    );
    res.json({ assignment });
  },

  async list(req: Request, res: Response): Promise<void> {
    const data = await tasksService.listTasks(
      companyId(req),
      req.query as unknown as TaskQuery,
      managerBranchScope(req),
    );
    res.json(data);
  },

  async create(req: Request, res: Response): Promise<void> {
    const user = req.user;
    if (!user) throw AppError.forbidden('Unauthorized');
    const task = await tasksService.createTask(
      companyId(req),
      user.id,
      req.body as CreateTaskInput,
      managerBranchScope(req),
    );
    res.status(201).json({ task });
  },

  async update(req: Request, res: Response): Promise<void> {
    const task = await tasksService.updateTask(
      companyId(req),
      param(req, 'id'),
      req.body as UpdateTaskInput,
      req.user?.id,
      managerBranchScope(req),
    );
    res.json({ task });
  },

  async remove(req: Request, res: Response): Promise<void> {
    await tasksService.deleteTask(companyId(req), param(req, 'id'), managerBranchScope(req));
    res.status(204).end();
  },

  async employeeComplete(req: Request, res: Response): Promise<void> {
    const task = await tasksService.employeeComplete(
      companyId(req),
      param(req, 'id'),
      employeeId(req),
    );
    res.json({ task });
  },

  async approveCollection(req: Request, res: Response): Promise<void> {
    const task = await tasksService.approveCollection(
      companyId(req),
      param(req, 'id'),
      req.user!.id,
    );
    res.json({ task });
  },

  async rejectCollection(req: Request, res: Response): Promise<void> {
    const task = await tasksService.rejectCollection(
      companyId(req),
      param(req, 'id'),
      req.user!.id,
    );
    res.json({ task });
  },
};

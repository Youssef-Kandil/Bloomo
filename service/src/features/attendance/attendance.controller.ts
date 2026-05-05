import type { Request, Response } from 'express';

import { AppError } from '@/lib/http-error';
import { param } from '@/utils/reqParams';

import { attendanceService } from './attendance.service';
import type { DecideAttendanceInput, SubmitAttendanceInput } from './attendance.dto';

function companyId(req: Request): string {
  const id = req.user?.companyId;
  if (!id) throw AppError.forbidden('No company context');
  return id;
}

export const attendanceController = {
  async submit(req: Request, res: Response): Promise<void> {
    res.status(201).json({
      attendance: await attendanceService.submit(req.user!.id, req.body as SubmitAttendanceInput),
    });
  },
  async pending(req: Request, res: Response): Promise<void> {
    res.json({ items: await attendanceService.listPending(companyId(req)) });
  },
  async all(req: Request, res: Response): Promise<void> {
    res.json({ items: await attendanceService.listAll(companyId(req)) });
  },
  async mine(req: Request, res: Response): Promise<void> {
    res.json({ items: await attendanceService.mine(req.user!.id) });
  },
  async decide(req: Request, res: Response): Promise<void> {
    res.json({
      attendance: await attendanceService.decide(
        param(req, 'id'),
        req.user!.id,
        req.body as DecideAttendanceInput,
      ),
    });
  },
  async myState(req: Request, res: Response): Promise<void> {
    res.json({ state: await attendanceService.getState(req.user!.id) });
  },
  async onDuty(req: Request, res: Response): Promise<void> {
    res.json({ items: await attendanceService.listOnDuty(companyId(req)) });
  },
  async forceCheckOut(req: Request, res: Response): Promise<void> {
    res.status(201).json({
      attendance: await attendanceService.forceCheckOut(
        req.user!.id,
        param(req, 'employeeId'),
        companyId(req),
      ),
    });
  },
};

import type { Request, Response } from 'express';

import { AppError } from '@/lib/http-error';

import type { PayrollQuery, PayrollSummaryQuery } from './payroll.dto';
import { payrollService } from './payroll.service';

function companyId(req: Request): string {
  const id = req.user?.companyId;
  if (!id) throw AppError.forbidden('No company context');
  return id;
}

export const payrollController = {
  async forEmployee(req: Request, res: Response): Promise<void> {
    const q = req.query as unknown as PayrollQuery;
    const result = await payrollService.computeForEmployee(
      companyId(req),
      q.employeeId,
      Number(q.year),
      Number(q.month),
    );
    res.json({ payroll: result });
  },

  async summary(req: Request, res: Response): Promise<void> {
    const q = req.query as unknown as PayrollSummaryQuery;
    const rows = await payrollService.summaryForMonth(
      companyId(req),
      Number(q.year),
      Number(q.month),
    );
    res.json({ rows });
  },
};

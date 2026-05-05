import type { Request, Response } from 'express';

import { AppError } from '@/lib/http-error';

import { subscriptionService } from './subscription.service';
import type { ContactSalesInput } from './subscription.dto';

function companyId(req: Request): string {
  const id = req.user?.companyId;
  if (!id) throw AppError.forbidden('No company context');
  return id;
}

export const subscriptionController = {
  async current(req: Request, res: Response): Promise<void> {
    const data = await subscriptionService.getCurrent(companyId(req));
    res.json({ subscription: data });
  },

  async plans(_req: Request, res: Response): Promise<void> {
    res.json({ plans: await subscriptionService.listPlans() });
  },

  async contact(req: Request, res: Response): Promise<void> {
    const request = await subscriptionService.contactSales(
      companyId(req),
      req.body as ContactSalesInput,
    );
    res.status(201).json({ request });
  },
};

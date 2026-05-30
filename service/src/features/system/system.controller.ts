import type { Request, Response } from 'express';

import { AppError } from '@/lib/http-error';
import { param } from '@/utils/reqParams';

import { systemService } from './system.service';
import type {
  ActivatePlanInput,
  BanUserInput,
  ExtendSubscriptionInput,
  OfferCreateInput,
  OfferUpdateInput,
  ResetPasswordInput,
  SetLimitsInput,
  SubscriptionRequestUpdateInput,
  UpdatePlanInput,
} from './system.dto';

function q(req: Request, key: string): string | undefined {
  const val = req.query[key];
  return typeof val === 'string' && val ? val : undefined;
}
function qNum(req: Request, key: string, def: number): number {
  const v = q(req, key);
  return v ? Number.parseInt(v, 10) || def : def;
}

export const systemController = {
  async overview(_req: Request, res: Response): Promise<void> {
    res.json(await systemService.overview());
  },

  async listCompanies(req: Request, res: Response): Promise<void> {
    const data = await systemService.listCompanies(
      q(req, 'search'),
      qNum(req, 'page', 1),
      qNum(req, 'pageSize', 20),
    );
    res.json(data);
  },

  async getCompany(req: Request, res: Response): Promise<void> {
    res.json({ company: await systemService.getCompany(param(req, 'id')) });
  },

  async activatePlan(req: Request, res: Response): Promise<void> {
    const sub = await systemService.activateCompanyPlan(
      param(req, 'id'),
      req.body as ActivatePlanInput,
      req.user!.id,
    );
    res.json({ subscription: sub });
  },

  async previewActivation(req: Request, res: Response): Promise<void> {
    const plan = q(req, 'plan') as 'BASIC' | 'PRO' | 'ENTERPRISE' | undefined;
    const billingCycle = q(req, 'billingCycle') as 'MONTHLY' | 'YEARLY' | undefined;
    if (!plan || !billingCycle) {
      throw AppError.badRequest('plan and billingCycle query params are required');
    }
    const preview = await systemService.previewPlanActivation(
      param(req, 'id'),
      plan,
      billingCycle,
    );
    res.json({ preview });
  },

  async extend(req: Request, res: Response): Promise<void> {
    const sub = await systemService.extendCompany(
      param(req, 'id'),
      req.body as ExtendSubscriptionInput,
      req.user!.id,
    );
    res.json({ subscription: sub });
  },

  async setLimits(req: Request, res: Response): Promise<void> {
    const sub = await systemService.setCompanyLimits(
      param(req, 'id'),
      req.body as SetLimitsInput,
    );
    res.json({ subscription: sub });
  },

  async listUsers(req: Request, res: Response): Promise<void> {
    res.json(
      await systemService.listUsers(
        q(req, 'search'),
        q(req, 'role'),
        qNum(req, 'page', 1),
        qNum(req, 'pageSize', 25),
      ),
    );
  },

  async banUser(req: Request, res: Response): Promise<void> {
    const user = await systemService.banUser(param(req, 'id'), req.body as BanUserInput);
    res.json({ user });
  },

  async unbanUser(req: Request, res: Response): Promise<void> {
    const user = await systemService.unbanUser(param(req, 'id'));
    res.json({ user });
  },

  async resetPassword(req: Request, res: Response): Promise<void> {
    await systemService.resetUserPassword(param(req, 'id'), req.body as ResetPasswordInput);
    res.json({ ok: true });
  },

  async listPlans(_req: Request, res: Response): Promise<void> {
    res.json({ plans: await systemService.listAllPlans() });
  },

  async updatePlan(req: Request, res: Response): Promise<void> {
    const plan = await systemService.updatePlan(param(req, 'id'), req.body as UpdatePlanInput);
    res.json({ plan });
  },

  async listOffers(_req: Request, res: Response): Promise<void> {
    res.json({ offers: await systemService.listOffers() });
  },

  async createOffer(req: Request, res: Response): Promise<void> {
    const offer = await systemService.createOffer(req.body as OfferCreateInput);
    res.status(201).json({ offer });
  },

  async updateOffer(req: Request, res: Response): Promise<void> {
    const offer = await systemService.updateOffer(param(req, 'id'), req.body as OfferUpdateInput);
    res.json({ offer });
  },

  async deleteOffer(req: Request, res: Response): Promise<void> {
    await systemService.deleteOffer(param(req, 'id'));
    res.status(204).end();
  },

  async listRequests(_req: Request, res: Response): Promise<void> {
    res.json({ requests: await systemService.listSubscriptionRequests() });
  },

  async updateRequest(req: Request, res: Response): Promise<void> {
    const updated = await systemService.updateSubscriptionRequest(
      param(req, 'id'),
      req.body as SubscriptionRequestUpdateInput,
      req.user!.id,
    );
    res.json({ request: updated });
  },
};

import type { BillingCycle, Subscription, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

import { prisma } from '@/config/prisma';
import { AppError } from '@/lib/http-error';

import { getPlanLimits, publicPlanCatalog } from './subscription.plans';
import type { ContactSalesInput } from './subscription.dto';

export interface CurrentSubscriptionView {
  plan: SubscriptionPlan;
  billingCycle: BillingCycle | null;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  daysRemaining: number | null;
  isExpired: boolean;
  limits: { clients: number; employees: number; branches: number };
  hasCustomLimits: boolean;
}

function deriveStatus(sub: Subscription): SubscriptionStatus {
  if (sub.plan === 'TRIAL' && sub.trialEndsAt && sub.trialEndsAt.getTime() <= Date.now()) {
    return 'EXPIRED';
  }
  if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() <= Date.now()) {
    return 'EXPIRED';
  }
  return sub.status;
}

async function viewOf(sub: Subscription): Promise<CurrentSubscriptionView> {
  const status = deriveStatus(sub);
  const isExpired = status === 'EXPIRED';
  const planLimits = await getPlanLimits(sub.plan);
  const limits = {
    clients: sub.customClientsLimit ?? planLimits.clients,
    employees: sub.customEmployeesLimit ?? planLimits.employees,
    branches: sub.customBranchesLimit ?? planLimits.branches,
  };
  const endTs = sub.plan === 'TRIAL' ? sub.trialEndsAt : sub.currentPeriodEnd;
  const daysRemaining = endTs
    ? Math.max(0, Math.ceil((endTs.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  return {
    plan: sub.plan,
    billingCycle: sub.billingCycle,
    status,
    trialEndsAt: sub.trialEndsAt,
    currentPeriodEnd: sub.currentPeriodEnd,
    daysRemaining,
    isExpired,
    limits,
    hasCustomLimits:
      sub.customClientsLimit !== null ||
      sub.customEmployeesLimit !== null ||
      sub.customBranchesLimit !== null,
  };
}

export const subscriptionService = {
  async ensureForCompany(companyId: string): Promise<Subscription> {
    const existing = await prisma.subscription.findUnique({ where: { companyId } });
    if (existing) return existing;
    const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return prisma.subscription.create({
      data: {
        companyId,
        plan: 'TRIAL',
        status: 'TRIALING',
        trialEndsAt: trialEnd,
      },
    });
  },

  async getCurrent(companyId: string): Promise<CurrentSubscriptionView> {
    const sub = await this.ensureForCompany(companyId);
    return viewOf(sub);
  },

  listPlans() {
    return publicPlanCatalog();
  },

  async contactSales(companyId: string, input: ContactSalesInput) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw AppError.notFound('Company not found');

    const request = await prisma.subscriptionRequest.create({
      data: {
        companyId,
        plan: input.plan,
        billingCycle: input.billingCycle,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone ?? null,
        note: input.note ?? null,
      },
    });

    await prisma.subscription.update({
      where: { companyId },
      data: { status: 'PENDING_ACTIVATION' },
    });

    return request;
  },
};

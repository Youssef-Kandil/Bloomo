import type { BillingCycle, Subscription, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

import { prisma } from '@/config/prisma';
import { AppError } from '@/lib/http-error';

import { getPlanLimits, publicPlanCatalog } from './subscription.plans';
import type { ContactSalesInput } from './subscription.dto';

export interface LatestRequestSummary {
  id: string;
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'QUOTED';
  rejectReason: string | null;
  ownerMessage: string | null;
  customClientsLimit: number | null;
  customEmployeesLimit: number | null;
  customBranchesLimit: number | null;
  decidedAt: Date | null;
  createdAt: Date;
}

export interface CurrentSubscriptionView {
  plan: SubscriptionPlan;
  billingCycle: BillingCycle | null;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  daysRemaining: number | null;
  isExpired: boolean;
  limits: { clients: number; employees: number; branches: number };
  usage: { clients: number; employees: number; branches: number };
  atLimit: { clients: boolean; employees: boolean; branches: boolean };
  hasCustomLimits: boolean;
  latestRequest: LatestRequestSummary | null;
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

async function currentUsageFor(companyId: string): Promise<{
  clients: number;
  employees: number;
  branches: number;
}> {
  const [clients, employees, branches] = await Promise.all([
    prisma.client.count({ where: { companyId } }),
    prisma.user.count({
      where: { companyId, role: 'EMPLOYEE', active: true, bannedAt: null },
    }),
    prisma.branch.count({ where: { companyId } }),
  ]);
  return { clients, employees, branches };
}

async function latestRequestSummaryFor(
  companyId: string,
): Promise<LatestRequestSummary | null> {
  const row = await prisma.subscriptionRequest.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      plan: true,
      billingCycle: true,
      status: true,
      rejectReason: true,
      ownerMessage: true,
      customClientsLimit: true,
      customEmployeesLimit: true,
      customBranchesLimit: true,
      decidedAt: true,
      createdAt: true,
    },
  });
  if (!row) return null;
  return row as LatestRequestSummary;
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
  const usage = await currentUsageFor(sub.companyId);
  const latestRequest = await latestRequestSummaryFor(sub.companyId);
  // A `0` limit means unlimited (matches ensureWithinLimit's early-return),
  // so `atLimit` is only true when there's a positive limit and we hit it.
  const atLimit = {
    clients: limits.clients > 0 && usage.clients >= limits.clients,
    employees: limits.employees > 0 && usage.employees >= limits.employees,
    branches: limits.branches > 0 && usage.branches >= limits.branches,
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
    usage,
    atLimit,
    hasCustomLimits:
      sub.customClientsLimit !== null ||
      sub.customEmployeesLimit !== null ||
      sub.customBranchesLimit !== null,
    latestRequest,
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
        customClientsLimit: input.customClientsLimit ?? null,
        customEmployeesLimit: input.customEmployeesLimit ?? null,
        customBranchesLimit: input.customBranchesLimit ?? null,
      },
    });

    await prisma.subscription.update({
      where: { companyId },
      data: { status: 'PENDING_ACTIVATION' },
    });

    return request;
  },

  /** Latest request summary used by the admin's plan banner. */
  async latestRequestFor(companyId: string) {
    return prisma.subscriptionRequest.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        plan: true,
        billingCycle: true,
        status: true,
        rejectReason: true,
        ownerMessage: true,
        customClientsLimit: true,
        customEmployeesLimit: true,
        customBranchesLimit: true,
        decidedAt: true,
        createdAt: true,
      },
    });
  },
};

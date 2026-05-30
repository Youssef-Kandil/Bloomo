import type { BillingCycle, SubscriptionPlan } from '@prisma/client';

import { prisma } from '@/config/prisma';
import { getPlanLimits } from '@/features/subscription/subscription.plans';
import { AppError } from '@/lib/http-error';
import { hashPassword } from '@/lib/password';

import { appTreasuryService } from './app-treasury.service';
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

function periodEndFor(cycle: BillingCycle, days?: number, from = new Date()): Date {
  if (days) return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
  const months = cycle === 'YEARLY' ? 12 : 1;
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

export const systemService = {
  async overview() {
    const [companies, users, activeSubs, pendingRequests] = await Promise.all([
      prisma.company.count(),
      prisma.user.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.subscriptionRequest.count({ where: { status: 'PENDING' } }),
    ]);
    return { companies, users, activeSubscriptions: activeSubs, pendingRequests };
  },

  async listCompanies(search?: string, page = 1, pageSize = 20) {
    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { owner: { email: { contains: search } } },
          ],
        }
      : {};
    const [items, total] = await prisma.$transaction([
      prisma.company.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              name: true,
              bannedAt: true,
              active: true,
            },
          },
          subscription: true,
          _count: { select: { users: true, clients: true } },
        },
      }),
      prisma.company.count({ where }),
    ]);
    return { items, total, page, pageSize };
  },

  async getCompany(id: string) {
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        owner: true,
        subscription: true,
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            active: true,
            bannedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { clients: true, users: true } },
      },
    });
    if (!company) throw AppError.notFound('Company not found');
    return company;
  },

  /**
   * Read-only "what would happen if I activated this plan?" view used by the
   * OWNER UI to preview a request before approving — shows current plan, new
   * plan + price, current usage, new limits, and any downgrade violations.
   */
  async previewPlanActivation(
    companyId: string,
    plan: SubscriptionPlan,
    billingCycle: BillingCycle,
  ) {
    const sub = await prisma.subscription.findUnique({ where: { companyId } });
    if (!sub) throw AppError.notFound('Subscription not found');

    const [newPlanRow, currentPlanRow, clientsUsed, employeesUsed, branchesUsed] =
      await Promise.all([
        prisma.plan.findUnique({ where: { key: plan } }),
        prisma.plan.findUnique({ where: { key: sub.plan } }),
        prisma.client.count({ where: { companyId } }),
        prisma.user.count({
          where: { companyId, role: 'EMPLOYEE', active: true, bannedAt: null },
        }),
        prisma.branch.count({ where: { companyId } }),
      ]);

    const newLimits = {
      clients: sub.customClientsLimit ?? newPlanRow?.clientsLimit ?? 0,
      employees: sub.customEmployeesLimit ?? newPlanRow?.employeesLimit ?? 0,
      branches: sub.customBranchesLimit ?? newPlanRow?.branchesLimit ?? 0,
    };
    const currentLimits = {
      clients: sub.customClientsLimit ?? currentPlanRow?.clientsLimit ?? 0,
      employees: sub.customEmployeesLimit ?? currentPlanRow?.employeesLimit ?? 0,
      branches: sub.customBranchesLimit ?? currentPlanRow?.branchesLimit ?? 0,
    };
    const usage = { clients: clientsUsed, employees: employeesUsed, branches: branchesUsed };

    type Violation = { resource: 'clients' | 'employees' | 'branches'; used: number; limit: number };
    const violations: Violation[] = [];
    (['clients', 'employees', 'branches'] as const).forEach((r) => {
      if (newLimits[r] > 0 && usage[r] > newLimits[r]) {
        violations.push({ resource: r, used: usage[r], limit: newLimits[r] });
      }
    });

    return {
      currentPlan: {
        key: sub.plan,
        name: currentPlanRow?.name ?? sub.plan,
        billingCycle: sub.billingCycle,
        limits: currentLimits,
      },
      requestedPlan: {
        key: plan,
        name: newPlanRow?.name ?? plan,
        billingCycle,
        limits: newLimits,
        price:
          newPlanRow != null
            ? billingCycle === 'YEARLY'
              ? newPlanRow.yearlyPrice
              : newPlanRow.monthlyPrice
            : 0,
        currency: newPlanRow?.currency ?? 'EGP',
      },
      usage,
      violations,
      canApprove: violations.length === 0 && plan !== 'TRIAL',
      hasCustomLimits:
        sub.customClientsLimit !== null ||
        sub.customEmployeesLimit !== null ||
        sub.customBranchesLimit !== null,
    };
  },

  async activateCompanyPlan(companyId: string, input: ActivatePlanInput, actorId: string) {
    const sub = await prisma.subscription.findUnique({ where: { companyId } });
    if (!sub) throw AppError.notFound('Subscription not found');

    // Reject downgrades that would leave the company over the new plan's
    // limits — the OWNER (or the support flow on their behalf) must ask the
    // company to delete/disable excess clients/employees/branches first.
    // Custom-limit overrides on the subscription still apply, so the only
    // way to legitimately bypass is to set explicit `customXLimit` rows.
    const newPlanLimits = await getPlanLimits(input.plan);
    const effectiveLimits = {
      clients: sub.customClientsLimit ?? newPlanLimits.clients,
      employees: sub.customEmployeesLimit ?? newPlanLimits.employees,
      branches: sub.customBranchesLimit ?? newPlanLimits.branches,
    };
    const [clientsUsed, employeesUsed, branchesUsed] = await Promise.all([
      prisma.client.count({ where: { companyId } }),
      prisma.user.count({
        where: { companyId, role: 'EMPLOYEE', active: true, bannedAt: null },
      }),
      prisma.branch.count({ where: { companyId } }),
    ]);
    const violations: Array<{ resource: 'clients' | 'employees' | 'branches'; used: number; limit: number }> = [];
    if (effectiveLimits.clients > 0 && clientsUsed > effectiveLimits.clients) {
      violations.push({ resource: 'clients', used: clientsUsed, limit: effectiveLimits.clients });
    }
    if (effectiveLimits.employees > 0 && employeesUsed > effectiveLimits.employees) {
      violations.push({ resource: 'employees', used: employeesUsed, limit: effectiveLimits.employees });
    }
    if (effectiveLimits.branches > 0 && branchesUsed > effectiveLimits.branches) {
      violations.push({ resource: 'branches', used: branchesUsed, limit: effectiveLimits.branches });
    }
    if (violations.length > 0) {
      const newPlanRow = await prisma.plan.findUnique({ where: { key: input.plan } });
      const summary = violations
        .map((v) => `${v.resource}: ${v.used}/${v.limit}`)
        .join(', ');
      throw AppError.badRequest(`PLAN_DOWNGRADE_BLOCKED: ${summary}`, {
        code: 'PLAN_DOWNGRADE_BLOCKED',
        violations,
        currentPlan: sub.plan,
        currentBillingCycle: sub.billingCycle,
        requestedPlan: input.plan,
        requestedBillingCycle: input.billingCycle,
        requestedPrice: newPlanRow
          ? input.billingCycle === 'YEARLY'
            ? newPlanRow.yearlyPrice
            : newPlanRow.monthlyPrice
          : null,
        currency: newPlanRow?.currency ?? 'EGP',
        usage: { clients: clientsUsed, employees: employeesUsed, branches: branchesUsed },
        newPlanLimits: effectiveLimits,
        hasCustomLimits:
          sub.customClientsLimit !== null ||
          sub.customEmployeesLimit !== null ||
          sub.customBranchesLimit !== null,
      });
    }

    const periodEnd = periodEndFor(input.billingCycle, input.durationDays);
    const updated = await prisma.subscription.update({
      where: { companyId },
      data: {
        plan: input.plan,
        billingCycle: input.billingCycle,
        status: 'ACTIVE',
        currentPeriodEnd: periodEnd,
        trialEndsAt: null,
      },
    });
    // Record INCOME in the app-level treasury (amount defaults to plan price).
    await appTreasuryService.recordSubscriptionIncome({
      companyId,
      plan: input.plan,
      billingCycle: input.billingCycle,
      amount: input.amount,
      actorId,
    });
    return updated;
  },

  async extendCompany(companyId: string, input: ExtendSubscriptionInput, actorId: string) {
    const sub = await prisma.subscription.findUnique({ where: { companyId } });
    if (!sub) throw AppError.notFound('Subscription not found');
    const baseTs = Math.max(
      Date.now(),
      sub.currentPeriodEnd?.getTime() ?? 0,
      sub.trialEndsAt?.getTime() ?? 0,
    );
    const newEnd = new Date(baseTs + input.days * 24 * 60 * 60 * 1000);
    const updated =
      sub.plan === 'TRIAL'
        ? await prisma.subscription.update({
            where: { companyId },
            data: { trialEndsAt: newEnd, status: 'TRIALING' },
          })
        : await prisma.subscription.update({
            where: { companyId },
            data: { currentPeriodEnd: newEnd, status: 'ACTIVE' },
          });
    // Extending a TRIAL doesn't generate revenue — skip the treasury entry.
    if (sub.plan !== 'TRIAL') {
      await appTreasuryService.recordExtensionIncome({
        companyId,
        plan: sub.plan,
        billingCycle: sub.billingCycle,
        days: input.days,
        amount: input.amount,
        actorId,
      });
    }
    return updated;
  },

  async setCompanyLimits(companyId: string, input: SetLimitsInput) {
    const sub = await prisma.subscription.findUnique({ where: { companyId } });
    if (!sub) throw AppError.notFound('Subscription not found');
    return prisma.subscription.update({
      where: { companyId },
      data: {
        customClientsLimit: input.customClientsLimit,
        customEmployeesLimit: input.customEmployeesLimit,
        customBranchesLimit: input.customBranchesLimit,
      },
    });
  },

  async listUsers(search?: string, role?: string, page = 1, pageSize = 25) {
    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { name: { contains: search } },
      ];
    }
    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          bannedAt: true,
          bannedReason: true,
          createdAt: true,
          companyId: true,
          company: { select: { id: true, name: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);
    return { items, total, page, pageSize };
  },

  async banUser(userId: string, input: BanUserInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound('User not found');
    if (user.role === 'OWNER') throw AppError.forbidden('Cannot ban an owner');
    // Revoke refresh tokens so the user cannot acquire a new access token.
    // Existing access tokens remain valid until they expire (short TTL).
    const [updated] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { bannedAt: new Date(), bannedReason: input.reason ?? null },
      }),
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return updated;
  },

  async unbanUser(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { bannedAt: null, bannedReason: null },
    });
  },

  async resetUserPassword(userId: string, input: ResetPasswordInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound('User not found');
    const passwordHash = await hashPassword(input.newPassword);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  },

  listAllPlans() {
    return prisma.plan.findMany({ orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }] });
  },

  async updatePlan(id: string, input: UpdatePlanInput) {
    const exists = await prisma.plan.findUnique({ where: { id } });
    if (!exists) throw AppError.notFound('Plan not found');
    return prisma.plan.update({ where: { id }, data: input });
  },

  listOffers() {
    return prisma.offer.findMany({ orderBy: { createdAt: 'desc' } });
  },

  async createOffer(input: OfferCreateInput) {
    const dup = await prisma.offer.findUnique({ where: { code: input.code } });
    if (dup) throw AppError.conflict('Offer code already exists');
    if (input.validUntil <= input.validFrom) {
      throw AppError.badRequest('validUntil must be after validFrom');
    }
    return prisma.offer.create({
      data: {
        code: input.code,
        title: input.title,
        description: input.description ?? null,
        discountPercent: input.discountPercent,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        active: input.active ?? true,
        appliesTo: (input.appliesTo ?? []) as unknown as object,
      },
    });
  },

  async updateOffer(id: string, input: OfferUpdateInput) {
    const offer = await prisma.offer.findUnique({ where: { id } });
    if (!offer) throw AppError.notFound('Offer not found');
    return prisma.offer.update({
      where: { id },
      data: {
        ...input,
        appliesTo:
          input.appliesTo !== undefined
            ? (input.appliesTo as unknown as object)
            : undefined,
      },
    });
  },

  async deleteOffer(id: string) {
    await prisma.offer.delete({ where: { id } });
  },

  listSubscriptionRequests() {
    return prisma.subscriptionRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: { company: { select: { id: true, name: true } } },
      take: 100,
    });
  },

  async updateSubscriptionRequest(
    id: string,
    input: SubscriptionRequestUpdateInput,
    actorId: string,
  ) {
    const reqRow = await prisma.subscriptionRequest.findUnique({ where: { id } });
    if (!reqRow) throw AppError.notFound('Request not found');

    // APPROVED → activate the requested plan on the company (and record income
    // in the app treasury) so the admin doesn't stay stuck on PENDING_ACTIVATION.
    if (input.status === 'APPROVED') {
      if (reqRow.plan === 'TRIAL') {
        throw AppError.badRequest('Cannot approve a request for TRIAL');
      }
      // Activate the plan first (this also handles the downgrade-violation
      // check). Note: activateCompanyPlan only changes plan/cycle/status/dates
      // — it does NOT touch customXLimit columns, so any custom limits from
      // the request are applied separately right after.
      await this.activateCompanyPlan(
        reqRow.companyId,
        { plan: reqRow.plan, billingCycle: reqRow.billingCycle },
        actorId,
      );

      // Persist any custom-limit asks from the request onto the subscription.
      // Passing `null` is meaningful (clears a previous custom limit), so we
      // only update fields the admin actually filled in.
      const limitPatch: {
        customClientsLimit?: number;
        customEmployeesLimit?: number;
        customBranchesLimit?: number;
      } = {};
      if (reqRow.customClientsLimit != null) limitPatch.customClientsLimit = reqRow.customClientsLimit;
      if (reqRow.customEmployeesLimit != null) limitPatch.customEmployeesLimit = reqRow.customEmployeesLimit;
      if (reqRow.customBranchesLimit != null) limitPatch.customBranchesLimit = reqRow.customBranchesLimit;
      if (Object.keys(limitPatch).length > 0) {
        await prisma.subscription.update({
          where: { companyId: reqRow.companyId },
          data: limitPatch,
        });
      }

      // Auto-reject any sibling PENDING/QUOTED requests for the same company —
      // they're moot now that one has been actioned.
      await prisma.subscriptionRequest.updateMany({
        where: {
          companyId: reqRow.companyId,
          status: { in: ['PENDING', 'QUOTED'] },
          id: { not: id },
        },
        data: {
          status: 'REJECTED',
          rejectReason: 'Auto-rejected: another request from this company was approved',
          decidedAt: new Date(),
          decidedByUserId: actorId,
        },
      });
    }

    // REJECTED → undo the PENDING_ACTIVATION marker set when the admin
    // submitted the contact request, so the dashboard goes back to showing
    // the real state (TRIALING / ACTIVE / EXPIRED).
    if (input.status === 'REJECTED') {
      const sub = await prisma.subscription.findUnique({
        where: { companyId: reqRow.companyId },
      });
      if (sub && sub.status === 'PENDING_ACTIVATION') {
        const now = Date.now();
        const trialAlive =
          sub.plan === 'TRIAL' &&
          sub.trialEndsAt !== null &&
          sub.trialEndsAt.getTime() > now;
        const paidAlive =
          sub.plan !== 'TRIAL' &&
          sub.currentPeriodEnd !== null &&
          sub.currentPeriodEnd.getTime() > now;
        const restoredStatus = trialAlive ? 'TRIALING' : paidAlive ? 'ACTIVE' : 'EXPIRED';
        await prisma.subscription.update({
          where: { companyId: reqRow.companyId },
          data: { status: restoredStatus },
        });
      }
    }

    // QUOTED → OWNER is sending a price quote / payment instructions.
    // We keep the subscription as PENDING_ACTIVATION; the admin acts out of
    // band, then OWNER returns to mark APPROVED later.

    return prisma.subscriptionRequest.update({
      where: { id },
      data: {
        status: input.status,
        rejectReason: input.status === 'REJECTED' ? input.rejectReason ?? null : null,
        ownerMessage: input.status === 'QUOTED' ? input.ownerMessage ?? null : reqRow.ownerMessage,
        decidedAt: input.status === 'PENDING' ? null : new Date(),
        decidedByUserId: input.status === 'PENDING' ? null : actorId,
      },
    });
  },
};

export type { SubscriptionPlan, BillingCycle };

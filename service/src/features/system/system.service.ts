import type { BillingCycle, SubscriptionPlan } from '@prisma/client';

import { prisma } from '@/config/prisma';
import { AppError } from '@/lib/http-error';
import { hashPassword } from '@/lib/password';

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

  async activateCompanyPlan(companyId: string, input: ActivatePlanInput) {
    const sub = await prisma.subscription.findUnique({ where: { companyId } });
    if (!sub) throw AppError.notFound('Subscription not found');
    const periodEnd = periodEndFor(input.billingCycle, input.durationDays);
    return prisma.subscription.update({
      where: { companyId },
      data: {
        plan: input.plan,
        billingCycle: input.billingCycle,
        status: 'ACTIVE',
        currentPeriodEnd: periodEnd,
        trialEndsAt: null,
      },
    });
  },

  async extendCompany(companyId: string, input: ExtendSubscriptionInput) {
    const sub = await prisma.subscription.findUnique({ where: { companyId } });
    if (!sub) throw AppError.notFound('Subscription not found');
    const baseTs = Math.max(
      Date.now(),
      sub.currentPeriodEnd?.getTime() ?? 0,
      sub.trialEndsAt?.getTime() ?? 0,
    );
    const newEnd = new Date(baseTs + input.days * 24 * 60 * 60 * 1000);
    if (sub.plan === 'TRIAL') {
      return prisma.subscription.update({
        where: { companyId },
        data: { trialEndsAt: newEnd, status: 'TRIALING' },
      });
    }
    return prisma.subscription.update({
      where: { companyId },
      data: { currentPeriodEnd: newEnd, status: 'ACTIVE' },
    });
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
    return prisma.user.update({
      where: { id: userId },
      data: { bannedAt: new Date(), bannedReason: input.reason ?? null },
    });
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

  async updateSubscriptionRequest(id: string, input: SubscriptionRequestUpdateInput) {
    const req = await prisma.subscriptionRequest.findUnique({ where: { id } });
    if (!req) throw AppError.notFound('Request not found');
    return prisma.subscriptionRequest.update({
      where: { id },
      data: { status: input.status },
    });
  },
};

export type { SubscriptionPlan, BillingCycle };

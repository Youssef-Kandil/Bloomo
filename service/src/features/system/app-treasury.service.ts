import type {
  AppExpenseCategory,
  AppTreasuryEntry,
  AppTreasuryKind,
  BillingCycle,
  Prisma,
  SubscriptionPlan,
} from '@prisma/client';

import { prisma } from '@/config/prisma';
import { AppError } from '@/lib/http-error';

import type {
  CreateAppTreasuryEntryInput,
  ListAppTreasuryQuery,
  SummaryAppTreasuryQuery,
} from './app-treasury.dto';

/** Build the date filter shared by list + summary endpoints.
 *  `to` that lands exactly on UTC midnight is treated as inclusive of the whole
 *  day — the DateRangeFilter UI sends `yyyy-mm-dd` strings which coerce to
 *  UTC midnight, so without this bump an entry created later in the day would
 *  be filtered out when the user picks "today" as the end of the range. */
function dateRangeWhere(from?: Date, to?: Date): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined;
  const r: Prisma.DateTimeFilter = {};
  if (from) r.gte = from;
  if (to) {
    const atUtcMidnight =
      to.getUTCHours() === 0 &&
      to.getUTCMinutes() === 0 &&
      to.getUTCSeconds() === 0 &&
      to.getUTCMilliseconds() === 0;
    r.lte = atUtcMidnight ? new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1) : to;
  }
  return r;
}

interface SubscriptionAutoArgs {
  companyId: string;
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  /** When omitted, derived from Plan.monthlyPrice/yearlyPrice. */
  amount?: number;
  /** When omitted, defaults to `Subscription activation/extension`. */
  reason?: string;
  actorId: string;
}

async function defaultAmountFor(plan: SubscriptionPlan, cycle: BillingCycle): Promise<number> {
  if (plan === 'TRIAL') return 0;
  const row = await prisma.plan.findUnique({ where: { key: plan } });
  if (!row) return 0;
  return cycle === 'YEARLY' ? row.yearlyPrice : row.monthlyPrice;
}

export const appTreasuryService = {
  /** Internal hook: called when the OWNER activates a plan for a company. */
  async recordSubscriptionIncome(args: SubscriptionAutoArgs): Promise<AppTreasuryEntry> {
    const amount = args.amount ?? (await defaultAmountFor(args.plan, args.billingCycle));
    return prisma.appTreasuryEntry.create({
      data: {
        kind: 'INCOME',
        amount,
        reason: args.reason ?? `Subscription activation (${args.plan} / ${args.billingCycle})`,
        plan: args.plan,
        billingCycle: args.billingCycle,
        companyId: args.companyId,
        createdByUserId: args.actorId,
      },
    });
  },

  /** Internal hook: called when the OWNER extends a company by N days. */
  async recordExtensionIncome(args: {
    companyId: string;
    plan: SubscriptionPlan;
    billingCycle: BillingCycle | null;
    days: number;
    amount?: number;
    actorId: string;
  }): Promise<AppTreasuryEntry> {
    let amount = args.amount;
    if (amount === undefined && args.plan !== 'TRIAL') {
      // Pro-rate the monthly price over the extra days.
      const planRow = await prisma.plan.findUnique({ where: { key: args.plan } });
      const daily = planRow ? planRow.monthlyPrice / 30 : 0;
      amount = Number((daily * args.days).toFixed(2));
    }
    return prisma.appTreasuryEntry.create({
      data: {
        kind: 'INCOME',
        amount: amount ?? 0,
        reason: `Subscription extension (+${args.days} days, ${args.plan})`,
        plan: args.plan,
        billingCycle: args.billingCycle,
        companyId: args.companyId,
        createdByUserId: args.actorId,
      },
    });
  },

  /** OWNER manually records an entry (mostly expenses; income is usually auto). */
  async createManualEntry(
    input: CreateAppTreasuryEntryInput,
    actorId: string,
  ): Promise<AppTreasuryEntry> {
    return prisma.appTreasuryEntry.create({
      data: {
        kind: input.kind,
        amount: input.amount,
        reason: input.reason,
        category: input.category ?? null,
        plan: input.plan ?? null,
        billingCycle: input.billingCycle ?? null,
        companyId: input.companyId ?? null,
        createdByUserId: actorId,
      },
    });
  },

  async deleteEntry(id: string): Promise<void> {
    const entry = await prisma.appTreasuryEntry.findUnique({ where: { id } });
    if (!entry) throw AppError.notFound('Entry not found');
    await prisma.appTreasuryEntry.delete({ where: { id } });
  },

  async list(q: ListAppTreasuryQuery) {
    const where: Prisma.AppTreasuryEntryWhereInput = {};
    const dr = dateRangeWhere(q.from, q.to);
    if (dr) where.createdAt = dr;
    if (q.kind) where.kind = q.kind;
    if (q.plan) where.plan = q.plan;
    if (q.category) where.category = q.category;

    const skip = (q.page - 1) * q.pageSize;
    const [items, total] = await prisma.$transaction([
      prisma.appTreasuryEntry.findMany({
        where,
        include: { createdBy: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: q.pageSize,
      }),
      prisma.appTreasuryEntry.count({ where }),
    ]);
    return {
      items,
      total,
      page: q.page,
      pageSize: q.pageSize,
      totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
    };
  },

  /**
   * Aggregated dashboard view.
   * Returns: totals (income/expense/net), per-plan revenue + activation count,
   * per-category expense breakdown, and the best-selling plans ranked twice
   * (once by activation count, once by revenue).
   */
  async summary(q: SummaryAppTreasuryQuery): Promise<{
    range: { from: Date | null; to: Date | null };
    totals: { income: number; expense: number; net: number };
    byPlan: Array<{ plan: SubscriptionPlan; activations: number; revenue: number }>;
    byCategory: Array<{ category: AppExpenseCategory | null; amount: number }>;
    bestSellersByCount: Array<{ plan: SubscriptionPlan; activations: number; revenue: number }>;
    bestSellersByRevenue: Array<{ plan: SubscriptionPlan; activations: number; revenue: number }>;
  }> {
    const where: Prisma.AppTreasuryEntryWhereInput = {};
    const dr = dateRangeWhere(q.from, q.to);
    if (dr) where.createdAt = dr;
    if (q.plan) where.plan = q.plan;

    const [incomeAgg, expenseAgg, planGroups, categoryGroups] = await Promise.all([
      prisma.appTreasuryEntry.aggregate({
        where: { ...where, kind: 'INCOME' },
        _sum: { amount: true },
      }),
      prisma.appTreasuryEntry.aggregate({
        where: { ...where, kind: 'EXPENSE' },
        _sum: { amount: true },
      }),
      prisma.appTreasuryEntry.groupBy({
        by: ['plan'],
        where: { ...where, kind: 'INCOME', plan: { not: null } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.appTreasuryEntry.groupBy({
        by: ['category'],
        where: { ...where, kind: 'EXPENSE' },
        _sum: { amount: true },
      }),
    ]);

    const income = incomeAgg._sum.amount ?? 0;
    const expense = expenseAgg._sum.amount ?? 0;

    const byPlan = planGroups
      .filter((g) => g.plan !== null)
      .map((g) => ({
        plan: g.plan as SubscriptionPlan,
        activations: g._count._all,
        revenue: g._sum.amount ?? 0,
      }));

    const byCategory = categoryGroups.map((g) => ({
      category: g.category,
      amount: g._sum.amount ?? 0,
    }));

    const bestSellersByCount = [...byPlan].sort((a, b) => b.activations - a.activations);
    const bestSellersByRevenue = [...byPlan].sort((a, b) => b.revenue - a.revenue);

    return {
      range: { from: q.from ?? null, to: q.to ?? null },
      totals: { income, expense, net: income - expense },
      byPlan,
      byCategory,
      bestSellersByCount,
      bestSellersByRevenue,
    };
  },
};

export type { AppTreasuryEntry, AppTreasuryKind };

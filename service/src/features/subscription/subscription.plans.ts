import type { Plan, SubscriptionPlan } from '@prisma/client';

import { prisma } from '@/config/prisma';

export interface PlanLimits {
  clients: number;
  employees: number;
  branches: number;
}

export interface PlanPricing {
  monthly: number;
  yearly: number;
  currency: string;
}

export interface PlanCatalogEntry {
  key: SubscriptionPlan;
  name: string;
  tagline: string | null;
  limits: PlanLimits;
  pricing: PlanPricing | null;
  highlight?: boolean;
  active: boolean;
  sortOrder: number;
}

function rowToEntry(row: Plan): PlanCatalogEntry {
  return {
    key: row.key,
    name: row.name,
    tagline: row.tagline,
    limits: {
      clients: row.clientsLimit,
      employees: row.employeesLimit,
      branches: row.branchesLimit,
    },
    pricing:
      row.key === 'TRIAL'
        ? null
        : { monthly: row.monthlyPrice, yearly: row.yearlyPrice, currency: row.currency },
    highlight: row.highlight,
    active: row.active,
    sortOrder: row.sortOrder,
  };
}

export async function loadPlanCatalog(): Promise<PlanCatalogEntry[]> {
  const rows = await prisma.plan.findMany({
    orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }],
  });
  return rows.map(rowToEntry);
}

export async function publicPlanCatalog(): Promise<PlanCatalogEntry[]> {
  const rows = await prisma.plan.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }],
  });
  return rows.map(rowToEntry);
}

export async function getPlanLimits(plan: SubscriptionPlan): Promise<PlanLimits> {
  const row = await prisma.plan.findUnique({ where: { key: plan } });
  return row
    ? {
        clients: row.clientsLimit,
        employees: row.employeesLimit,
        branches: row.branchesLimit,
      }
    : { clients: 0, employees: 0, branches: 0 };
}

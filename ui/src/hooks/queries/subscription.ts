'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

export type SubscriptionPlan = 'TRIAL' | 'BASIC' | 'PRO' | 'ENTERPRISE';
export type BillingCycle = 'MONTHLY' | 'YEARLY';
export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'EXPIRED' | 'PENDING_ACTIVATION';

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'QUOTED';

export interface LatestRequestSummary {
  id: string;
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  status: RequestStatus;
  rejectReason: string | null;
  ownerMessage: string | null;
  customClientsLimit: number | null;
  customEmployeesLimit: number | null;
  customBranchesLimit: number | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface CurrentSubscription {
  plan: SubscriptionPlan;
  billingCycle: BillingCycle | null;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  daysRemaining: number | null;
  isExpired: boolean;
  limits: { clients: number; employees: number; branches: number };
  usage: { clients: number; employees: number; branches: number };
  atLimit: { clients: boolean; employees: boolean; branches: boolean };
  hasCustomLimits?: boolean;
  latestRequest: LatestRequestSummary | null;
}

export interface PlanCatalogEntry {
  key: SubscriptionPlan;
  name?: string;
  tagline?: string | null;
  limits: { clients: number; employees: number; branches: number };
  pricing: { monthly: number; yearly: number; currency: string } | null;
  trialDays?: number;
  highlight?: boolean;
}

export const subscriptionKeys = {
  current: ['subscription', 'current'] as const,
  plans: ['subscription', 'plans'] as const,
};

export function useCurrentSubscription(enabled = true) {
  return useQuery({
    queryKey: subscriptionKeys.current,
    enabled,
    queryFn: async () => {
      const res = await api.get<{ subscription: CurrentSubscription }>(
        '/api/subscription/current',
      );
      return res.data.subscription;
    },
  });
}

export function usePlans() {
  return useQuery({
    queryKey: subscriptionKeys.plans,
    queryFn: async () => {
      const res = await api.get<{ plans: PlanCatalogEntry[] }>('/api/subscription/plans');
      return res.data.plans;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export interface ContactSalesInput {
  plan: Exclude<SubscriptionPlan, 'TRIAL'>;
  billingCycle: BillingCycle;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  note?: string;
  customClientsLimit?: number;
  customEmployeesLimit?: number;
  customBranchesLimit?: number;
}

export function useContactSales() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ContactSalesInput) => {
      const res = await api.post('/api/subscription/contact', input);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: subscriptionKeys.current }),
  });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

import type { CycleKey, PlanKey } from './system';

export type AppTreasuryKind = 'INCOME' | 'EXPENSE';
export type AppExpenseCategory =
  | 'INFRASTRUCTURE'
  | 'SALARIES'
  | 'MARKETING'
  | 'TOOLS'
  | 'TAXES'
  | 'REFUND'
  | 'OTHER';

export interface AppTreasuryEntry {
  id: string;
  kind: AppTreasuryKind;
  amount: number;
  reason: string;
  category: AppExpenseCategory | null;
  plan: PlanKey | null;
  billingCycle: CycleKey | null;
  companyId: string | null;
  createdAt: string;
  createdBy: { id: string; name: string; email: string } | null;
}

export interface AppTreasurySummary {
  range: { from: string | null; to: string | null };
  totals: { income: number; expense: number; net: number };
  byPlan: Array<{ plan: PlanKey; activations: number; revenue: number }>;
  byCategory: Array<{ category: AppExpenseCategory | null; amount: number }>;
  bestSellersByCount: Array<{ plan: PlanKey; activations: number; revenue: number }>;
  bestSellersByRevenue: Array<{ plan: PlanKey; activations: number; revenue: number }>;
}

export interface ListAppTreasuryFilters {
  from?: string;
  to?: string;
  kind?: AppTreasuryKind;
  plan?: PlanKey;
  category?: AppExpenseCategory;
  page?: number;
  pageSize?: number;
}

export interface CreateAppTreasuryEntryInput {
  kind: AppTreasuryKind;
  amount: number;
  reason: string;
  category?: AppExpenseCategory;
  plan?: PlanKey;
  billingCycle?: CycleKey;
  companyId?: string;
}

export const appTreasuryKeys = {
  summary: (filters: { from?: string; to?: string; plan?: PlanKey }) =>
    ['app-treasury', 'summary', filters.from ?? '', filters.to ?? '', filters.plan ?? ''] as const,
  list: (filters: ListAppTreasuryFilters) =>
    [
      'app-treasury',
      'list',
      filters.from ?? '',
      filters.to ?? '',
      filters.kind ?? '',
      filters.plan ?? '',
      filters.category ?? '',
      filters.page ?? 1,
      filters.pageSize ?? 50,
    ] as const,
};

export function useAppTreasurySummary(filters: { from?: string; to?: string; plan?: PlanKey }) {
  return useQuery({
    queryKey: appTreasuryKeys.summary(filters),
    queryFn: async () => {
      const res = await api.get<AppTreasurySummary>('/api/system/treasury/summary', {
        params: filters,
      });
      return res.data;
    },
  });
}

export function useAppTreasuryList(filters: ListAppTreasuryFilters) {
  return useQuery({
    queryKey: appTreasuryKeys.list(filters),
    queryFn: async () => {
      const res = await api.get<{
        items: AppTreasuryEntry[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      }>('/api/system/treasury', { params: filters });
      return res.data;
    },
  });
}

export function useCreateAppTreasuryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAppTreasuryEntryInput) => {
      const res = await api.post<{ entry: AppTreasuryEntry }>('/api/system/treasury', input);
      return res.data.entry;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['app-treasury'] }),
  });
}

export function useDeleteAppTreasuryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/system/treasury/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['app-treasury'] }),
  });
}

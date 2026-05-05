'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

export type TreasuryKind = 'INCOME' | 'EXPENSE';

export interface TreasuryEntry {
  id: string;
  kind: TreasuryKind;
  amount: number;
  reason: string;
  createdAt: string;
  createdBy?: { id?: string; name: string } | null;
  requestId?: string | null;
}

export interface TreasurySummary {
  income: number;
  expense: number;
  balance: number;
}

export interface DateRange {
  from?: string; // ISO yyyy-mm-dd
  to?: string;
}

const KEY = 'treasury';

function rangeParams(range: DateRange): Record<string, string> {
  const out: Record<string, string> = { pageSize: '500' };
  if (range.from) out.from = range.from;
  if (range.to) out.to = range.to;
  return out;
}

export function useTreasuryEntries(range: DateRange = {}) {
  return useQuery({
    queryKey: [KEY, 'list', range.from ?? '', range.to ?? ''],
    queryFn: async () =>
      (
        await api.get<{ items: TreasuryEntry[] }>('/api/treasury', {
          params: rangeParams(range),
        })
      ).data.items,
  });
}

export function useTreasurySummary(range: DateRange = {}) {
  return useQuery({
    queryKey: [KEY, 'summary', range.from ?? '', range.to ?? ''],
    queryFn: async () =>
      (
        await api.get<TreasurySummary>('/api/treasury/summary', {
          params: rangeParams(range),
        })
      ).data,
  });
}

export interface CreateEntryInput {
  kind: TreasuryKind;
  amount: number;
  reason: string;
}

export function useCreateTreasuryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEntryInput) =>
      (await api.post<{ entry: TreasuryEntry }>('/api/treasury', input)).data.entry,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
    },
  });
}

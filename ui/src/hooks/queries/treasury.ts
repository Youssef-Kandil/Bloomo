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

const LIST_KEY = ['treasury'] as const;
const SUMMARY_KEY = ['treasury', 'summary'] as const;

export function useTreasuryEntries() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: async () =>
      (await api.get<{ items: TreasuryEntry[] }>('/api/treasury')).data.items,
  });
}

export function useTreasurySummary() {
  return useQuery({
    queryKey: SUMMARY_KEY,
    queryFn: async () =>
      (await api.get<TreasurySummary>('/api/treasury/summary')).data,
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
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: SUMMARY_KEY });
    },
  });
}

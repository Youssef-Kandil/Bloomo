'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

export interface SupplyOperation {
  id: string;
  employeeId: string;
  clientId: string;
  needsInstall: boolean;
  invoiceAmount: number | null;
  isDeferred: boolean;
  paidAt: string | null;
  note: string | null;
  createdAt: string;
  employee: { id: string; name: string; email: string };
  client: { id: string; name: string };
  items: Array<{
    id: string;
    inventoryItemId: string;
    qty: number;
    unitPrice: number;
    inventoryItem: { id: string; name: string; sku: string };
  }>;
  tasks: Array<{ id: string; type: string; status: string; title: string }>;
}

const KEY = ['supply'] as const;

export interface SupplyFilters {
  employeeId?: string;
  clientId?: string;
  status?: 'paid' | 'unpaid' | 'deferred' | 'noInvoice';
}

export function useSupplyOperations(filters: SupplyFilters = {}) {
  return useQuery({
    queryKey: [...KEY, filters] as const,
    queryFn: async () =>
      (
        await api.get<{ operations: SupplyOperation[] }>('/api/supply', {
          params: {
            employeeId: filters.employeeId || undefined,
            clientId: filters.clientId || undefined,
            status: filters.status || undefined,
          },
        })
      ).data.operations,
  });
}

export interface CreateSupplyInput {
  employeeId: string;
  clientId: string;
  items: Array<{ inventoryItemId: string; qty: number; unitPrice?: number }>;
  needsInstall: boolean;
  invoiceAmount?: number;
  isDeferred: boolean;
  note?: string;
}

export function useCreateSupplyOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSupplyInput) =>
      (await api.post<{ operation: SupplyOperation }>('/api/supply', input)).data.operation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteSupplyOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/supply/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useMarkSupplyPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.post<{ operation: SupplyOperation }>(`/api/supply/${id}/mark-paid`)).data
        .operation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['treasury'] });
    },
  });
}

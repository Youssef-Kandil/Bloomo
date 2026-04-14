'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  type?: string | null;
  icon?: string | null;
  qty: number;
  unitPrice: number;
}

interface InventoryResponse {
  items: InventoryItem[];
}

const KEY = ['inventory'] as const;

export function useInventory() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await api.get<InventoryResponse>('/api/inventory')).data,
  });
}

export interface ItemInput {
  name: string;
  sku: string;
  type?: string;
  icon?: string;
  qty: number;
  unitPrice: number;
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ItemInput) =>
      (await api.post<{ item: InventoryItem }>('/api/inventory', input)).data.item,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<ItemInput> & { id: string }) =>
      (await api.patch<{ item: InventoryItem }>(`/api/inventory/${id}`, patch)).data.item,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/inventory/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

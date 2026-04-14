'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

export interface ClientPhone {
  id?: string;
  label: string;
  phone: string;
  isWhatsapp: boolean;
}

export interface Client {
  id: string;
  name: string;
  note: string | null;
  address: string;
  lat: number;
  lng: number;
  marketingOptIn: boolean;
  createdAt?: string;
  phones: ClientPhone[];
  accountUser?: { id: string; email: string } | null;
}

interface ClientList {
  items: Client[];
  total: number;
  page: number;
  totalPages: number;
}

const KEY = ['clients'] as const;

export function useClients(query?: string) {
  return useQuery({
    queryKey: [...KEY, query ?? ''] as const,
    queryFn: async () => {
      const res = await api.get<ClientList>('/api/clients', {
        params: { q: query?.trim() || undefined, pageSize: 100 },
      });
      return res.data;
    },
  });
}

export interface ClientInput {
  name: string;
  note?: string;
  address: string;
  lat: number;
  lng: number;
  marketingOptIn: boolean;
  phones: Array<{ label: string; phone: string; isWhatsapp: boolean }>;
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ClientInput) =>
      (await api.post<{ client: Client }>('/api/clients', input)).data.client,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<ClientInput> & { id: string }) =>
      (await api.patch<{ client: Client }>(`/api/clients/${id}`, patch)).data.client,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCreateClientAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { clientId: string; email: string; password: string }) =>
      (await api.post<{ user: { id: string; email: string } }>('/api/users/client-accounts', input))
        .data.user,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/clients/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

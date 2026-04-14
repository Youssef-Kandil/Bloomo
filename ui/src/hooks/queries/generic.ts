'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

/**
 * Generic CRUD-ish helpers for screens that just list and create entities.
 * Heavier, custom flows (requests, ranking, whatsapp) get their own hook files.
 */
export function useResource<T>(key: readonly unknown[], path: string) {
  return useQuery({
    queryKey: key,
    queryFn: async () => (await api.get<T>(path)).data,
  });
}

export function useCreate<TVars, TRes>(
  invalidateKey: readonly unknown[],
  path: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: TVars) => (await api.post<TRes>(path, vars)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: invalidateKey }),
  });
}

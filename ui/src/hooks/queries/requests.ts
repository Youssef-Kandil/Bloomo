'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

export interface ServiceRequest {
  id: string;
  type: string;
  status: string;
  note: string | null;
  createdAt: string;
  client: { id: string; name: string; lat: number; lng: number };
  assignments: Array<{ id: string; employee?: { user?: { name: string } } }>;
}

interface ListResponse {
  items: ServiceRequest[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const requestsKeys = {
  all: ['requests'] as const,
  list: (status?: string) => ['requests', 'list', status ?? 'all'] as const,
  detail: (id: string) => ['requests', 'detail', id] as const,
  ranking: (id: string) => ['requests', 'ranking', id] as const,
};

export function useRequests(status?: string) {
  return useQuery({
    queryKey: requestsKeys.list(status),
    queryFn: async (): Promise<ListResponse> => {
      const res = await api.get<ListResponse>('/api/requests', {
        params: status ? { status } : {},
      });
      return res.data;
    },
  });
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: requestsKeys.detail(id),
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get<{ request: ServiceRequest }>(`/api/requests/${id}`);
      return res.data.request;
    },
  });
}

export interface RankedCandidate {
  employeeId: string;
  name: string;
  avatar: string | null;
  distanceMeters: number | null;
  distanceDisplay: string;
  distancePoints: number;
  ratingBonus: number;
  usedCriterion: string;
  withinStartRadius: boolean;
  total: number;
  isFresh: boolean;
}

export function useRanking(requestId: string) {
  return useQuery({
    queryKey: requestsKeys.ranking(requestId),
    enabled: !!requestId,
    queryFn: async () => {
      const res = await api.get<{ candidates: RankedCandidate[] }>(
        `/api/ranking/requests/${requestId}`,
      );
      return res.data.candidates;
    },
  });
}

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { clientId?: string; type: string; note?: string }) => {
      const res = await api.post<{ request: ServiceRequest }>('/api/requests', vars);
      return res.data.request;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: requestsKeys.all }),
  });
}

export function useAssignRequest(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { employeeId: string; plannedStart: string; plannedEnd: string }) => {
      const res = await api.post(`/api/requests/${requestId}/assign`, vars);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: requestsKeys.all });
      qc.invalidateQueries({ queryKey: requestsKeys.detail(requestId) });
    },
  });
}

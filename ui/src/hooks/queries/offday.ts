'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

export type OffDayStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface OffDayRequest {
  id: string;
  employeeId: string;
  date: string;
  reason: string | null;
  status: OffDayStatus;
  decidedAt: string | null;
  createdAt: string;
  employee?: {
    user: { id: string; name: string; email: string };
    branch?: { id: string; name: string } | null;
  };
}

const MINE_KEY = ['off-day', 'mine'] as const;
const LIST_KEY = ['off-day', 'list'] as const;

export function useMyOffDayRequests() {
  return useQuery({
    queryKey: MINE_KEY,
    queryFn: async () =>
      (await api.get<{ requests: OffDayRequest[] }>('/api/off-day-requests/mine')).data.requests,
  });
}

export function useOffDayRequests(status?: OffDayStatus) {
  return useQuery({
    queryKey: [...LIST_KEY, status ?? 'ALL'] as const,
    queryFn: async () =>
      (
        await api.get<{ requests: OffDayRequest[] }>('/api/off-day-requests', {
          params: { status: status || undefined },
        })
      ).data.requests,
  });
}

export interface SubmitOffDayInput {
  date: string;
  reason?: string;
}

export function useSubmitOffDayRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitOffDayInput) =>
      (await api.post<{ request: OffDayRequest }>('/api/off-day-requests', input)).data.request,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MINE_KEY });
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useDecideOffDayRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      approve,
      rejectReason,
    }: {
      id: string;
      approve: boolean;
      rejectReason?: string;
    }) =>
      (
        await api.post<{ request: OffDayRequest }>(`/api/off-day-requests/${id}/decide`, {
          approve,
          rejectReason,
        })
      ).data.request,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: MINE_KEY });
    },
  });
}

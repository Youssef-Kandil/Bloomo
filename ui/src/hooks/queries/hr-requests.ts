'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

export type ReqStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface BaseRequest {
  id: string;
  employeeId: string;
  status: ReqStatus;
  reason: string | null;
  rejectReason?: string | null;
  decidedAt: string | null;
  createdAt: string;
  employee?: {
    user: { id: string; name: string; email: string };
    branch?: { id: string; name: string } | null;
  };
}

export interface OvertimeRequest extends BaseRequest {
  date: string;
  startAt: string;
  endAt: string;
}

export interface LeaveRequest extends BaseRequest {
  fromDate: string;
  toDate: string;
}

export interface SalaryAdvanceRequest extends BaseRequest {
  amount: number;
  appliedYear: number;
  appliedMonth: number;
  treasuryEntryId: string | null;
}

// ===== Overtime =====

const OT_MINE = ['overtime', 'mine'] as const;
const OT_LIST = ['overtime', 'list'] as const;

export function useMyOvertimeRequests() {
  return useQuery({
    queryKey: OT_MINE,
    queryFn: async () =>
      (await api.get<{ requests: OvertimeRequest[] }>('/api/overtime-requests/mine')).data
        .requests,
  });
}

export function useOvertimeRequests(status?: ReqStatus) {
  return useQuery({
    queryKey: [...OT_LIST, status ?? 'ALL'] as const,
    queryFn: async () =>
      (
        await api.get<{ requests: OvertimeRequest[] }>('/api/overtime-requests', {
          params: { status: status || undefined },
        })
      ).data.requests,
  });
}

export function useSubmitOvertime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { date: string; startAt: string; endAt: string; reason?: string }) =>
      (await api.post<{ request: OvertimeRequest }>('/api/overtime-requests', input)).data.request,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OT_MINE });
      qc.invalidateQueries({ queryKey: OT_LIST });
    },
  });
}

export function useDecideOvertime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; approve: boolean; rejectReason?: string }) =>
      (
        await api.post<{ request: OvertimeRequest }>(
          `/api/overtime-requests/${input.id}/decide`,
          input,
        )
      ).data.request,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OT_MINE });
      qc.invalidateQueries({ queryKey: OT_LIST });
    },
  });
}

// ===== Leave =====

const LV_MINE = ['leave', 'mine'] as const;
const LV_LIST = ['leave', 'list'] as const;

export function useMyLeaveRequests() {
  return useQuery({
    queryKey: LV_MINE,
    queryFn: async () =>
      (await api.get<{ requests: LeaveRequest[] }>('/api/leave-requests/mine')).data.requests,
  });
}

export function useLeaveRequests(status?: ReqStatus) {
  return useQuery({
    queryKey: [...LV_LIST, status ?? 'ALL'] as const,
    queryFn: async () =>
      (
        await api.get<{ requests: LeaveRequest[] }>('/api/leave-requests', {
          params: { status: status || undefined },
        })
      ).data.requests,
  });
}

export function useSubmitLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { fromDate: string; toDate: string; reason?: string }) =>
      (await api.post<{ request: LeaveRequest }>('/api/leave-requests', input)).data.request,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LV_MINE });
      qc.invalidateQueries({ queryKey: LV_LIST });
    },
  });
}

export function useDecideLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; approve: boolean; rejectReason?: string }) =>
      (
        await api.post<{ request: LeaveRequest }>(
          `/api/leave-requests/${input.id}/decide`,
          input,
        )
      ).data.request,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LV_MINE });
      qc.invalidateQueries({ queryKey: LV_LIST });
    },
  });
}

// ===== Salary advance =====

const SA_MINE = ['salary-advance', 'mine'] as const;
const SA_LIST = ['salary-advance', 'list'] as const;

export function useMySalaryAdvances() {
  return useQuery({
    queryKey: SA_MINE,
    queryFn: async () =>
      (await api.get<{ requests: SalaryAdvanceRequest[] }>('/api/salary-advances/mine')).data
        .requests,
  });
}

export function useSalaryAdvances(status?: ReqStatus) {
  return useQuery({
    queryKey: [...SA_LIST, status ?? 'ALL'] as const,
    queryFn: async () =>
      (
        await api.get<{ requests: SalaryAdvanceRequest[] }>('/api/salary-advances', {
          params: { status: status || undefined },
        })
      ).data.requests,
  });
}

export function useSubmitSalaryAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      amount: number;
      appliedYear: number;
      appliedMonth: number;
      reason?: string;
    }) =>
      (
        await api.post<{ request: SalaryAdvanceRequest }>('/api/salary-advances', input)
      ).data.request,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SA_MINE });
      qc.invalidateQueries({ queryKey: SA_LIST });
    },
  });
}

export function useDecideSalaryAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; approve: boolean; rejectReason?: string }) =>
      (
        await api.post<{ request: SalaryAdvanceRequest }>(
          `/api/salary-advances/${input.id}/decide`,
          input,
        )
      ).data.request,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SA_MINE });
      qc.invalidateQueries({ queryKey: SA_LIST });
      qc.invalidateQueries({ queryKey: ['treasury'] });
    },
  });
}

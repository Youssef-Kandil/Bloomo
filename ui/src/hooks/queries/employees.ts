'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

export interface Employee {
  id: string;
  name: string;
  email: string;
  active?: boolean;
  whatsappPhone?: string | null;
  createdAt?: string;
  employee?: {
    currentLat: number | null;
    currentLng: number | null;
    lastPingAt: string | null;
    branch?: { id: string; name: string } | null;
    branchId?: string | null;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    offDays?: number[];
    monthlySalary?: number;
    overtimeRateOverride?: number | null;
    offDayHourRateOverride?: number | null;
  };
}

interface EmployeeList {
  items: Employee[];
  total: number;
}

const LIST_KEY = ['users', 'employees'] as const;

export function useEmployees() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: async () => (await api.get<EmployeeList>('/api/users/employees')).data,
  });
}

export interface CreateEmployeeInput {
  name: string;
  email: string;
  password: string;
  whatsappPhone?: string;
  branchId?: string;
  checkInTime?: string;
  checkOutTime?: string;
  offDays?: number[];
  monthlySalary?: number;
  overtimeRateOverride?: number | null;
  offDayHourRateOverride?: number | null;
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEmployeeInput) =>
      (await api.post<{ user: Employee }>('/api/users/employees', input)).data.user,
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export interface UpdateEmployeeInput {
  id: string;
  name?: string;
  active?: boolean;
  branchId?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  offDays?: number[];
  monthlySalary?: number;
  overtimeRateOverride?: number | null;
  offDayHourRateOverride?: number | null;
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateEmployeeInput) =>
      (await api.patch<{ user: Employee }>(`/api/users/${id}`, body)).data.user,
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

/**
 * Backend has no DELETE endpoint — soft-delete by deactivating the user.
 * Deactivated users still appear in the list; filter client-side if needed.
 */
export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.patch<{ user: Employee }>(`/api/users/${id}`, { active: false })).data.user,
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

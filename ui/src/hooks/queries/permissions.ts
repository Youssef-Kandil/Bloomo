'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import type { ManagerPermission } from '@/lib/rbac';

export function useMyManagerPermissions(managerId: string | undefined, role: string | undefined) {
  return useQuery({
    queryKey: ['permissions', 'manager', managerId],
    enabled: !!managerId && role === 'MANAGER',
    queryFn: async (): Promise<ManagerPermission[]> => {
      const res = await api.get<{ permissions: ManagerPermission[] }>(
        `/api/permissions/manager/${managerId}`,
      );
      return res.data.permissions;
    },
  });
}

export function useManagerPermissions(managerId: string | undefined) {
  return useQuery({
    queryKey: ['permissions', 'manager', managerId],
    enabled: !!managerId,
    queryFn: async (): Promise<ManagerPermission[]> => {
      const res = await api.get<{ permissions: ManagerPermission[] }>(
        `/api/permissions/manager/${managerId}`,
      );
      return res.data.permissions;
    },
  });
}

export interface BulkPermissionInput {
  managerId: string;
  screens: Array<{
    screenKey: string;
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canAssign: boolean;
  }>;
}

export function useBulkUpdatePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BulkPermissionInput) => {
      await api.put('/api/permissions/bulk', input);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['permissions', 'manager', variables.managerId] });
    },
  });
}

export interface Manager {
  id: string;
  name: string;
  email: string;
  active?: boolean;
  whatsappPhone?: string | null;
  branchId?: string | null;
  branch?: { id: string; name: string } | null;
}

export function useManagers() {
  return useQuery({
    queryKey: ['users', 'managers'],
    queryFn: async () => {
      const res = await api.get<{ items: Manager[]; total: number }>('/api/users/managers');
      return res.data;
    },
  });
}

export interface CreateManagerInput {
  name: string;
  email: string;
  password: string;
  branchId?: string;
  whatsappPhone?: string;
}

export function useCreateManager() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateManagerInput) =>
      (await api.post<{ user: Manager }>('/api/users/managers', input)).data.user,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users', 'managers'] }),
  });
}

export interface UpdateManagerInput {
  id: string;
  name?: string;
  active?: boolean;
  branchId?: string | null;
  whatsappPhone?: string | null;
  password?: string;
}

export function useUpdateManager() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateManagerInput) =>
      (await api.patch<{ user: Manager }>(`/api/users/${id}`, patch)).data.user,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users', 'managers'] }),
  });
}

export function useDeleteManager() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/users/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users', 'managers'] }),
  });
}

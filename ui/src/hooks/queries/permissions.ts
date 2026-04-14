'use client';

import { useQuery } from '@tanstack/react-query';

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

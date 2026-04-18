'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

export type TaskStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'PENDING_APPROVAL'
  | 'COMPLETED'
  | 'CANCELED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskType =
  | 'COLLECTION'
  | 'SUPPLY'
  | 'INSTALL'
  | 'SUPPLY_INSTALL'
  | 'INSPECTION'
  | 'MAINTENANCE'
  | 'REPAIR'
  | 'OTHER';

export const TASK_TYPES: TaskType[] = [
  'COLLECTION',
  'SUPPLY',
  'INSTALL',
  'SUPPLY_INSTALL',
  'INSPECTION',
  'MAINTENANCE',
  'REPAIR',
  'OTHER',
];

export interface TaskUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  avatar?: string | null;
}

export interface TaskClient {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  createdAt: string;
  assignee: TaskUser;
  createdBy: TaskUser;
  client: TaskClient | null;
  collectionAmount: number | null;
  operationId: string | null;
  approvedAt: string | null;
}

interface TaskList {
  items: Task[];
  total: number;
}

const KEY = ['tasks'] as const;

export interface TaskFilters {
  status?: TaskStatus;
  assigneeId?: string;
  q?: string;
}

export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: [...KEY, filters] as const,
    queryFn: async () => {
      const res = await api.get<TaskList>('/api/tasks', {
        params: {
          status: filters.status,
          assigneeId: filters.assigneeId,
          q: filters.q?.trim() || undefined,
        },
      });
      return res.data;
    },
  });
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority: TaskPriority;
  type: TaskType;
  assigneeId: string;
  clientId?: string | null;
  collectionAmount?: number;
  plannedStart?: string | null;
  plannedEnd?: string | null;
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTaskInput) =>
      (await api.post<{ task: Task }>('/api/tasks', input)).data.task,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  type?: TaskType;
  status?: TaskStatus;
  assigneeId?: string;
  clientId?: string | null;
  collectionAmount?: number | null;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  actualStart?: string | null;
  actualEnd?: string | null;
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateTaskInput & { id: string }) =>
      (await api.patch<{ task: Task }>(`/api/tasks/${id}`, patch)).data.task,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/tasks/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useApproveCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.post<{ task: Task }>(`/api/tasks/${id}/approve-collection`)).data.task,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['supply'] });
      qc.invalidateQueries({ queryKey: ['treasury'] });
    },
  });
}

export function useRejectCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.post<{ task: Task }>(`/api/tasks/${id}/reject-collection`)).data.task,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useEmployeeCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.post<{ task: Task }>(`/api/tasks/${id}/complete`)).data.task,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Combined list of managers + employees for the assignee picker. */
export function useCompanyUsers() {
  return useQuery({
    queryKey: ['company-users'] as const,
    queryFn: async () => {
      const [emps, mgrs] = await Promise.all([
        api.get<{ items: TaskUser[] }>('/api/users/employees').catch(() => ({
          data: { items: [] as TaskUser[] },
        })),
        api.get<{ items: TaskUser[] }>('/api/users/managers').catch(() => ({
          data: { items: [] as TaskUser[] },
        })),
      ]);
      return [...(mgrs.data.items ?? []), ...(emps.data.items ?? [])];
    },
  });
}

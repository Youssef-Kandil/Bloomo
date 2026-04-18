'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

export interface Tool {
  id: string;
  name: string;
  code: string;
  qty: number;
}

interface ToolsResponse {
  tools: Tool[];
}

const KEY = ['tools'] as const;

export function useTools() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await api.get<ToolsResponse>('/api/tools')).data,
  });
}

export interface ToolInput {
  name: string;
  code: string;
  qty: number;
}

export function useCreateTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ToolInput) =>
      (await api.post<{ tool: Tool }>('/api/tools', input)).data.tool,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<ToolInput> & { id: string }) =>
      (await api.patch<{ tool: Tool }>(`/api/tools/${id}`, patch)).data.tool,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/tools/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export interface ToolCustody {
  id: string;
  qty: number;
  note: string | null;
  assignedAt: string;
  tool: { id: string; name: string; code: string };
  employee: { id: string; user: { name: string; email: string } };
}

interface CustodyResponse {
  custody: ToolCustody[];
}

const CUSTODY_KEY = ['tools', 'custody'] as const;

export function useToolCustody() {
  return useQuery({
    queryKey: CUSTODY_KEY,
    queryFn: async () => (await api.get<CustodyResponse>('/api/tools/custody')).data,
  });
}

export interface AssignCustodyInput {
  toolId: string;
  employeeId: string;
  qty: number;
  note?: string;
}

export function useAssignCustody() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AssignCustodyInput) =>
      (await api.post<{ assignment: ToolCustody }>('/api/tools/custody', input)).data.assignment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: CUSTODY_KEY });
    },
  });
}

export function useReturnCustody() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.post<{ assignment: ToolCustody }>(`/api/tools/custody/${id}/return`)).data
        .assignment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: CUSTODY_KEY });
    },
  });
}

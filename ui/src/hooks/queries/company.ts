'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

export interface Branch {
  id: string;
  name: string;
  address: string | null;
  lat?: number | null;
  lng?: number | null;
  phones?: string[];
}

export interface Company {
  id: string;
  name: string;
  branches: Branch[];
}

interface CompanyResponse {
  company: Company;
}

const COMPANY_KEY = ['company', 'me'] as const;

export function useCompany() {
  return useQuery({
    queryKey: COMPANY_KEY,
    queryFn: async () => (await api.get<CompanyResponse>('/api/companies/me')).data.company,
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: { name?: string }) =>
      (await api.patch<CompanyResponse>('/api/companies/me', patch)).data.company,
    onSuccess: () => qc.invalidateQueries({ queryKey: COMPANY_KEY }),
  });
}

export interface BranchInput {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  phones?: string[];
}

export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BranchInput) =>
      (await api.post<{ branch: Branch }>('/api/companies/me/branches', input)).data.branch,
    onSuccess: () => qc.invalidateQueries({ queryKey: COMPANY_KEY }),
  });
}

export function useUpdateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: BranchInput & { id: string }) =>
      (await api.patch<{ branch: Branch }>(`/api/companies/branches/${id}`, patch)).data.branch,
    onSuccess: () => qc.invalidateQueries({ queryKey: COMPANY_KEY }),
  });
}

export function useDeleteBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/companies/branches/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: COMPANY_KEY }),
  });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

export type SystemRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'CLIENT';
export type PlanKey = 'TRIAL' | 'BASIC' | 'PRO' | 'ENTERPRISE';
export type CycleKey = 'MONTHLY' | 'YEARLY';
export type SubscriptionStatusKey =
  | 'TRIALING'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'PENDING_ACTIVATION';

export interface CompanyRow {
  id: string;
  name: string;
  createdAt: string;
  owner: { id: string; email: string; name: string; bannedAt: string | null; active: boolean };
  subscription: {
    id: string;
    plan: PlanKey;
    billingCycle: CycleKey | null;
    status: SubscriptionStatusKey;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    customClientsLimit: number | null;
    customEmployeesLimit: number | null;
    customBranchesLimit: number | null;
  } | null;
  _count: { users: number; clients: number };
}

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: SystemRole;
  active: boolean;
  bannedAt: string | null;
  bannedReason: string | null;
  createdAt: string;
  companyId: string | null;
  company: { id: string; name: string } | null;
}

export interface PlanRow {
  id: string;
  key: PlanKey;
  name: string;
  tagline: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  clientsLimit: number;
  employeesLimit: number;
  branchesLimit: number;
  active: boolean;
  highlight: boolean;
  sortOrder: number;
}

export interface OfferRow {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discountPercent: number;
  validFrom: string;
  validUntil: string;
  active: boolean;
  appliesTo: PlanKey[];
  createdAt: string;
}

export interface SubscriptionRequestRow {
  id: string;
  companyId: string;
  plan: PlanKey;
  billingCycle: CycleKey;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  note: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'QUOTED';
  rejectReason: string | null;
  ownerMessage: string | null;
  customClientsLimit: number | null;
  customEmployeesLimit: number | null;
  customBranchesLimit: number | null;
  decidedAt: string | null;
  createdAt: string;
  company: { id: string; name: string } | null;
}

export const systemKeys = {
  overview: ['system', 'overview'] as const,
  companies: (search?: string, page = 1) => ['system', 'companies', search ?? '', page] as const,
  company: (id: string) => ['system', 'company', id] as const,
  users: (search?: string, role?: string, page = 1) =>
    ['system', 'users', search ?? '', role ?? '', page] as const,
  plans: ['system', 'plans'] as const,
  offers: ['system', 'offers'] as const,
  requests: ['system', 'requests'] as const,
};

export function useSystemOverview() {
  return useQuery({
    queryKey: systemKeys.overview,
    queryFn: async () => {
      const res = await api.get<{
        companies: number;
        users: number;
        activeSubscriptions: number;
        pendingRequests: number;
      }>('/api/system/overview');
      return res.data;
    },
  });
}

export function useSystemCompanies(search?: string, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: [...systemKeys.companies(search, page), pageSize],
    queryFn: async () => {
      const res = await api.get<{ items: CompanyRow[]; total: number; page: number; pageSize: number }>(
        '/api/system/companies',
        { params: { search, page, pageSize } },
      );
      return res.data;
    },
  });
}

export function useSystemCompany(id: string) {
  return useQuery({
    queryKey: systemKeys.company(id),
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get<{ company: CompanyRow }>(`/api/system/companies/${id}`);
      return res.data.company;
    },
  });
}

export interface PlanActivationPreview {
  currentPlan: {
    key: PlanKey;
    name: string;
    billingCycle: CycleKey | null;
    limits: { clients: number; employees: number; branches: number };
  };
  requestedPlan: {
    key: PlanKey;
    name: string;
    billingCycle: CycleKey;
    limits: { clients: number; employees: number; branches: number };
    price: number;
    currency: string;
  };
  usage: { clients: number; employees: number; branches: number };
  violations: Array<{ resource: 'clients' | 'employees' | 'branches'; used: number; limit: number }>;
  canApprove: boolean;
  hasCustomLimits: boolean;
}

export function useActivationPreview(
  companyId: string | null,
  plan: Exclude<PlanKey, 'TRIAL'> | null,
  billingCycle: CycleKey | null,
) {
  return useQuery({
    queryKey: ['system', 'companies', companyId, 'activation-preview', plan, billingCycle] as const,
    enabled: !!companyId && !!plan && !!billingCycle,
    queryFn: async () => {
      const res = await api.get<{ preview: PlanActivationPreview }>(
        `/api/system/companies/${companyId}/activation-preview`,
        { params: { plan, billingCycle } },
      );
      return res.data.preview;
    },
  });
}

export function useActivateCompanyPlan(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { plan: Exclude<PlanKey, 'TRIAL'>; billingCycle: CycleKey; durationDays?: number }) => {
      const res = await api.post(`/api/system/companies/${companyId}/activate-plan`, input);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system', 'companies'] });
      qc.invalidateQueries({ queryKey: systemKeys.company(companyId) });
    },
  });
}

export function useExtendCompany(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { days: number }) => {
      const res = await api.post(`/api/system/companies/${companyId}/extend`, input);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system', 'companies'] });
      qc.invalidateQueries({ queryKey: systemKeys.company(companyId) });
    },
  });
}

export function useSetCompanyLimits(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      customClientsLimit: number | null;
      customEmployeesLimit: number | null;
      customBranchesLimit: number | null;
    }) => {
      const res = await api.patch(`/api/system/companies/${companyId}/limits`, input);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system', 'companies'] });
      qc.invalidateQueries({ queryKey: systemKeys.company(companyId) });
    },
  });
}

export function useSystemUsers(search?: string, role?: string, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: [...systemKeys.users(search, role, page), pageSize],
    queryFn: async () => {
      const res = await api.get<{ items: UserRow[]; total: number; page: number; pageSize: number }>(
        '/api/system/users',
        { params: { search, role, page, pageSize } },
      );
      return res.data;
    },
  });
}

export function useBanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; reason?: string }) => {
      const res = await api.post(`/api/system/users/${input.id}/ban`, { reason: input.reason });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['system', 'users'] }),
  });
}

export function useUnbanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/api/system/users/${id}/unban`);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['system', 'users'] }),
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: async (input: { id: string; newPassword: string }) => {
      const res = await api.post(`/api/system/users/${input.id}/reset-password`, {
        newPassword: input.newPassword,
      });
      return res.data;
    },
  });
}

export function useSystemPlans() {
  return useQuery({
    queryKey: systemKeys.plans,
    queryFn: async () => {
      const res = await api.get<{ plans: PlanRow[] }>('/api/system/plans');
      return res.data.plans;
    },
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; data: Partial<PlanRow> }) => {
      const res = await api.patch(`/api/system/plans/${input.id}`, input.data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: systemKeys.plans });
      qc.invalidateQueries({ queryKey: ['subscription', 'plans'] });
    },
  });
}

export function useSystemOffers() {
  return useQuery({
    queryKey: systemKeys.offers,
    queryFn: async () => {
      const res = await api.get<{ offers: OfferRow[] }>('/api/system/offers');
      return res.data.offers;
    },
  });
}

export interface OfferInput {
  code: string;
  title: string;
  description?: string;
  discountPercent: number;
  validFrom: string;
  validUntil: string;
  active?: boolean;
  appliesTo?: PlanKey[];
}

export function useCreateOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: OfferInput) => {
      const res = await api.post('/api/system/offers', input);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: systemKeys.offers }),
  });
}

export function useUpdateOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; data: Partial<OfferInput> }) => {
      const res = await api.patch(`/api/system/offers/${input.id}`, input.data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: systemKeys.offers }),
  });
}

export function useDeleteOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/system/offers/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: systemKeys.offers }),
  });
}

export function useSystemRequests() {
  return useQuery({
    queryKey: systemKeys.requests,
    queryFn: async () => {
      const res = await api.get<{ requests: SubscriptionRequestRow[] }>('/api/system/requests');
      return res.data.requests;
    },
  });
}

export interface UpdateRequestInput {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'QUOTED';
  rejectReason?: string;
  ownerMessage?: string;
}

export function useUpdateRequestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateRequestInput) => {
      const { id, ...body } = input;
      const res = await api.patch(`/api/system/requests/${id}`, body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: systemKeys.requests });
      qc.invalidateQueries({ queryKey: ['subscription', 'current'] });
      qc.invalidateQueries({ queryKey: ['system', 'companies'] });
    },
  });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { tokenStore, userStore, type AuthUser } from '@/lib/auth';

export const authKeys = {
  me: ['auth', 'me'] as const,
};

export interface LoginVars {
  email: string;
  password: string;
}
export interface RegisterVars extends LoginVars {
  name: string;
  companyName: string;
}

interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

function persist(data: AuthResponse): AuthUser {
  tokenStore.set(data.accessToken);
  userStore.set(data.user);
  return data.user;
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: LoginVars) => {
      const res = await api.post<AuthResponse>('/auth/login', vars);
      return persist(res.data);
    },
    onSuccess: (user) => qc.setQueryData(authKeys.me, user),
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: RegisterVars) => {
      const res = await api.post<AuthResponse>('/auth/register', vars);
      return persist(res.data);
    },
    onSuccess: (user) => qc.setQueryData(authKeys.me, user),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      await api.post('/auth/forgot-password', { email });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        await api.post('/auth/logout');
      } finally {
        tokenStore.clear();
      }
    },
    onSuccess: () => qc.clear(),
  });
}

export function useMe() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: async (): Promise<AuthUser | null> => {
      const cached = userStore.get();
      if (!tokenStore.get()) return null;
      try {
        const res = await api.get<{ user: AuthUser }>('/auth/me');
        userStore.set(res.data.user);
        return res.data.user;
      } catch {
        return cached;
      }
    },
  });
}

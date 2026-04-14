import type { Role } from './rbac';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId: string | null;
  avatar: string | null;
}

const TOKEN_KEY = 'bloomo.access';
const USER_KEY = 'bloomo.user';

export const tokenStore = {
  get(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  set(token: string): void {
    window.localStorage.setItem(TOKEN_KEY, token);
  },
  clear(): void {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  },
};

export const userStore = {
  get(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },
  set(user: AuthUser): void {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
};

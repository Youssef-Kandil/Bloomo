import axios, { type AxiosError } from 'axios';

import { tokenStore, userStore, type AuthUser } from './auth';

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const api = axios.create({
  baseURL,
  withCredentials: true, // refresh cookie
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await axios.post(
        `${baseURL}/auth/refresh`,
        {},
        { withCredentials: true },
      );
      const accessToken = res.data?.accessToken as string | undefined;
      const user = res.data?.user as AuthUser | undefined;
      if (accessToken) tokenStore.set(accessToken);
      if (user) userStore.set(user);
      return accessToken ?? null;
    } catch {
      tokenStore.clear();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const cfg = err.config as (typeof err.config & { _retried?: boolean }) | undefined;
    if (err.response?.status === 401 && cfg && !cfg._retried) {
      cfg._retried = true;
      const newToken = await tryRefresh();
      if (newToken) {
        cfg.headers = cfg.headers ?? {};
        (cfg.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
        return api.request(cfg);
      }
    }
    throw err;
  },
);

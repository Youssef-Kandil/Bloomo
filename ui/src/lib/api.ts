import axios, { type AxiosError } from 'axios';

import { tokenStore, userStore, type AuthUser } from './auth';

/**
 * API origin resolution, in priority order:
 *   1. NEXT_PUBLIC_API_URL — explicit override (production, staging).
 *   2. Browser → empty string (same-origin). Backend is reached through the
 *      Next.js rewrites configured in next.config.mjs: the page at
 *      http(s)://<host>:3000 calls /auth/login → Next.js proxies to
 *      http://localhost:4000/auth/login. This is what makes the app work
 *      uniformly over localhost, LAN IPs, and dev HTTPS without CORS or
 *      mixed-content traps.
 *   3. SSR / build → http://localhost:4000 (the proxy isn't running there).
 */
const ENV_API_URL = process.env.NEXT_PUBLIC_API_URL;
const SSR_FALLBACK = 'http://localhost:4000';

let resolvedBaseURL: string | null = null;
function resolveBaseURL(): string {
  if (resolvedBaseURL !== null) return resolvedBaseURL;
  if (ENV_API_URL) {
    resolvedBaseURL = ENV_API_URL;
  } else if (typeof window === 'undefined') {
    resolvedBaseURL = SSR_FALLBACK;
  } else {
    resolvedBaseURL = ''; // same-origin, served via Next.js rewrites
  }
  return resolvedBaseURL;
}

export const api = axios.create({
  baseURL: ENV_API_URL ?? SSR_FALLBACK, // initial value, real one is patched per-request below
  withCredentials: true, // refresh cookie
});

// Per-request baseURL: in the browser we want it derived from
// window.location, but the axios instance is created at module init time
// (possibly during SSR). Patching here ensures every request uses the
// up-to-date origin without recreating the instance.
api.interceptors.request.use((config) => {
  config.baseURL = resolveBaseURL();
  return config;
});

/**
 * Turn a server-relative path (e.g. `/uploads/voice-notes/xyz.webm` returned
 * by the API) into an absolute URL that the browser will fetch from the API
 * server — without this, `<audio src="/uploads/...">` would resolve against
 * the Next.js frontend origin and 404.
 */
export function apiAssetUrl(pathOrUrl: string | null | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = resolveBaseURL().replace(/\/$/, '');
  return `${base}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

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
        `${resolveBaseURL()}/auth/refresh`,
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

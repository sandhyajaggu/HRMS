import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/lib/env';
import { mockAdapter } from './mock/adapter';

const TOKEN_KEY = 'ysk_hrms_tokens';
export interface Tokens { access_token: string; refresh_token: string }

export const tokenStore = {
  get(): Tokens | null {
    try { return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); } catch { return null; }
  },
  set(t: Tokens | null) {
    try { t ? localStorage.setItem(TOKEN_KEY, JSON.stringify(t)) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  },
};

export const http = axios.create({ baseURL: env.apiBase, timeout: 30000 });
if (env.useMock) http.defaults.adapter = mockAdapter;

http.interceptors.request.use((config) => {
  const t = tokenStore.get();
  if (t?.access_token) config.headers.Authorization = `Bearer ${t.access_token}`;
  return config;
});

// On 401, refresh the access token once and retry the original request.
let refreshing: Promise<string | null> | null = null;
http.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const t = tokenStore.get();
    if (error.response?.status === 401 && t?.refresh_token && original && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true;
      refreshing ??= http
        .post('/auth/refresh', { refresh_token: t.refresh_token })
        .then((r) => { tokenStore.set(r.data); return r.data.access_token as string; })
        .catch(() => { tokenStore.set(null); window.dispatchEvent(new Event('auth:logout')); return null; })
        .finally(() => { refreshing = null; });
      const newToken = await refreshing;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return http(original);
      }
    }
    return Promise.reject(error);
  },
);

export const apiError = (e: unknown): string => {
  const err = e as AxiosError<any>;
  const d = err?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  if (Array.isArray(d?.detail)) return d.detail.map((x: any) => x.msg).join(', ');
  return err?.message || 'Something went wrong';
};

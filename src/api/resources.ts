import { http } from './http';
import type { Paginated, Row } from '@/lib/types';

export interface ListParams {
  page?: number; page_size?: number; search?: string; sort?: string;
  [filter: string]: string | number | boolean | undefined;
}

/** Generic REST client for /{collection} and /{collection}/{id}, matching the FastAPI routers. */
export const resource = {
  list: <T = Row>(collection: string, params: ListParams = {}) =>
    http.get<Paginated<T>>(`/${collection}`, { params: clean(params) }).then((r) => r.data),
  all: <T = Row>(collection: string, params: ListParams = {}) =>
    http.get<Paginated<T>>(`/${collection}`, { params: clean({ sort: 'id', ...params, page_size: 1000 }) }).then((r) => r.data.items),
  get: <T = Row>(collection: string, id: number | string) => http.get<T>(`/${collection}/${id}`).then((r) => r.data),
  create: <T = Row>(collection: string, body: Partial<T>) => http.post<T>(`/${collection}`, body).then((r) => r.data),
  update: <T = Row>(collection: string, id: number | string, body: Partial<T>) =>
    http.patch<T>(`/${collection}/${id}`, body).then((r) => r.data),
  remove: (collection: string, id: number | string) => http.delete(`/${collection}/${id}`).then((r) => r.data),
  action: <T = any>(path: string, body?: unknown) => http.post<T>(path, body).then((r) => r.data),
  fetch: <T = any>(path: string, params?: Record<string, unknown>) => http.get<T>(path, { params }).then((r) => r.data),
};

function clean(p: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== '' && v !== null));
}

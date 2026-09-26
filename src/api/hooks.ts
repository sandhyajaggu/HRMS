import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { resource, type ListParams } from './resources';
import { apiError } from './http';
import type { Row } from '@/lib/types';

export const useList = <T = Row>(collection: string, params: ListParams = {}, enabled = true) =>
  useQuery({
    queryKey: [collection, 'list', params],
    queryFn: () => resource.list<T>(collection, params),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useAll = <T = Row>(collection: string, params: ListParams = {}, enabled = true) =>
  useQuery({ queryKey: [collection, 'all', params], queryFn: () => resource.all<T>(collection, params), enabled, staleTime: 30_000 });

export const useOne = <T = Row>(collection: string, id?: number | string) =>
  useQuery({ queryKey: [collection, 'one', String(id)], queryFn: () => resource.get<T>(collection, id!), enabled: !!id });

export const useFetch = <T = any>(path: string, params?: Record<string, unknown>, enabled = true) =>
  useQuery({ queryKey: [path, params], queryFn: () => resource.fetch<T>(path, params), enabled });

/** Writes invalidate all queries: simple, and keeps dashboards consistent. */
export function useSave(collection: string, opts: { success?: string; onDone?: (r: any) => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: any }) =>
      id ? resource.update(collection, id, data) : resource.create(collection, data),
    onSuccess: (r) => { qc.invalidateQueries(); toast.success(opts.success ?? 'Saved'); opts.onDone?.(r); },
    onError: (e) => toast.error(apiError(e)),
  });
}

export function useRemove(collection: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => resource.remove(collection, id),
    onSuccess: () => { qc.invalidateQueries(); toast.success('Deleted'); },
    onError: (e) => toast.error(apiError(e)),
  });
}

export function useAction<T = any>(path: string | ((v: any) => string), opts: { success?: string; onDone?: (r: T) => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body?: any) => resource.action<T>(typeof path === 'function' ? path(body) : path, body),
    onSuccess: (r) => { qc.invalidateQueries(); if (opts.success) toast.success(opts.success); opts.onDone?.(r); },
    onError: (e) => toast.error(apiError(e)),
  });
}

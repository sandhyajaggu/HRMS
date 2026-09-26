import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner, EmptyState } from './ui';

export interface Column<T = any> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
}

export function DataTable<T extends { id: number | string }>({
  columns, rows, loading, onRowClick, page, pageSize, total, onPage, sort, onSort, empty, dense, footer,
}: {
  columns: Column<T>[]; rows: T[]; loading?: boolean; onRowClick?: (r: T) => void; page?: number; pageSize?: number; total?: number; onPage?: (p: number) => void;
  sort?: string; onSort?: (s: string) => void; empty?: ReactNode; dense?: boolean; footer?: ReactNode;
}) {
  const pages = total && pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/60">
              {columns.map((c) => {
                const active = sort?.replace('-', '') === c.key;
                return (
                  <th key={c.key} className={cn('whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-slate-500', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.className)}>
                    {c.sortable && onSort ? (
                      <button className="inline-flex items-center gap-1 hover:text-slate-800" onClick={() => onSort(active && !sort?.startsWith('-') ? `-${c.key}` : c.key)}>
                        {c.header}{active && (sort?.startsWith('-') ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                      </button>
                    ) : c.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!loading && rows.map((r) => (
              <tr key={r.id} onClick={onRowClick ? () => onRowClick(r) : undefined} className={cn('transition-colors', onRowClick && 'cursor-pointer hover:bg-brand-50/40')}>
                {columns.map((c) => (
                  <td key={c.key} className={cn('whitespace-nowrap px-4 text-slate-700', dense ? 'py-2' : 'py-3', c.align === 'right' && 'text-right tabular-nums', c.align === 'center' && 'text-center', c.className)}>
                    {c.render ? c.render(r) : ((r as any)[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer}
        </table>
      </div>
      {loading && <Spinner />}
      {!loading && rows.length === 0 && (empty ?? <EmptyState title="No records found" text="Try changing the filters or add a new record." />)}
      {onPage && total !== undefined && total > (pageSize ?? 20) && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>{(page! - 1) * pageSize! + 1}–{Math.min(page! * pageSize!, total)} of {total}</span>
          <div className="flex items-center gap-1">
            <button className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-40" disabled={page! <= 1} onClick={() => onPage(page! - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
            <span className="px-2">Page {page} of {pages}</span>
            <button className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-40" disabled={page! >= pages} onClick={() => onPage(page! + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

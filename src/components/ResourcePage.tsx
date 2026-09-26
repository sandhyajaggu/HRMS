import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Download, Pencil, Trash2 } from 'lucide-react';
import { useList, useSave, useRemove } from '@/api/hooks';
import { resource } from '@/api/resources';
import { useAuth } from '@/auth/AuthContext';
import { DataTable, type Column } from './DataTable';
import { FormFields, toPayload, useEntityForm, type FieldDef, RefSelect } from './form';
import { Button, Card, Drawer, Input, PageHeader, Select, ConfirmDialog } from './ui';
import { downloadCSV, titleCase } from '@/lib/utils';
import type { RoleCode } from '@/lib/types';

export interface FilterDef { name: string; label: string; options?: string[]; ref?: { collection: string; label: string | ((r: any) => string); params?: Record<string, any> } }
export interface ResourceConfig {
  collection: string;
  title: string;
  singular?: string;
  subtitle?: string;
  columns: Column[];
  fields?: FieldDef[];
  filters?: FilterDef[];
  searchPlaceholder?: string;
  defaultSort?: string;
  rowLink?: (r: any) => string;
  editRoles?: RoleCode[];
  canDelete?: boolean;
  createLabel?: string;
  pageSize?: number;
  exportName?: string;
  /** override create; e.g. open a custom wizard */
  onCreate?: () => void;
  headerExtra?: ReactNode;
  drawerWidth?: string;
  transform?: (payload: any, isEdit: boolean) => any;
}

/** Full page: header + filters + table + create/edit drawer. */
export function ResourcePage({ config, fixed, embedded }: { config: ResourceConfig; fixed?: Record<string, any>; embedded?: boolean }) {
  const nav = useNavigate();
  const { hasRole } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sort, setSort] = useState(config.defaultSort ?? '');
  const [editing, setEditing] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<any | null>(null);
  const pageSize = config.pageSize ?? (embedded ? 10 : 20);
  const params = { page, page_size: pageSize, search, sort, ...filters, ...fixed };
  const { data, isLoading, isFetching } = useList(config.collection, params);
  const canEdit = !!config.fields && (!config.editRoles || hasRole(...config.editRoles));
  const del = useRemove(config.collection);

  const columns = useMemo<Column[]>(() => {
    const cols = config.columns.filter((c) => !fixed || !(c.key.replace(/_name$/, '_id') in fixed));
    if (!canEdit || config.rowLink) return cols;
    return [...cols, {
      key: '_actions', header: '', align: 'right', render: (r: any) => (
        <span className="inline-flex gap-1">
          <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600" onClick={(e) => { e.stopPropagation(); setEditing(r); }} aria-label="Edit"><Pencil className="h-4 w-4" /></button>
          {config.canDelete && <button className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={(e) => { e.stopPropagation(); setDeleting(r); }} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>}
        </span>
      ),
    }];
  }, [config, canEdit, fixed]);

  const exportCsv = async () => {
    const all = await resource.all(config.collection, { search, sort, ...filters, ...fixed });
    downloadCSV(config.exportName ?? config.collection, all, config.columns.filter((c) => c.key !== '_actions').map((c) => ({ key: c.key, label: typeof c.header === 'string' ? c.header : c.key })));
  };

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
      <div className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={config.searchPlaceholder ?? 'Search…'} className="pl-9" />
      </div>
      {config.filters?.map((f) => f.ref ? (
        <div key={f.name} className="w-full sm:w-52"><RefSelect collection={f.ref.collection} label={f.ref.label} params={f.ref.params} value={filters[f.name] ?? ''} placeholder={`All ${f.label.toLowerCase()}`}
          onChange={(v) => { setFilters((s) => ({ ...s, [f.name]: v ?? undefined })); setPage(1); }} /></div>
      ) : (
        <Select key={f.name} className="w-full sm:w-44" value={filters[f.name] ?? ''} placeholder={`All ${f.label.toLowerCase()}`}
          options={f.options!.map((o) => ({ value: o, label: titleCase(o) }))} onChange={(e) => { setFilters((s) => ({ ...s, [f.name]: e.target.value || undefined })); setPage(1); }} />
      ))}
      <div className="ml-auto flex items-center gap-2">
        {isFetching && !isLoading && <span className="text-xs text-slate-400">Updating…</span>}
        <Button variant="ghost" size="sm" icon={<Download className="h-4 w-4" />} onClick={exportCsv}>Export</Button>
        {embedded && canEdit && <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => (config.onCreate ? config.onCreate() : setEditing({}))}>{config.createLabel ?? 'Add'}</Button>}
      </div>
    </div>
  );

  const table = (
    <Card bodyClass="p-0">
      {toolbar}
      <DataTable columns={columns} rows={data?.items ?? []} loading={isLoading} page={page} pageSize={pageSize} total={data?.total} onPage={setPage}
        sort={sort} onSort={setSort} onRowClick={config.rowLink ? (r) => nav(config.rowLink!(r)) : canEdit ? (r) => setEditing(r) : undefined} />
    </Card>
  );

  return (
    <>
      {!embedded && (
        <PageHeader title={config.title} subtitle={config.subtitle ?? (data ? `${data.total} records` : undefined)}
          actions={<>{config.headerExtra}{canEdit && <Button icon={<Plus className="h-4 w-4" />} onClick={() => (config.onCreate ? config.onCreate() : setEditing({}))}>{config.createLabel ?? `New ${(config.singular ?? config.title).toLowerCase()}`}</Button>}</>} />
      )}
      {table}
      {editing && config.fields && <ResourceForm config={config} record={editing.id ? editing : null} fixed={fixed} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} danger title="Delete record" confirmLabel="Delete" loading={del.isPending}
        text="This cannot be undone." onConfirm={() => del.mutate(deleting.id, { onSuccess: () => setDeleting(null) })} />
    </>
  );
}

export function ResourceForm({ config, record, fixed, onClose, onSaved }: { config: ResourceConfig; record: any | null; fixed?: Record<string, any>; onClose: () => void; onSaved?: (r: any) => void }) {
  const fields = (config.fields ?? []).filter((f) => !fixed || !(f.name in fixed));
  const form = useEntityForm(config.fields ?? [], record, fixed);
  const save = useSave(config.collection, { success: record ? 'Changes saved' : `${config.singular ?? 'Record'} created`, onDone: (r) => { onSaved?.(r); onClose(); } });
  const submit = form.handleSubmit((v) => {
    let payload = { ...toPayload(config.fields ?? [], v), ...fixed };
    if (config.transform) payload = config.transform(payload, !!record);
    save.mutate({ id: record?.id, data: payload });
  });
  return (
    <Drawer open onClose={onClose} width={config.drawerWidth} title={record ? `Edit ${(config.singular ?? 'record').toLowerCase()}` : `New ${(config.singular ?? 'record').toLowerCase()}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={save.isPending}>{record ? 'Save changes' : 'Create'}</Button></>}>
      <form onSubmit={submit}><FormFields fields={fields} form={form} /></form>
    </Drawer>
  );
}

import { useMemo, useRef, useState } from 'react';
import { Upload, Lock, Send, CheckCheck, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useFetch, useAll, useAction } from '@/api/hooks';
import { Button, Card, Modal, PageHeader, Select, Spinner, StatusBadge, Badge, EmptyState } from '@/components/ui';
import { cn, formatDate, formatMonth, monthStart, parseCSV, downloadCSV } from '@/lib/utils';
import { useAuth } from '@/auth/AuthContext';

const CODES: Record<string, { short: string; cls: string; label: string }> = {
  PRESENT: { short: 'P', cls: 'bg-emerald-100 text-emerald-700', label: 'Present' },
  ABSENT: { short: 'A', cls: 'bg-rose-100 text-rose-700', label: 'Absent' },
  HALF_DAY: { short: 'HD', cls: 'bg-amber-100 text-amber-700', label: 'Half day' },
  LEAVE: { short: 'L', cls: 'bg-violet-100 text-violet-700', label: 'Leave' },
  WEEKLY_OFF: { short: 'WO', cls: 'bg-slate-100 text-slate-500', label: 'Weekly off' },
  HOLIDAY: { short: 'H', cls: 'bg-blue-100 text-blue-700', label: 'Holiday' },
  ON_DUTY: { short: 'OD', cls: 'bg-teal-100 text-teal-700', label: 'On duty' },
};
const CYCLE = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'WEEKLY_OFF', 'HOLIDAY'];

export default function Attendance() {
  const { hasRole } = useAuth();
  const { data: clients = [] } = useAll('clients');
  const [client, setClient] = useState('');
  const [month, setMonth] = useState(monthStart().slice(0, 7));
  const clientId = client || (clients[0]?.id ? String(clients[0].id) : '');
  const { data, isLoading } = useFetch<any>('/attendance/grid', { client_id: clientId, month }, !!clientId);
  const [pending, setPending] = useState<Record<string, string>>({});
  const [importOpen, setImportOpen] = useState(false);
  const bulk = useAction('/attendance/bulk', { success: 'Attendance saved', onDone: () => setPending({}) });
  const transition = useAction((v: any) => `/attendance_periods/${v.id}/${v.action}`, { success: 'Attendance status updated' });
  const locked = data?.period?.status === 'LOCKED';
  const canEdit = hasRole('OPS_MANAGER', 'HR_OPS') && !locked;

  const cellValue = (empId: number, day: string, cur?: string) => pending[`${empId}|${day}`] ?? cur;
  const onCell = (empId: number, day: string, cur?: string) => {
    if (!canEdit) return;
    const now = cellValue(empId, day, cur);
    const next = CYCLE[(CYCLE.indexOf(now ?? '') + 1) % CYCLE.length];
    setPending((p) => ({ ...p, [`${empId}|${day}`]: next }));
  };
  const savePending = () => bulk.mutate({ source: 'MANUAL', rows: Object.entries(pending).map(([k, status]) => { const [employee_id, attendance_date] = k.split('|'); return { employee_id: Number(employee_id), attendance_date, status }; }) });

  const totals = useMemo(() => {
    const rows = data?.rows ?? [];
    return { staff: rows.length, paid: rows.reduce((s: number, r: any) => s + r.summary.paid_days, 0), ot: rows.reduce((s: number, r: any) => s + r.summary.ot_hours, 0) };
  }, [data]);

  return (
    <>
      <PageHeader title="Attendance" subtitle="Daily attendance per client site. Lock the month before running payroll and invoicing."
        actions={<div className="flex flex-wrap gap-2">
          <Select className="w-56" value={clientId} onChange={(e) => setClient(e.target.value)} options={clients.map((c: any) => ({ value: c.id, label: c.legal_name }))} />
          <input type="month" className="h-9 rounded-lg border border-slate-300 px-3 text-sm" value={month} onChange={(e) => setMonth(e.target.value)} />
          <Button variant="secondary" icon={<Upload className="h-4 w-4" />} onClick={() => setImportOpen(true)} disabled={locked}>Import</Button>
          {Object.keys(pending).length > 0 && <Button icon={<Save className="h-4 w-4" />} loading={bulk.isPending} onClick={savePending}>Save {Object.keys(pending).length} change(s)</Button>}
        </div>} />

      {data?.period && (
        <Card className="mb-5" bodyClass="flex flex-wrap items-center gap-3 p-4">
          <span className="text-sm text-slate-600">Period status for {formatMonth(month + '-01')}:</span>
          <StatusBadge value={data.period.status} />
          {data.period.status === 'OPEN' && hasRole('HR_OPS', 'OPS_MANAGER') && <Button size="sm" variant="secondary" icon={<Send className="h-4 w-4" />} onClick={() => transition.mutate({ id: data.period.id, action: 'submit' })}>Submit to client</Button>}
          {data.period.status === 'SUBMITTED' && <Button size="sm" variant="secondary" icon={<CheckCheck className="h-4 w-4" />} onClick={() => transition.mutate({ id: data.period.id, action: 'approve' })}>Mark client approved</Button>}
          {data.period.status === 'APPROVED' && hasRole('OPS_MANAGER') && <Button size="sm" icon={<Lock className="h-4 w-4" />} onClick={() => transition.mutate({ id: data.period.id, action: 'lock' })}>Lock period</Button>}
          <span className="ml-auto flex flex-wrap gap-3 text-xs text-slate-500">
            <span>{totals.staff} staff</span><span>{totals.paid} paid days</span><span>{totals.ot.toFixed(1)} OT hours</span>
          </span>
        </Card>
      )}

      <Card bodyClass="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-xs">
          {Object.entries(CODES).map(([k, v]) => <span key={k} className="flex items-center gap-1.5"><span className={cn('rounded px-1.5 py-0.5 font-semibold', v.cls)}>{v.short}</span>{v.label}</span>)}
          {canEdit && <span className="ml-auto text-slate-400">Click a cell to change status</span>}
        </div>
        {isLoading ? <Spinner /> : !data?.rows?.length ? <EmptyState title="No deployments for this client and month" /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-600">Employee</th>
                  {data.days.map((d: string) => (
                    <th key={d} className={cn('border-b border-slate-200 bg-slate-50 px-1 py-2 text-center font-medium text-slate-500', new Date(d).getDay() === 0 && 'bg-slate-100')}>
                      <div>{d.slice(-2)}</div><div className="text-[10px] font-normal text-slate-400">{formatDate(d, 'EEEEE')}</div>
                    </th>
                  ))}
                  <th className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-center font-semibold text-slate-600">Paid</th>
                  <th className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-center font-semibold text-slate-600">OT</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r: any) => (
                  <tr key={r.deployment_id} className="hover:bg-slate-50/60">
                    <td className="sticky left-0 z-10 whitespace-nowrap border-b border-slate-100 bg-white px-3 py-1.5">
                      <div className="font-medium text-slate-800">{r.name}</div>
                      <div className="text-[11px] text-slate-400">{r.employee_code} · {r.designation}</div>
                    </td>
                    {data.days.map((d: string) => {
                      const v = cellValue(r.employee_id, d, r.cells[d]?.status);
                      const c = v ? CODES[v] : null;
                      const changed = pending[`${r.employee_id}|${d}`];
                      return (
                        <td key={d} className="border-b border-slate-100 px-0.5 py-1 text-center">
                          <button disabled={!canEdit} onClick={() => onCell(r.employee_id, d, r.cells[d]?.status)}
                            className={cn('h-6 w-7 rounded text-[10px] font-semibold', c ? c.cls : 'bg-slate-50 text-slate-300', changed && 'ring-2 ring-brand-500', canEdit && 'hover:opacity-80')}>
                            {c ? c.short : '·'}
                          </button>
                        </td>
                      );
                    })}
                    <td className="border-b border-slate-100 px-2 text-center font-semibold text-slate-700">{r.summary.paid_days}</td>
                    <td className="border-b border-slate-100 px-2 text-center text-slate-600">{r.summary.ot_hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} rows={data?.rows ?? []} month={month} />}
    </>
  );
}

function ImportModal({ onClose, rows, month }: { onClose: () => void; rows: any[]; month: string }) {
  const [parsed, setParsed] = useState<any[] | null>(null);
  const [result, setResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bulk = useAction('/attendance/bulk', { onDone: (r: any) => setResult(r) });
  const template = () => downloadCSV(`attendance_${month}`, rows.flatMap((r: any) => [{ employee_code: r.employee_code, attendance_date: `${month}-01`, status: 'P', ot_minutes: 0 }]),
    [{ key: 'employee_code', label: 'employee_code' }, { key: 'attendance_date', label: 'attendance_date' }, { key: 'status', label: 'status' }, { key: 'ot_minutes', label: 'ot_minutes' }]);
  const onFile = async (f: File) => {
    const text = await f.text();
    const rows2 = parseCSV(text);
    if (!rows2.length) return toast.error('No rows found in the file');
    setParsed(rows2);
  };
  return (
    <Modal open onClose={onClose} size="lg" title="Import attendance"
      footer={<><Button variant="secondary" onClick={onClose}>Close</Button>
        <Button disabled={!parsed} loading={bulk.isPending} onClick={() => bulk.mutate({ source: 'CLIENT_EXCEL', rows: parsed })}>Import {parsed?.length ?? 0} rows</Button></>}>
      <p className="text-sm text-slate-600">Upload the client's attendance sheet as CSV with columns <code className="rounded bg-slate-100 px-1">employee_code, attendance_date, status, ot_minutes</code>.
        Status accepts P, A, HD, L, WO, H or the full words.</p>
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" size="sm" onClick={template}>Download template</Button>
        <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>Choose CSV file</Button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </div>
      {parsed && !result && (
        <div className="mt-4 max-h-60 overflow-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50"><tr>{Object.keys(parsed[0]).map((k) => <th key={k} className="px-3 py-2 text-left font-semibold text-slate-500">{k}</th>)}</tr></thead>
            <tbody>{parsed.slice(0, 20).map((r, i) => <tr key={i} className="border-t border-slate-100">{Object.values(r).map((v: any, j) => <td key={j} className="px-3 py-1.5">{v}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
      {result && (
        <div className="mt-4 space-y-3">
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{result.success} rows imported successfully.</p>
          {result.errors?.length > 0 && (
            <div className="rounded-lg border border-rose-200">
              <p className="border-b border-rose-100 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">{result.errors.length} rows rejected</p>
              <ul className="max-h-48 overflow-auto divide-y divide-slate-100 text-xs">
                {result.errors.map((e: any, i: number) => <li key={i} className="px-3 py-1.5"><Badge color="red">Row {e.row}</Badge> <span className="ml-2 text-slate-600">{e.message}</span></li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

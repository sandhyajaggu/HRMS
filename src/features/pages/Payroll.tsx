import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calculator, Send, BadgeIndianRupee, Plus, Printer } from 'lucide-react';
import { useList, useOne, useAction, useAll, useSave, useFetch } from '@/api/hooks';
import { Button, Card, DetailGrid, EmptyState, Field, Modal, PageHeader, Select, Spinner, StatusBadge, Badge } from '@/components/ui';
import { DataTable } from '@/components/DataTable';
import { formatDate, formatINR, formatMonth, monthStart, titleCase } from '@/lib/utils';
import { useAuth } from '@/auth/AuthContext';

export function PayrollRuns() {
  const { data, isLoading } = useList('payroll_runs', { page_size: 50, sort: '-period_month' });
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHeader title="Payroll runs" subtitle="One run per client per month. The attendance period must be locked before a run can be computed."
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>New payroll run</Button>} />
      <Card bodyClass="p-0">
        <DataTable loading={isLoading} rows={data?.items ?? []} columns={[
          { key: 'run_no', header: 'Run', render: (r: any) => <Link className="font-medium text-brand-600 hover:underline" to={`/payroll/${r.id}`}>{r.run_no}</Link> },
          { key: 'period_month', header: 'Month', render: (r: any) => formatMonth(r.period_month) },
          { key: 'client_name', header: 'Client', render: (r: any) => r.client_name ?? 'Internal staff' },
          { key: 'run_type', header: 'Type', render: (r: any) => titleCase(r.run_type) },
          { key: 'employee_count', header: 'Employees', align: 'right' },
          { key: 'total_gross', header: 'Gross', align: 'right', render: (r: any) => formatINR(r.total_gross) },
          { key: 'total_deductions', header: 'Deductions', align: 'right', render: (r: any) => formatINR(r.total_deductions) },
          { key: 'total_net', header: 'Net pay', align: 'right', render: (r: any) => <span className="font-semibold">{formatINR(r.total_net)}</span> },
          { key: 'status', header: 'Status', render: (r: any) => <StatusBadge value={r.status} /> },
        ]} onRowClick={(r: any) => (window.location.hash ? null : null)} />
      </Card>
      {open && <NewRunModal onClose={() => setOpen(false)} />}
    </>
  );
}

function NewRunModal({ onClose }: { onClose: () => void }) {
  const { data: clients = [] } = useAll('clients');
  const [client, setClient] = useState('');
  const [month, setMonth] = useState(monthStart(new Date(new Date().setMonth(new Date().getMonth() - 1))).slice(0, 7));
  const save = useSave('payroll_runs', { success: 'Payroll run created', onDone: (r) => { onClose(); window.location.assign(`${window.location.pathname}#/payroll/${r.id}`); } });
  return (
    <Modal open onClose={onClose} size="sm" title="New payroll run"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={save.isPending} disabled={!client} onClick={() => save.mutate({ data: { client_id: Number(client), period_month: `${month}-01`, run_type: 'REGULAR', branch_id: 1, status: 'DRAFT' } })}>Create run</Button></>}>
      <div className="space-y-4">
        <Field label="Client" required><Select value={client} onChange={(e) => setClient(e.target.value)} placeholder="Select client" options={clients.map((c: any) => ({ value: c.id, label: c.legal_name }))} /></Field>
        <Field label="Month" required><input type="month" className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm" value={month} onChange={(e) => setMonth(e.target.value)} /></Field>
        <p className="text-xs text-slate-500">After creating the run, compute it to generate payslips from locked attendance.</p>
      </div>
    </Modal>
  );
}

export function PayrollRunDetail() {
  const { id } = useParams();
  const rid = Number(id);
  const { data: run, isLoading } = useOne('payroll_runs', rid);
  const { data: slips } = useList('payslips', { payroll_run_id: rid, page_size: 200 });
  const compute = useAction(`/payroll_runs/${rid}/compute`, { success: 'Payroll computed' });
  const submit = useAction(`/payroll_runs/${rid}/submit`, { success: 'Sent for approval' });
  const markPaid = useAction(`/payroll_runs/${rid}/mark-paid`, { success: 'Marked as paid' });
  const { hasRole } = useAuth();
  if (isLoading || !run) return <Spinner />;
  return (
    <>
      <PageHeader back={<Link to="/payroll" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" />All payroll runs</Link>}
        title={`${run.run_no} · ${run.client_name ?? 'Internal staff'}`} subtitle={<span className="flex items-center gap-2">{formatMonth(run.period_month)} · {titleCase(run.run_type)} <StatusBadge value={run.status} /></span>}
        actions={<div className="flex gap-2">
          {['DRAFT', 'COMPUTED'].includes(run.status) && <Button variant="secondary" icon={<Calculator className="h-4 w-4" />} loading={compute.isPending} onClick={() => compute.mutate(undefined)}>{run.status === 'DRAFT' ? 'Compute payroll' : 'Recompute'}</Button>}
          {run.status === 'COMPUTED' && <Button icon={<Send className="h-4 w-4" />} loading={submit.isPending} onClick={() => submit.mutate(undefined)}>Send for approval</Button>}
          {run.status === 'APPROVED' && hasRole('MD', 'OPS_MANAGER') && <Button icon={<BadgeIndianRupee className="h-4 w-4" />} loading={markPaid.isPending} onClick={() => markPaid.mutate(undefined)}>Mark as paid</Button>}
        </div>} />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[['Employees', run.employee_count], ['Gross', formatINR(run.total_gross)], ['Deductions', formatINR(run.total_deductions)],
          ['Net payable', formatINR(run.total_net)], ['Employer PF + ESI', formatINR(run.total_employer_contribution)]].map(([l, v]: any) => (
          <Card key={l} bodyClass="p-4"><p className="text-xs text-slate-500">{l}</p><p className="mt-1 text-xl font-bold text-slate-900">{v}</p></Card>
        ))}
      </div>
      <Card title="Payslips" bodyClass="p-0">
        <DataTable rows={slips?.items ?? []} empty={<EmptyState title="No payslips yet" text="Compute the run to generate payslips from locked attendance." />}
          columns={[{ key: 'employee_code', header: 'Code' }, { key: 'employee_name', header: 'Employee' },
            { key: 'paid_days', header: 'Paid days', align: 'right' }, { key: 'lop_days', header: 'LOP', align: 'right' }, { key: 'ot_hours', header: 'OT h', align: 'right' },
            { key: 'gross_earnings', header: 'Gross', align: 'right', render: (p: any) => formatINR(p.gross_earnings) },
            { key: 'pf_wages', header: 'PF wages', align: 'right', render: (p: any) => formatINR(p.pf_wages) },
            { key: 'total_deductions', header: 'Deductions', align: 'right', render: (p: any) => formatINR(p.total_deductions) },
            { key: 'net_pay', header: 'Net pay', align: 'right', render: (p: any) => <span className="font-semibold">{formatINR(p.net_pay)}</span> },
            { key: 'status', header: 'Status', render: (p: any) => <StatusBadge value={p.status} /> },
            { key: 'view', header: '', align: 'right', render: (p: any) => <Link to={`/payslips/${p.id}`} className="text-brand-600 hover:underline">Payslip</Link> }]} />
      </Card>
    </>
  );
}

export function PayslipView() {
  const { id } = useParams();
  const { data: p, isLoading } = useFetch<any>(`/payslips/${id}/detail`);
  if (isLoading || !p) return <Spinner />;
  const earnings = p.lines.filter((l: any) => l.component_type === 'EARNING');
  const deductions = p.lines.filter((l: any) => l.component_type === 'DEDUCTION');
  const employer = p.lines.filter((l: any) => l.component_type === 'EMPLOYER');
  return (
    <>
      <PageHeader back={<Link to="/payroll" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" />Back</Link>}
        title={`Payslip · ${formatMonth(p.period_month)}`} subtitle={`${p.employee.full_name} (${p.employee_code})`}
        actions={<Button variant="secondary" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Print</Button>} />
      <Card className="mx-auto max-w-4xl">
        <div className="mb-6 border-b border-slate-200 pb-4">
          <h2 className="text-lg font-bold text-slate-900">YSK Infotech Pvt Ltd</h2>
          <p className="text-sm text-slate-500">Payslip for {formatMonth(p.period_month)}</p>
        </div>
        <DetailGrid items={[['Employee', p.employee.full_name], ['Employee code', p.employee_code], ['Designation', p.designation_name], ['Client / site', p.client_name],
          ['Date of joining', formatDate(p.employee.date_of_joining)], ['UAN', p.employee.uan], ['ESIC IP', p.employee.esic_ip_number],
          ['Bank', p.bank ? `${p.bank.bank_name} ••••${p.bank.account_last4}` : '—'], ['Paid days', `${p.paid_days} of ${p.month_days}`], ['LOP days', p.lop_days],
          ['Overtime hours', p.ot_hours], ['Status', <StatusBadge value={p.status} />]]} />
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Earnings</h3>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {earnings.map((l: any) => <tr key={l.id}><td className="py-2 text-slate-600">{l.name}<span className="block text-xs text-slate-400">{l.calc_note}</span></td><td className="py-2 text-right tabular-nums">{formatINR(l.amount, true)}</td></tr>)}
                <tr className="font-semibold"><td className="py-2">Gross earnings</td><td className="py-2 text-right tabular-nums">{formatINR(p.gross_earnings, true)}</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Deductions</h3>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {deductions.map((l: any) => <tr key={l.id}><td className="py-2 text-slate-600">{l.name}<span className="block text-xs text-slate-400">{l.calc_note}</span></td><td className="py-2 text-right tabular-nums">{formatINR(l.amount, true)}</td></tr>)}
                <tr className="font-semibold"><td className="py-2">Total deductions</td><td className="py-2 text-right tabular-nums">{formatINR(p.total_deductions, true)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between rounded-lg bg-emerald-50 px-5 py-4">
          <span className="font-semibold text-emerald-900">Net pay</span>
          <span className="text-2xl font-bold text-emerald-900">{formatINR(p.net_pay, true)}</span>
        </div>
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Employer contributions (not deducted from salary)</h3>
          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
            {employer.map((l: any) => <Badge key={l.id} color="slate">{l.name}: {formatINR(l.amount, true)}</Badge>)}
            <Badge color="slate">PF wages: {formatINR(p.pf_wages)}</Badge><Badge color="slate">ESI wages: {formatINR(p.esi_wages)}</Badge>
          </div>
        </div>
        <p className="mt-6 text-xs text-slate-400">Computer-generated payslip. Statutory rates are configurable in Master data → Statutory settings.</p>
      </Card>
    </>
  );
}

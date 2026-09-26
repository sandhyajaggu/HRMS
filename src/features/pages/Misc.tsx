import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw, Play, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useOne, useList, useAction, useSave, useFetch, useAll } from '@/api/hooks';
import { resource } from '@/api/resources';
import { Button, Card, ConfirmDialog, DetailGrid, EmptyState, Field, Input, PageHeader, Select, Spinner, StatusBadge, Tabs, Badge } from '@/components/ui';
import { DataTable } from '@/components/DataTable';
import { ResourcePage } from '@/components/ResourcePage';
import { MASTERS, usersConfig } from '../configs';
import { downloadCSV, formatDate, formatINR, formatMonth, monthStart, titleCase } from '@/lib/utils';
import { useAuth } from '@/auth/AuthContext';
import { env } from '@/lib/env';

// ------------------------------------------------------------------ exit & F&F
export function ExitDetail() {
  const { id } = useParams();
  const xid = Number(id);
  const { data: x, isLoading } = useOne('employee_exits', xid);
  const { data: clr } = useList('exit_clearances', { exit_id: xid, page_size: 20 });
  const { data: fnfList } = useList('fnf_settlements', { exit_id: xid });
  const { data: draft } = useFetch<any>(`/employee_exits/${xid}/fnf-draft`, undefined, !fnfList?.items.length);
  const saveClr = useSave('exit_clearances');
  const saveFnf = useSave('fnf_settlements', { success: 'F&F saved' });
  const complete = useAction(`/employee_exits/${xid}/complete`, { success: 'Exit completed' });
  const fnf = fnfList?.items?.[0];
  const [form, setForm] = useState<any>(null);
  if (isLoading || !x) return <Spinner />;
  const values = form ?? fnf ?? draft ?? {};
  const net = ['pending_salary', 'leave_encashment', 'bonus', 'gratuity', 'other_earnings'].reduce((s, k) => s + Number(values[k] || 0), 0)
    - ['notice_recovery', 'advance_recovery', 'asset_recovery', 'other_deductions'].reduce((s, k) => s + Number(values[k] || 0), 0);
  const field = (k: string, label: string) => (
    <Field key={k} label={label}><Input type="number" value={values[k] ?? 0} onChange={(e) => setForm({ ...values, [k]: Number(e.target.value) })} /></Field>
  );
  return (
    <>
      <PageHeader back={<Link to="/exits" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" />All exits</Link>}
        title={`Exit · ${x.employee_name}`} subtitle={<span className="flex items-center gap-2">{titleCase(x.exit_type)} · last working day {formatDate(x.last_working_date)} <StatusBadge value={x.status} /></span>}
        actions={<Button disabled={x.status === 'COMPLETED'} loading={complete.isPending} onClick={() => complete.mutate(undefined)}>Complete exit</Button>} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Clearances" bodyClass="p-0">
          <DataTable rows={clr?.items ?? []} columns={[
            { key: 'department', header: 'Department', render: (c: any) => titleCase(c.department) },
            { key: 'status', header: 'Status', render: (c: any) => <StatusBadge value={c.status} /> },
            { key: 'dues_amount', header: 'Dues', align: 'right', render: (c: any) => formatINR(c.dues_amount) },
            { key: 'act', header: '', align: 'right', render: (c: any) => c.status === 'PENDING'
              ? <Button size="sm" variant="secondary" onClick={() => saveClr.mutate({ id: c.id, data: { status: 'CLEARED', cleared_at: new Date().toISOString() } })}>Mark cleared</Button> : '—' }]} />
        </Card>
        <Card title="Full & final settlement" action={fnf ? <StatusBadge value={fnf.status} /> : <Badge color="slate">Draft</Badge>}>
          <div className="grid gap-4 sm:grid-cols-2">
            {[['pending_salary', 'Pending salary'], ['leave_encashment', 'Leave encashment'], ['bonus', 'Bonus'], ['gratuity', 'Gratuity'], ['other_earnings', 'Other earnings']].map(([k, l]) => field(k, l))}
            {[['notice_recovery', 'Notice shortfall recovery'], ['advance_recovery', 'Advance recovery'], ['asset_recovery', 'Asset recovery'], ['other_deductions', 'Other deductions']].map(([k, l]) => field(k, l))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
            <span className="font-semibold text-emerald-900">Net payable</span><span className="text-xl font-bold text-emerald-900">{formatINR(net)}</span>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" loading={saveFnf.isPending} onClick={() => saveFnf.mutate({ id: fnf?.id, data: { ...values, exit_id: xid, employee_id: x.employee_id, status: 'DRAFT' } })}>Save draft</Button>
            <Button onClick={() => saveFnf.mutate({ id: fnf?.id, data: { ...values, exit_id: xid, employee_id: x.employee_id, status: 'PAID', paid_on: new Date().toISOString().slice(0, 10) } })}>Mark paid</Button>
          </div>
        </Card>
      </div>
      <Card className="mt-5" title="Exit details">
        <DetailGrid items={[['Employee', x.employee_name], ['Employee code', x.employee_code], ['Exit type', titleCase(x.exit_type)], ['Notice date', formatDate(x.notice_date)],
          ['Last working day', formatDate(x.last_working_date)], ['Notice period', `${x.notice_period_days ?? 0} days`], ['Shortfall', `${x.notice_shortfall_days ?? 0} days`],
          ['Eligible for rehire', x.rehire_eligible ? 'Yes' : 'No'], ['Reason', x.reason]]} />
      </Card>
    </>
  );
}

// ------------------------------------------------------------------ PF / ESI returns
export function ComplianceReturns() {
  const [tab, setTab] = useState('pf');
  const { data: pf } = useList('pf_returns', { page_size: 24, sort: '-period_month' });
  const { data: esi } = useList('esi_returns', { page_size: 24, sort: '-period_month' });
  const { data: pfLines } = useList('pf_return_lines', { page_size: 500 });
  const exportEcr = (ret: any) => {
    const lines = (pfLines?.items ?? []).filter((l: any) => l.pf_return_id === ret.id);
    if (!lines.length) return toast.error('No member lines for this return');
    downloadCSV(`ECR_${formatMonth(ret.period_month).replace(' ', '_')}`, lines, [{ key: 'uan', label: 'UAN' }, { key: 'employee_name', label: 'Member name' },
      { key: 'gross_wages', label: 'Gross wages' }, { key: 'epf_wages', label: 'EPF wages' }, { key: 'eps_wages', label: 'EPS wages' }, { key: 'edli_wages', label: 'EDLI wages' },
      { key: 'ee_share', label: 'EE share' }, { key: 'er_epf_share', label: 'ER EPF' }, { key: 'er_eps_share', label: 'ER EPS' }, { key: 'ncp_days', label: 'NCP days' }]);
  };
  return (
    <>
      <PageHeader title="PF & ESI returns" subtitle="Monthly contribution returns per establishment. Export the ECR file and record the challan." />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'pf', label: 'PF (ECR)' }, { key: 'esi', label: 'ESI' }]} />
      {tab === 'pf' ? (
        <Card bodyClass="p-0">
          <DataTable rows={pf?.items ?? []} empty={<EmptyState title="No PF returns yet" />} columns={[
            { key: 'period_month', header: 'Month', render: (r: any) => formatMonth(r.period_month) }, { key: 'member_count', header: 'Members', align: 'right' },
            { key: 'total_epf_wages', header: 'EPF wages', align: 'right', render: (r: any) => formatINR(r.total_epf_wages) },
            { key: 'total_ee_share', header: 'EE share', align: 'right', render: (r: any) => formatINR(r.total_ee_share) },
            { key: 'total_er_epf', header: 'ER EPF', align: 'right', render: (r: any) => formatINR(r.total_er_epf) },
            { key: 'total_er_eps', header: 'ER EPS', align: 'right', render: (r: any) => formatINR(r.total_er_eps) },
            { key: 'challan_amount', header: 'Challan', align: 'right', render: (r: any) => formatINR(r.challan_amount) },
            { key: 'due_date', header: 'Due', render: (r: any) => formatDate(r.due_date) }, { key: 'status', header: 'Status', render: (r: any) => <StatusBadge value={r.status} /> },
            { key: 'ecr', header: '', align: 'right', render: (r: any) => <Button size="sm" variant="secondary" icon={<Download className="h-3.5 w-3.5" />} onClick={() => exportEcr(r)}>ECR file</Button> }]} />
        </Card>
      ) : (
        <Card bodyClass="p-0">
          <DataTable rows={esi?.items ?? []} empty={<EmptyState title="No ESI returns yet" />} columns={[
            { key: 'period_month', header: 'Month', render: (r: any) => formatMonth(r.period_month) }, { key: 'ip_count', header: 'IPs', align: 'right' },
            { key: 'total_wages', header: 'Wages', align: 'right', render: (r: any) => formatINR(r.total_wages) },
            { key: 'total_ee_contribution', header: 'EE contribution', align: 'right', render: (r: any) => formatINR(r.total_ee_contribution) },
            { key: 'total_er_contribution', header: 'ER contribution', align: 'right', render: (r: any) => formatINR(r.total_er_contribution) },
            { key: 'due_date', header: 'Due', render: (r: any) => formatDate(r.due_date) }, { key: 'status', header: 'Status', render: (r: any) => <StatusBadge value={r.status} /> }]} />
        </Card>
      )}
    </>
  );
}

// ------------------------------------------------------------------ reports hub
const REPORTS = [
  { code: 'recruitment_mis', name: 'Recruitment MIS', desc: 'Requisition-wise funnel: sourced, interviewed, selected, joined.' },
  { code: 'attendance_summary', name: 'Attendance summary', desc: 'Employee-wise P / A / HD / L counts and paid days for a month.' },
  { code: 'payroll_register', name: 'Payroll register', desc: 'Gross, statutory deductions and net pay for each payslip.' },
  { code: 'pf_register', name: 'PF register (ECR)', desc: 'UAN-wise EPF, EPS and EDLI wages with NCP days.' },
  { code: 'esi_register', name: 'ESI register', desc: 'IP-wise wages and contributions.' },
  { code: 'billing_register', name: 'Billing register', desc: 'Invoice-wise taxable value, CGST, SGST, IGST and totals.' },
  { code: 'receivables_aging', name: 'Receivables aging', desc: 'Open invoices with age in days.' },
  { code: 'headcount', name: 'Headcount', desc: 'Deployed headcount by client, site and designation.' },
  { code: 'recruiter_performance', name: 'Recruiter performance', desc: 'Sourced, interviews, selected, joined and joining ratio.' },
  { code: 'exits', name: 'Exits', desc: 'Exits with type, last working day and settlement status.' },
];

export function Reports() {
  const [code, setCode] = useState('recruitment_mis');
  const [client, setClient] = useState('');
  const [month, setMonth] = useState(monthStart(new Date(new Date().setMonth(new Date().getMonth() - 1))).slice(0, 7));
  const { data: clients = [] } = useAll('clients');
  const { data, isLoading } = useFetch<any>(`/reports/${code}`, { client_id: client || undefined, month: `${month}-01` });
  const meta = REPORTS.find((r) => r.code === code)!;
  return (
    <>
      <PageHeader title="Reports & MIS" subtitle="Run a report, filter it, and export to CSV for Excel." />
      <div className="grid gap-5 lg:grid-cols-4">
        <Card title="Reports" className="lg:col-span-1" bodyClass="p-2">
          <ul className="space-y-0.5">
            {REPORTS.map((r) => (
              <li key={r.code}>
                <button onClick={() => setCode(r.code)} className={`w-full rounded-lg px-3 py-2 text-left text-sm ${code === r.code ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}>{r.name}</button>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="lg:col-span-3" title={meta.name} bodyClass="p-0"
          action={<Button size="sm" variant="secondary" icon={<Download className="h-4 w-4" />} disabled={!data?.rows?.length}
            onClick={() => downloadCSV(code, data.rows, data.columns)}>Export CSV</Button>}>
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
            <p className="mr-auto text-sm text-slate-500">{meta.desc}</p>
            <Select className="w-52" value={client} placeholder="All clients" onChange={(e) => setClient(e.target.value)} options={clients.map((c: any) => ({ value: c.id, label: c.legal_name }))} />
            <Input type="month" className="w-40" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          {isLoading ? <Spinner /> : (
            <DataTable dense rows={(data?.rows ?? []).map((r: any, i: number) => ({ ...r, id: i }))}
              columns={(data?.columns ?? []).map((c: any) => ({ key: c.key, header: c.label, align: (data.money ?? []).includes(c.key) ? 'right' : undefined,
                render: (data.money ?? []).includes(c.key) ? (row: any) => formatINR(row[c.key]) : undefined }))} />
          )}
        </Card>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ admin
export function AdminUsers() {
  const [tab, setTab] = useState('users');
  const { data: matrix } = useFetch<any>('/roles/matrix');
  const grant = useAction((v: any) => `/roles/${v.role_id}/permissions`, { success: 'Permissions updated' });
  return (
    <>
      <PageHeader title="Users & roles" subtitle="Who can sign in, which portal they see, and what each role is allowed to do." />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'users', label: 'Users' }, { key: 'roles', label: 'Role permissions' }]} />
      {tab === 'users' ? <ResourcePage config={usersConfig} /> : (
        <Card bodyClass="p-0">
          {!matrix ? <Spinner /> : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Permission</th>
                  {matrix.roles.map((r: any) => <th key={r.id} className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500">{r.name}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {matrix.permissions.map((p: any) => (
                    <tr key={p.id}>
                      <td className="px-4 py-2 font-mono text-xs text-slate-700">{p.code}</td>
                      {matrix.roles.map((r: any) => {
                        const on = matrix.grants.some((g: any) => g.role_id === r.id && g.permission_id === p.id);
                        return (
                          <td key={r.id} className="px-3 py-2 text-center">
                            <input type="checkbox" checked={on} className="h-4 w-4 rounded border-slate-300 text-brand-600"
                              onChange={() => {
                                const ids = matrix.grants.filter((g: any) => g.role_id === r.id).map((g: any) => g.permission_id);
                                grant.mutate({ role_id: r.id, permission_ids: on ? ids.filter((x: number) => x !== p.id) : [...ids, p.id] });
                              }} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </>
  );
}

export function MasterData() {
  const keys = Object.keys(MASTERS);
  const [tab, setTab] = useState(keys[0]);
  return (
    <>
      <PageHeader title="Master data" subtitle="Lookups and statutory parameters used across the system." />
      <Tabs value={tab} onChange={setTab} tabs={keys.map((k) => ({ key: k, label: MASTERS[k].title }))} />
      <ResourcePage config={MASTERS[tab]} />
    </>
  );
}

export function SettingsPage() {
  const { user, activeRole } = useAuth();
  const { data: settings } = useList('system_settings', { page_size: 50 });
  const { data: branch } = useOne('branches', 1);
  const reset = useAction('/admin/reset-demo', { success: 'Demo data reset' });
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <PageHeader title="Settings" subtitle="Company details, statutory registrations and application preferences." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Organisation">
          {branch && <DetailGrid cols={2} items={[['Branch', branch.name], ['GSTIN', branch.gstin], ['PF establishment code', branch.pf_establishment_code],
            ['ESI employer code', branch.esi_employer_code], ['PT registration', branch.pt_registration_no], ['Address', branch.address]]} />}
        </Card>
        <Card title="Your account">
          <DetailGrid cols={2} items={[['Name', user?.full_name], ['Email', user?.email], ['Active portal', activeRole], ['Roles', user?.roles.join(', ')]]} />
        </Card>
        <Card title="Application settings">
          <ul className="divide-y divide-slate-100 text-sm">
            {(settings?.items ?? []).map((s: any) => (
              <li key={s.id} className="flex justify-between py-2"><span className="text-slate-600">{titleCase(s.setting_key)}</span><span className="font-medium text-slate-800">{String(s.setting_value)}</span></li>
            ))}
          </ul>
        </Card>
        <Card title="Demo data">
          <p className="text-sm text-slate-600">
            {env.useMock
              ? 'This build runs on the bundled mock backend. All changes are stored in your browser only. Reset to restore the original sample data.'
              : 'This build is connected to the FastAPI backend. Demo reset is disabled.'}
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} disabled={!env.useMock} onClick={() => setConfirm(true)}>Reset demo data</Button>
            <Button variant="ghost" icon={<ShieldCheck className="h-4 w-4" />} onClick={() => toast.message('Statutory rates live in Master data → Statutory settings')}>Statutory rates</Button>
          </div>
        </Card>
      </div>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} danger title="Reset demo data" confirmLabel="Reset"
        text="All changes you made in this browser will be discarded and the sample data restored."
        onConfirm={() => { reset.mutate(undefined, { onSuccess: () => { setConfirm(false); window.location.reload(); } }); }} />
    </>
  );
}

// ------------------------------------------------------------------ offers detail (light)
export function OfferDetail() {
  const { id } = useParams();
  const { data: o, isLoading } = useOne('offers', Number(id));
  const convert = useAction((v: any) => `/offers/${v.id}/convert`, { success: 'Onboarding started' });
  const save = useSave('offers');
  if (isLoading || !o) return <Spinner />;
  return (
    <>
      <PageHeader back={<Link to="/offers" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" />All offers</Link>}
        title={`${o.offer_no} · ${o.candidate_name}`} subtitle={<span className="flex items-center gap-2">{o.position_name} · {o.client_name} <StatusBadge value={o.status} /></span>}
        actions={<div className="flex gap-2">
          {o.status === 'DRAFT' && <Button onClick={() => save.mutate({ id: o.id, data: { status: 'RELEASED', released_at: new Date().toISOString() } })}>Release offer</Button>}
          {o.status === 'RELEASED' && <><Button variant="secondary" onClick={() => save.mutate({ id: o.id, data: { status: 'DECLINED', responded_at: new Date().toISOString() } })}>Mark declined</Button>
            <Button onClick={() => save.mutate({ id: o.id, data: { status: 'ACCEPTED', responded_at: new Date().toISOString() } })}>Mark accepted</Button></>}
          {o.status === 'ACCEPTED' && <Button icon={<Play className="h-4 w-4" />} loading={convert.isPending} onClick={() => convert.mutate({ id: o.id })}>Start onboarding</Button>}
        </div>} />
      <Card title="Offer details">
        <DetailGrid items={[['Candidate', o.candidate_name], ['Position', o.position_name], ['Client', o.client_name], ['Gross monthly', formatINR(o.gross_monthly)],
          ['CTC monthly', formatINR(o.ctc_monthly)], ['Joining date', formatDate(o.joining_date)], ['Released at', formatDate(o.released_at)], ['Responded at', formatDate(o.responded_at)]]} />
      </Card>
    </>
  );
}

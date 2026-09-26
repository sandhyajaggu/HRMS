import { Link } from 'react-router-dom';
import {
  Building2, Users, UserPlus, IndianRupee, Wallet, TrendingUp, CalendarCheck, UserX, CalendarDays, ClipboardList, Briefcase, CalendarClock,
  FileSignature, BarChart3, Percent, FileText, Receipt, Hourglass, AlertOctagon, FileMinus, MapPin, UserCheck, FileStack, Clock,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useFetch } from '@/api/hooks';
import { KpiCard, KpiGrid } from '@/components/KpiCard';
import { Card, Spinner, StatusBadge, Badge, Button } from '@/components/ui';
import { Donut, Bars, ComboTrend, AreaTrend, Funnel, Gauge, LineTrend, PALETTE } from '@/components/charts';
import { ActivityFeed, AlertList, Greeting, MiniTable, PriorityBadge, QuickActions, StatRow, ViewAll } from './widgets';
import { QUICK, ROLE_LABEL } from '@/config/navigation';
import type { RoleCode } from '@/lib/types';
import { formatDate, formatDateTime, formatINR, formatINRShort, formatMonth, formatNum } from '@/lib/utils';

export default function Dashboard() {
  const { activeRole, user } = useAuth();
  const { data, isLoading } = useFetch<any>(`/dashboard/${(activeRole ?? 'md').toLowerCase()}`);
  if (isLoading || !data) return <Spinner />;
  const first = user!.full_name.split(' ')[0];
  const common = { d: data, name: first, role: activeRole! };
  switch (activeRole) {
    case 'MD': return <MD {...common} />;
    case 'OPS_MANAGER': return <Ops {...common} />;
    case 'REC_MANAGER': return <RecManager {...common} />;
    case 'RECRUITER': return <Recruiter {...common} />;
    case 'HR_OPS': return <HrOps {...common} />;
    default: return <Accounts {...common} />;
  }
}
type P = { d: any; name: string; role: RoleCode };

function MD({ d, name, role }: P) {
  const k = d.kpis;
  return (
    <>
      <Greeting name={name} role={ROLE_LABEL[role]} text="Here's what's happening across the business today." />
      <KpiGrid>
        <KpiCard icon={<Building2 />} tone="violet" label="Total clients" value={k.total_clients} sub={`Active: ${k.active_clients}`} to="/clients" />
        <KpiCard icon={<Users />} tone="green" label="Total employees" value={formatNum(k.total_employees)} sub={`Deployed: ${k.deployed}`} to="/employees" />
        <KpiCard icon={<UserPlus />} tone="orange" label="Joined this month" value={k.joined_this_month} sub={`Onboarding: ${k.onboarding}`} to="/onboarding" />
        <KpiCard icon={<IndianRupee />} tone="blue" label="Monthly billing" value={formatINRShort(k.monthly_billing)} sub="Latest invoiced month" to="/invoices" />
        <KpiCard icon={<Hourglass />} tone="red" label="Outstanding" value={formatINRShort(k.outstanding)} sub={`From ${k.outstanding_clients} clients`} to="/receivables" />
        <KpiCard icon={<TrendingUp />} tone="indigo" label="Revenue (taxable)" value={formatINRShort(k.revenue_taxable)} sub="Excluding GST" to="/reports" />
      </KpiGrid>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Employees overview" action={<ViewAll to="/employees" />}>
          <Donut data={d.employee_status} center={formatNum(d.employee_status.reduce((s: number, x: any) => s + x.value, 0))} centerLabel="Total"
            colors={['#22C55E', '#06B6D4', '#F59E0B', '#94A3B8']} height={190} />
        </Card>
        <Card title="Recruitment by industry" action={<ViewAll to="/requisitions" />}>
          <Bars data={d.recruitment_by_industry} keys={[{ key: 'open', label: 'Open positions' }, { key: 'in_progress', label: 'In progress' }, { key: 'filled', label: 'Filled' }]} height={220} labels />
        </Card>
        <Card title="Billing overview" action={<ViewAll to="/invoices" />}>
          <AreaTrend data={d.billing_trend} dataKey="invoiced" xKey="month" valueFormat={(v) => formatINRShort(v)} height={220} />
        </Card>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card title="Top clients by deployment" action={<ViewAll to="/clients" />}>
          <MiniTable head={['Client', 'Employees']} rows={d.top_clients.map((c: any) => [<span className="font-medium">{c.name}</span>, formatNum(c.value)])} />
        </Card>
        <Card title={`Payroll summary (${formatMonth(d.payroll_summary.month)})`} action={<ViewAll to="/payroll" />}>
          <dl className="space-y-2.5 text-sm">
            {[['Total gross', d.payroll_summary.total_gross], ['PF (employer)', d.payroll_summary.employer_pf], ['ESI (employer)', d.payroll_summary.employer_esi], ['Total deductions', d.payroll_summary.total_deductions]].map(([l, v]: any) => (
              <div key={l} className="flex justify-between"><dt className="text-slate-600">{l}</dt><dd className="font-medium tabular-nums text-slate-800">{formatINR(v)}</dd></div>
            ))}
            <div className="flex justify-between rounded-lg bg-emerald-50 px-3 py-2"><dt className="font-semibold text-emerald-800">Net payroll</dt><dd className="font-bold tabular-nums text-emerald-800">{formatINR(d.payroll_summary.total_net)}</dd></div>
          </dl>
        </Card>
        <Card title="Collections overview" action={<ViewAll to="/receivables" />}>
          <Donut data={[{ name: 'Collected', value: d.collections.collected }, { name: 'Pending', value: d.collections.pending }]} colors={['#22C55E', '#F59E0B']}
            center={formatINRShort(d.collections.total)} centerLabel="Invoiced" valueFormat={(v) => formatINRShort(v)} height={190} />
        </Card>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card title="Important alerts" className="lg:col-span-1"><AlertList alerts={d.alerts} /></Card>
        <Card title="Recent activity" className="lg:col-span-2"><ActivityFeed items={d.recent} /></Card>
      </div>
      <div className="mt-5"><QuickActions actions={QUICK.MD} /></div>
    </>
  );
}

function Ops({ d, name, role }: P) {
  const k = d.kpis;
  return (
    <>
      <Greeting name={name} role={ROLE_LABEL[role]} text={`Attendance shown for ${formatDate(d.attendance_date)}.`} />
      <KpiGrid cols={4}>
        <KpiCard icon={<Users />} tone="blue" label="Total employees" value={formatNum(k.total_employees)} sub={`Deployed: ${k.deployed}`} to="/employees" />
        <KpiCard icon={<CalendarCheck />} tone="green" label="Present" value={formatNum(k.present)} sub={`${k.attendance_pct}% attendance`} to="/attendance" />
        <KpiCard icon={<UserX />} tone="red" label="Absent" value={k.absent} to="/attendance" />
        <KpiCard icon={<CalendarDays />} tone="orange" label="On leave" value={k.on_leave} to="/leave" />
        <KpiCard icon={<Building2 />} tone="indigo" label="Active clients" value={k.active_clients} sub={`Total: ${k.total_clients}`} to="/clients" />
        <KpiCard icon={<Wallet />} tone="violet" label="Payroll pending" value={k.pending_payroll} sub="Runs to process" to="/payroll" />
        <KpiCard icon={<AlertOctagon />} tone="red" label="Compliance alerts" value={k.compliance_alerts} sub="Action required" to="/compliance" />
      </KpiGrid>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Attendance overview" action={<ViewAll to="/attendance" />}>
          <Donut data={d.attendance_today} colors={['#22C55E', '#EF4444', '#F59E0B']} center={formatNum(k.deployed)} centerLabel="Deployed" height={190} />
        </Card>
        <Card title="Deployment by client" action={<ViewAll to="/deployments" />}>
          <Bars data={d.deployment_by_client} keys={[{ key: 'value', label: 'Employees' }]} xKey="short" horizontal height={220} labels />
        </Card>
        <Card title="Shift summary" action={<ViewAll to="/shifts" />}>
          <Donut data={d.shift_summary} colors={PALETTE} center={formatNum(d.shift_summary.reduce((s: number, x: any) => s + x.value, 0))} centerLabel="Assigned" height={190} />
        </Card>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card title="Payroll status" action={<ViewAll to="/payroll" />}>
          <Donut data={d.payroll_status} colors={['#22C55E', '#F59E0B', '#8B5CF6']} center={formatNum(k.deployed)} centerLabel="Employees" height={190} />
        </Card>
        <Card title="Compliance overview" action={<ViewAll to="/compliance" />}>
          <MiniTable head={['Item', 'Total', 'Pending']} rows={d.compliance.map((c: any) => [c.name, formatNum(c.total), <span className={c.pending ? 'font-semibold text-rose-600' : 'text-emerald-600'}>{c.pending}</span>])} />
        </Card>
        <Card title="Invoices & collections" action={<ViewAll to="/invoices" />}>
          <div className="grid grid-cols-2 gap-3">
            {[['Invoiced this month', d.invoices.generated_this_month], ['Collected this month', d.invoices.received_this_month], ['Outstanding', d.invoices.outstanding]].map(([l, v]: any) => (
              <div key={l} className="rounded-xl border border-slate-200 p-3"><p className="text-xs text-slate-500">{l}</p><p className="mt-1 text-lg font-bold tabular-nums text-slate-800">{formatINRShort(v)}</p></div>
            ))}
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3"><p className="text-xs text-rose-600">Overdue invoices</p><p className="mt-1 text-lg font-bold text-rose-700">{d.invoices.overdue_count}</p></div>
          </div>
        </Card>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Pending approvals" action={<ViewAll to="/approvals" />}>
          <MiniTable head={['Type', 'Details', 'Requested by', '']} empty="No approvals pending"
            rows={d.approvals.map((a: any) => [<Badge color="amber">{a.entity_type.replace('_', ' ')}</Badge>, <span className="max-w-xs truncate">{a.summary}</span>, a.requested_by_name,
              <Link to="/approvals" className="text-brand-600 hover:underline">Review</Link>])} />
        </Card>
        <Card title="Recent activity"><ActivityFeed items={d.recent} /></Card>
      </div>
      <div className="mt-5"><QuickActions actions={QUICK.OPS_MANAGER} /></div>
    </>
  );
}

function RecManager({ d, name, role }: P) {
  const k = d.kpis;
  return (
    <>
      <Greeting name={name} role={ROLE_LABEL[role]} text="Here's what's happening with recruitment today." />
      <KpiGrid>
        <KpiCard icon={<ClipboardList />} tone="blue" label="Total requirements" value={k.total_requirements} sub={`Open: ${k.open_requirements} · Closed: ${k.closed_requirements}`} to="/requisitions" />
        <KpiCard icon={<Users />} tone="green" label="Total candidates" value={formatNum(k.candidates_total)} sub={`Active: ${k.candidates_active}`} to="/candidates" />
        <KpiCard icon={<CalendarClock />} tone="orange" label="Interviews scheduled" value={k.interviews_scheduled} sub={`Today: ${k.interviews_today} · Week: ${k.interviews_week}`} to="/interviews" />
        <KpiCard icon={<FileSignature />} tone="violet" label="Offers released" value={k.offers_released} sub={`Pending: ${k.offers_pending} · Joined: ${k.offers_joined}`} to="/offers" />
        <KpiCard icon={<UserPlus />} tone="teal" label="Joined this month" value={k.joined_this_month} sub={`Target: ${k.joining_target}`} to="/offers" />
        <KpiCard icon={<Percent />} tone="pink" label="Joining ratio" value={`${k.joining_ratio}%`} sub="Selected vs joined" to="/reports" />
      </KpiGrid>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Requirements overview" action={<ViewAll to="/requisitions" />}>
          <Donut data={d.requirement_status} center={k.total_requirements} centerLabel="Total" colors={['#2F6FEB', '#F59E0B', '#8B5CF6', '#22C55E']} height={190} />
        </Card>
        <Card title="Open requirements by client"><Bars data={d.open_by_client.slice(0, 5)} keys={[{ key: 'value', label: 'Open' }]} horizontal height={220} labels /></Card>
        <Card title="Recruitment funnel" action={<ViewAll to="/reports" />}><Funnel data={d.funnel} /></Card>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card title="Interviews overview" action={<ViewAll to="/interviews" />}>
          <StatRow items={[{ label: 'Scheduled', value: d.interviews_overview.scheduled, tone: 'text-blue-600' }, { label: 'Completed', value: d.interviews_overview.completed, tone: 'text-emerald-600' },
            { label: 'Pending', value: d.interviews_overview.pending, tone: 'text-amber-600' }, { label: 'Cancelled', value: d.interviews_overview.cancelled, tone: 'text-rose-600' }]} />
        </Card>
        <Card title="Recruiter performance" action={<ViewAll to="/reports" />} className="lg:col-span-1">
          <MiniTable head={['Recruiter', 'Sourced', 'Selected', 'Joined', '%']} rows={d.recruiter_performance.slice(0, 5).map((r: any) => [r.name, r.sourced, r.selected, r.joined, `${r.joining_pct}%`])} />
        </Card>
        <Card title="Joining trend"><LineTrend data={d.joining_trend} keys={[{ key: 'value', label: 'Joined' }]} height={220} /></Card>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Upcoming interviews" action={<ViewAll to="/interviews" />}>
          <MiniTable head={['When', 'Candidate', 'Client', 'Position']} empty="No interviews scheduled"
            rows={d.upcoming_interviews.map((i: any) => [formatDateTime(i.scheduled_at), i.candidate_name, i.client_name, i.position_name])} />
        </Card>
        <Card title="Recent activity"><ActivityFeed items={d.recent} /></Card>
      </div>
      <div className="mt-5"><QuickActions actions={QUICK.REC_MANAGER} /></div>
    </>
  );
}

function Recruiter({ d, name, role }: P) {
  const k = d.kpis;
  return (
    <>
      <Greeting name={name} role={ROLE_LABEL[role]} text="Here's what's happening with your recruitment activities today." />
      <KpiGrid>
        <KpiCard icon={<Briefcase />} tone="blue" label="My open requirements" value={k.open_requirements} sub={`Total positions: ${k.total_positions}`} to="/requisitions" />
        <KpiCard icon={<Users />} tone="green" label="Candidates sourced" value={k.sourced_this_month} sub="This month" to="/candidates" />
        <KpiCard icon={<CalendarClock />} tone="orange" label="Interviews scheduled" value={k.interviews_scheduled} sub={`Today: ${k.interviews_today}`} to="/interviews" />
        <KpiCard icon={<FileSignature />} tone="violet" label="Offers released" value={k.offers_released} sub={`Pending: ${k.offers_pending}`} to="/offers" />
        <KpiCard icon={<UserPlus />} tone="teal" label="Joined this month" value={k.joined_this_month} sub={`Target: ${k.joining_target}`} to="/pipeline" />
        <KpiCard icon={<Percent />} tone="pink" label="Joining ratio" value={`${k.joining_ratio}%`} sub="Selected vs joined" />
      </KpiGrid>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="My requirements" action={<ViewAll to="/requisitions" />}>
          <Donut data={d.requirement_status} center={k.total_requirements} centerLabel="Total" colors={['#2F6FEB', '#F59E0B', '#8B5CF6', '#22C55E']} height={190} />
        </Card>
        <Card title="Candidate status" action={<ViewAll to="/pipeline" />}><Funnel data={d.funnel} /></Card>
        <Card title="My performance">
          <Gauge value={Math.min(100, (k.joined_this_month / Math.max(1, k.joining_target)) * 100)} label="of joining target" />
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
            <div><p className="text-sm font-semibold text-slate-800">{k.sourced_this_month}/{k.sourcing_target}</p>Sourced</div>
            <div><p className="text-sm font-semibold text-slate-800">{k.interviews_scheduled}</p>Interviews</div>
            <div><p className="text-sm font-semibold text-slate-800">{k.offers_released}</p>Offers</div>
          </div>
        </Card>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card title="Interviews overview" action={<ViewAll to="/interviews" />}>
          <StatRow items={[{ label: 'Scheduled', value: d.interviews_overview.scheduled, tone: 'text-blue-600' }, { label: 'Completed', value: d.interviews_overview.completed, tone: 'text-emerald-600' },
            { label: 'Pending', value: d.interviews_overview.pending, tone: 'text-amber-600' }, { label: 'Cancelled', value: d.interviews_overview.cancelled, tone: 'text-rose-600' }]} />
        </Card>
        <Card title="Upcoming interviews" action={<ViewAll to="/interviews" />} className="lg:col-span-2">
          <MiniTable head={['When', 'Candidate', 'Client', 'Position', 'Mode']} empty="No interviews scheduled"
            rows={d.upcoming_interviews.map((i: any) => [formatDateTime(i.scheduled_at), i.candidate_name, i.client_name, i.position_name, <StatusBadge value={i.mode} />])} />
        </Card>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card title="Top positions" className="lg:col-span-1"><Bars data={d.top_positions} keys={[{ key: 'value', label: 'Open' }]} horizontal height={200} labels /></Card>
        <Card title="Follow-ups" action={<ViewAll to="/follow-ups" />}>
          <StatRow items={[{ label: 'Candidates', value: d.follow_ups.candidate }, { label: 'Feedback', value: d.follow_ups.feedback }, { label: 'Offers', value: d.follow_ups.offer }, { label: 'Joining', value: d.follow_ups.joining }]} />
        </Card>
        <Card title="Recent activity"><ActivityFeed items={d.recent} /></Card>
      </div>
      <div className="mt-5"><QuickActions actions={QUICK.RECRUITER} /></div>
    </>
  );
}

function HrOps({ d, name, role }: P) {
  const k = d.kpis;
  return (
    <>
      <Greeting name={name} role={ROLE_LABEL[role]} text="Onboarding, documents and deployment status for today." />
      <KpiGrid cols={5}>
        <KpiCard icon={<ClipboardList />} tone="blue" label="Total requisitions" value={k.total_requisitions} to="/requisitions" />
        <KpiCard icon={<Briefcase />} tone="violet" label="Open positions" value={k.open_positions} to="/requisitions" />
        <KpiCard icon={<UserPlus />} tone="green" label="New joinees" value={k.new_joinees} sub="This month" to="/employees" />
        <KpiCard icon={<MapPin />} tone="orange" label="Deployed employees" value={formatNum(k.deployed)} to="/deployments" />
        <KpiCard icon={<FileStack />} tone="red" label="Pending onboarding" value={k.pending_onboarding} to="/onboarding" />
      </KpiGrid>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Requisition to deployment" className="lg:col-span-2">
          <Bars data={d.pipeline} keys={[{ key: 'value', label: 'Count' }]} height={230} labels />
        </Card>
        <Card title="My tasks" action={<ViewAll to="/onboarding" />}>
          <ul className="space-y-3">
            {d.tasks.map((t: any) => (
              <li key={t.title} className="flex items-center justify-between gap-3">
                <Link to={t.link} className="flex items-center gap-2 text-sm text-slate-700 hover:text-brand-700"><UserCheck className="h-4 w-4 text-slate-400" />{t.title} <span className="font-semibold">({t.count})</span></Link>
                <PriorityBadge value={t.priority} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card title="Deployment by client" className="lg:col-span-1"><Donut data={d.deployment_by_client} center={formatNum(k.deployed)} centerLabel="Total" height={190} /></Card>
        <Card title="Upcoming onboarding" action={<ViewAll to="/onboarding" />} className="lg:col-span-2">
          <MiniTable head={['Joining', 'Name', 'Designation', 'Client', 'Progress']} empty="No pending onboarding"
            rows={d.upcoming_onboarding.map((o: any) => [formatDate(o.date_of_joining), o.employee_name, o.designation_name, o.client_name,
              <span className="flex items-center gap-2"><span className="h-1.5 w-16 rounded-full bg-slate-100"><span className="block h-full rounded-full bg-brand-600" style={{ width: `${o.progress}%` }} /></span>{o.progress}%</span>])} />
        </Card>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Recent activity"><ActivityFeed items={d.recent} /></Card>
        <QuickActions actions={QUICK.HR_OPS} />
      </div>
    </>
  );
}

function Accounts({ d, name, role }: P) {
  const k = d.kpis;
  const growth = k.invoiced_prev ? (((k.invoiced_this_month - k.invoiced_prev) / k.invoiced_prev) * 100).toFixed(1) : '0';
  return (
    <>
      <Greeting name={name} role={ROLE_LABEL[role]} text="Billing, collections and receivables at a glance." />
      <KpiGrid cols={5}>
        <KpiCard icon={<FileText />} tone="blue" label="Invoiced this month" value={formatINRShort(k.invoiced_this_month)} sub={`${growth}% vs last month`} to="/invoices" />
        <KpiCard icon={<Receipt />} tone="green" label="Amount received" value={formatINRShort(k.received_this_month)} sub="This month" to="/receipts" />
        <KpiCard icon={<Hourglass />} tone="orange" label="Pending receivables" value={formatINRShort(k.pending_receivables)} to="/receivables" />
        <KpiCard icon={<AlertOctagon />} tone="red" label="Overdue amount" value={formatINRShort(k.overdue_amount)} to="/receivables" />
        <KpiCard icon={<FileMinus />} tone="violet" label="Credit notes" value={formatINRShort(k.credit_notes)} to="/credit-notes" />
      </KpiGrid>
      {d.uninvoiced.length > 0 && (
        <Card className="mb-5 border-amber-200 bg-amber-50" bodyClass="flex flex-wrap items-center gap-3 p-4">
          <Clock className="h-5 w-5 text-amber-600" />
          <p className="flex-1 text-sm text-amber-900">Attendance is locked but not yet invoiced for: <strong>{d.uninvoiced.map((c: any) => c.name).join(', ')}</strong></p>
          <Link to="/invoices/new"><Button size="sm">Generate invoice</Button></Link>
        </Card>
      )}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Invoice & collection overview" className="lg:col-span-2">
          <ComboTrend data={d.trend} bars={[{ key: 'invoiced', label: 'Invoiced' }, { key: 'received', label: 'Received' }]} line={{ key: 'pending', label: 'Pending' }} valueFormat={(v) => formatINRShort(v)} height={280} />
        </Card>
        <Card title="Receivables aging" action={<ViewAll to="/receivables" />}>
          <Donut data={d.aging} colors={['#22C55E', '#2F6FEB', '#F59E0B', '#8B5CF6', '#EF4444']} center={formatINRShort(k.pending_receivables)} centerLabel="Total pending"
            valueFormat={(v) => formatINRShort(v)} height={190} />
        </Card>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card title="Recent invoices" action={<ViewAll to="/invoices" />}>
          <MiniTable head={['Invoice', 'Amount', 'Status']} rows={d.recent_invoices.map((i: any) => [
            <span><Link to={`/invoices/${i.id}`} className="font-medium text-brand-600 hover:underline">{i.invoice_no}</Link><span className="block text-xs text-slate-400">{i.client_name}</span></span>,
            formatINR(i.total_amount), <StatusBadge value={i.status} />])} />
        </Card>
        <Card title="Top overdue clients" action={<ViewAll to="/receivables" />}>
          <MiniTable head={['Client', 'Overdue', 'Days']} empty="Nothing overdue"
            rows={d.top_overdue.map((c: any) => [c.name, formatINR(c.amount), <span className="font-medium text-rose-600">{c.days}</span>])} />
        </Card>
        <Card title="Payment reminders" action={<ViewAll to="/receivables" />}>
          <ul className="space-y-3">
            {d.reminders.map((r: any) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0"><p className="truncate font-medium text-slate-700">{r.client_name}</p><p className="text-xs text-slate-400">{r.invoice_no}</p></div>
                <div className="text-right"><p className="font-medium tabular-nums">{formatINR(r.balance_due)}</p>
                  <Badge color={r.due_in < 0 ? 'red' : r.due_in < 8 ? 'amber' : 'slate'}>{r.due_in < 0 ? `${-r.due_in} days overdue` : `Due in ${r.due_in} days`}</Badge></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="mt-5"><QuickActions actions={QUICK.ACCOUNTS} /></div>
    </>
  );
}

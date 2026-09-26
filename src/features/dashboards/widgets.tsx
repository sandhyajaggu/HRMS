import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Activity } from 'lucide-react';
import { Card, Badge, EmptyState } from '@/components/ui';
import { cn, formatDateTime, titleCase } from '@/lib/utils';

export function Greeting({ name, role, text }: { name: string; role: string; text: string }) {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-bold text-slate-900">{part}, {name}</h1>
      <p className="mt-0.5 text-sm text-slate-500">{text}</p>
      <p className="sr-only">{role}</p>
    </div>
  );
}

export function ViewAll({ to, label = 'View all' }: { to: string; label?: string }) {
  return <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">{label}<ArrowRight className="h-3.5 w-3.5" /></Link>;
}

export function ActivityFeed({ items }: { items: any[] }) {
  if (!items?.length) return <EmptyState title="No activity yet" />;
  return (
    <ul className="space-y-3.5">
      {items.map((a) => (
        <li key={a.id} className="flex gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Activity className="h-3.5 w-3.5" /></span>
          <div className="min-w-0">
            <p className="text-sm text-slate-700">{a.summary}</p>
            <p className="text-xs text-slate-400">{formatDateTime(a.created_at)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AlertList({ alerts }: { alerts: { level: string; text: string }[] }) {
  if (!alerts?.length) return <p className="text-sm text-slate-500">Nothing needs attention.</p>;
  return (
    <ul className="space-y-2.5">
      {alerts.map((a, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm">
          <AlertTriangle className={cn('mt-0.5 h-4 w-4 shrink-0', a.level === 'high' ? 'text-rose-500' : 'text-amber-500')} />
          <span className="text-slate-700">{a.text}</span>
        </li>
      ))}
    </ul>
  );
}

export function QuickActions({ actions }: { actions: { label: string; path: string; icon: any }[] }) {
  return (
    <Card title="Quick actions">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {actions.map((a) => (
          <Link key={a.path} to={a.path} className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-4 text-center transition hover:border-brand-300 hover:bg-brand-50/40">
            <span className="rounded-lg bg-brand-600 p-2 text-white"><a.icon className="h-4 w-4" /></span>
            <span className="text-xs font-medium text-slate-700">{a.label}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

export function MiniTable({ head, rows, empty = 'Nothing to show' }: { head: string[]; rows: ReactNode[][]; empty?: string }) {
  if (!rows.length) return <p className="py-4 text-center text-sm text-slate-500">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead><tr className="border-b border-slate-100">{head.map((h) => <th key={h} className="whitespace-nowrap px-2 py-2 text-left text-xs font-semibold text-slate-500">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="whitespace-nowrap px-2 py-2.5 text-slate-700">{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

export function PriorityBadge({ value }: { value: string }) {
  const c = value === 'High' || value === 'HIGH' ? 'red' : value === 'Low' || value === 'LOW' ? 'slate' : 'amber';
  return <Badge color={c as any}>{titleCase(value)}</Badge>;
}

export function StatRow({ items }: { items: { label: string; value: ReactNode; tone?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="rounded-xl border border-slate-200 p-3 text-center">
          <p className={cn('text-2xl font-bold tabular-nums', i.tone ?? 'text-slate-800')}>{i.value}</p>
          <p className="mt-0.5 text-xs text-slate-500">{i.label}</p>
        </div>
      ))}
    </div>
  );
}

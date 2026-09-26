import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const tones = {
  blue: 'bg-blue-600', green: 'bg-emerald-500', orange: 'bg-orange-500', violet: 'bg-violet-600', red: 'bg-rose-500', teal: 'bg-teal-500', indigo: 'bg-indigo-500', pink: 'bg-pink-500',
};
const soft = {
  blue: 'bg-blue-50 text-blue-600', green: 'bg-emerald-50 text-emerald-600', orange: 'bg-orange-50 text-orange-500', violet: 'bg-violet-50 text-violet-600',
  red: 'bg-rose-50 text-rose-500', teal: 'bg-teal-50 text-teal-600', indigo: 'bg-indigo-50 text-indigo-600', pink: 'bg-pink-50 text-pink-600',
};
export type Tone = keyof typeof tones;

export function KpiCard({ icon, label, value, sub, tone = 'blue', to, variant = 'solid' }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; to?: string; variant?: 'solid' | 'soft' }) {
  const body = (
    <div className={cn('flex h-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card', to && 'transition hover:border-brand-200 hover:shadow-md')}>
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl [&>svg]:h-5 [&>svg]:w-5', variant === 'solid' ? cn(tones[tone], 'text-white') : cn(soft[tone], 'rounded-full'))}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[13px] leading-snug text-slate-600">{label}</p>
        <p className="mt-0.5 text-2xl font-bold leading-tight text-slate-900 tabular-nums">{value}</p>
        {sub && <p className="mt-1 text-xs leading-snug text-slate-500">{sub}</p>}
      </div>
    </div>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
}

export function KpiGrid({ children, cols = 6 }: { children: ReactNode; cols?: 4 | 5 | 6 | 7 }) {
  const c = { 4: 'xl:grid-cols-4', 5: 'xl:grid-cols-5', 6: 'xl:grid-cols-6', 7: 'xl:grid-cols-7' }[cols];
  return <div className={cn('mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3', c)}>{children}</div>;
}

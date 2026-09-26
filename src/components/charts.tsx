import type { ReactNode } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, LineChart, Line, Legend, LabelList } from 'recharts';
import { cn, formatNum } from '@/lib/utils';

export const PALETTE = ['#2F6FEB', '#16A34A', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899', '#64748B'];
const tooltipStyle = { borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,.08)' };

export function Donut({ data, center, centerLabel, colors = PALETTE, legend = true, valueFormat = formatNum, height = 200 }: {
  data: { name: string; value: number }[]; center?: ReactNode; centerLabel?: string; colors?: string[]; legend?: boolean; valueFormat?: (v: number) => string; height?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div className={cn('flex flex-wrap items-center gap-x-5 gap-y-3', !legend && 'justify-center')}>
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="100%" paddingAngle={1} stroke="none" isAnimationActive={false}>
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => valueFormat(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
        {center !== undefined && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-800">{center}</span>
            {centerLabel && <span className="text-xs text-slate-500">{centerLabel}</span>}
          </div>
        )}
      </div>
      {legend && (
        <ul className="min-w-0 flex-1 space-y-2.5 text-[13px]">
          {data.map((d, i) => (
            <li key={d.name} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[i % colors.length] }} /><span className="leading-snug">{d.name}</span></span>
              <span className="whitespace-nowrap font-medium tabular-nums text-slate-800">{valueFormat(d.value)} <span className="font-normal text-slate-400">({((d.value / total) * 100).toFixed(1)}%)</span></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Bars({ data, keys, height = 240, horizontal, colors = PALETTE, labels, xKey = 'name', valueFormat, stacked }: {
  data: any[]; keys: { key: string; label: string }[]; height?: number; horizontal?: boolean; colors?: string[]; labels?: boolean; xKey?: string; valueFormat?: (v: number) => string; stacked?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 16, right: horizontal ? 36 : 8, left: horizontal ? 0 : -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" horizontal={!horizontal} vertical={!!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={valueFormat} />
            <YAxis type="category" dataKey={xKey} width={140} tick={{ fontSize: 12, fill: '#334155' }} axisLine={false} tickLine={false} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={valueFormat} />
          </>
        )}
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F1F5F9' }} formatter={(v: any) => (valueFormat ? valueFormat(Number(v)) : formatNum(v))} />
        {keys.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
        {keys.map((k, i) => (
          <Bar key={k.key} dataKey={k.key} name={k.label} fill={colors[i % colors.length]} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={horizontal ? 18 : 34} isAnimationActive={false} stackId={stacked ? 's' : undefined}>
            {labels && <LabelList dataKey={k.key} position={horizontal ? 'right' : 'top'} style={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} formatter={(v: any) => (valueFormat ? valueFormat(Number(v)) : v)} />}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AreaTrend({ data, dataKey, xKey = 'name', height = 220, valueFormat, color = '#2F6FEB' }: { data: any[]; dataKey: string; xKey?: string; height?: number; valueFormat?: (v: number) => string; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 16, right: 12, left: -6, bottom: 0 }}>
        <defs><linearGradient id={`g-${dataKey}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.25} /><stop offset="100%" stopColor={color} stopOpacity={0.02} /></linearGradient></defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={valueFormat} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => (valueFormat ? valueFormat(Number(v)) : formatNum(v))} />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#g-${dataKey})`} dot={{ r: 3, fill: color }} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ComboTrend({ data, bars, line, height = 260, valueFormat }: { data: any[]; bars: { key: string; label: string }[]; line?: { key: string; label: string }; height?: number; valueFormat?: (v: number) => string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 16, right: 8, left: -4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={valueFormat} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => (valueFormat ? valueFormat(Number(v)) : v)} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        {bars.map((b, i) => <Bar key={b.key} dataKey={b.key} name={b.label} fill={[PALETTE[0], PALETTE[1]][i]} radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={false} />)}
        {line && <Line type="monotone" dataKey={line.key} name={line.label} stroke={PALETTE[2]} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LineTrend({ data, keys, height = 220, valueFormat }: { data: any[]; keys: { key: string; label: string }[]; height?: number; valueFormat?: (v: number) => string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 16, right: 12, left: -6, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={valueFormat} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        {keys.map((k, i) => <Line key={k.key} type="monotone" dataKey={k.key} name={k.label} stroke={PALETTE[i]} strokeWidth={2} dot={{ r: 4 }} isAnimationActive={false}><LabelList dataKey={k.key} position="top" style={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} /></Line>)}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Stacked trapezoid funnel like the recruiter dashboard mockup */
export function Funnel({ data }: { data: { name: string; value: number }[] }) {
  const colors = ['#2F6FEB', '#2563EB', '#14B8A6', '#22C55E', '#F59E0B', '#F43F5E'];
  const n = data.length;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox={`0 0 200 ${n * 34}`} className="w-40 shrink-0" aria-hidden>
        {data.map((d, i) => {
          const top = 200 - i * (150 / n), bot = 200 - (i + 1) * (150 / n);
          const x1 = (200 - top) / 2, x2 = (200 - bot) / 2;
          return <polygon key={d.name} points={`${x1},${i * 34 + 2} ${200 - x1},${i * 34 + 2} ${200 - x2},${i * 34 + 32} ${x2},${i * 34 + 32}`} fill={colors[i % colors.length]} />;
        })}
      </svg>
      <ul className="flex-1 space-y-[9px] text-sm">
        {data.map((d) => <li key={d.name} className="flex justify-between gap-4"><span className="text-slate-600">{d.name}</span><span className="font-semibold tabular-nums text-slate-800">{formatNum(d.value)}</span></li>)}
      </ul>
    </div>
  );
}

/** Semi-circle gauge (recruiter performance) */
export function Gauge({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, value));
  const angle = Math.PI * (1 - v / 100);
  const x = 100 + 80 * Math.cos(angle), y = 100 - 80 * Math.sin(angle);
  return (
    <svg viewBox="0 0 200 115" className="mx-auto w-56" role="img" aria-label={`${v}% ${label}`}>
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#E2E8F0" strokeWidth="14" strokeLinecap="round" />
      <path d={`M20 100 A80 80 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`} fill="none" stroke="#22C55E" strokeWidth="14" strokeLinecap="round" />
      <text x="100" y="88" textAnchor="middle" className="fill-slate-800" style={{ fontSize: 26, fontWeight: 700 }}>{Math.round(v)}%</text>
      <text x="100" y="108" textAnchor="middle" className="fill-slate-500" style={{ fontSize: 12 }}>{label}</text>
    </svg>
  );
}

import clsx, { type ClassValue } from 'clsx';
import { format, parseISO, isValid } from 'date-fns';

export const cn = (...c: ClassValue[]) => clsx(c);

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
const num = new Intl.NumberFormat('en-IN');

export const formatINR = (v: unknown, decimals = false) =>
  v === null || v === undefined || v === '' ? '—' : (decimals ? inr2 : inr).format(Number(v));
export const formatNum = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : num.format(Number(v)));

/** 12435600 -> ₹1.24 Cr, 1875000 -> ₹18.75 L (KPI cards) */
export const formatINRShort = (v: number) => {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  return inr.format(v);
};

export const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  const d = v instanceof Date ? v : parseISO(String(v));
  return isValid(d) ? d : null;
};
export const formatDate = (v: unknown, f = 'dd MMM yyyy') => {
  const d = toDate(v);
  return d ? format(d, f) : '—';
};
export const formatDateTime = (v: unknown) => formatDate(v, 'dd MMM yyyy, hh:mm a');
export const formatMonth = (v: unknown) => formatDate(v, 'MMM yyyy');
export const isoDate = (d: Date) => format(d, 'yyyy-MM-dd');
export const monthStart = (d = new Date()) => isoDate(new Date(d.getFullYear(), d.getMonth(), 1));

export const titleCase = (s: string) =>
  String(s ?? '').toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

export function downloadCSV(filename: string, rows: Record<string, unknown>[], columns?: { key: string; label: string }[]) {
  if (!rows.length) return;
  const cols = columns ?? Object.keys(rows[0]).map((k) => ({ key: k, label: k }));
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.map((c) => esc(c.label)).join(','), ...rows.map((r) => cols.map((c) => esc(r[c.key])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Minimal CSV parser (handles quoted cells) used by attendance import */
export function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (!head) return [];
  const keys = head.map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

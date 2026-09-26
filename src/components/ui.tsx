import { forwardRef, useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Loader2, X, Inbox } from 'lucide-react';
import { cn, titleCase } from '@/lib/utils';

// ---------------------------------------------------------------- Button
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-sm',
  outline: 'border border-brand-600 text-brand-600 hover:bg-brand-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
};
export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; loading?: boolean; icon?: ReactNode }>(
  ({ variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...p }, ref) => (
    <button ref={ref} disabled={disabled || loading}
      className={cn('inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-sm', variants[variant], className)} {...p}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  ),
);

// ---------------------------------------------------------------- Inputs
const inputCls = 'w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-500';
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => <input ref={ref} className={cn(inputCls, className)} {...p} />);
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => <textarea ref={ref} className={cn(inputCls, 'h-auto min-h-[80px] py-2', className)} {...p} />);
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { options?: { value: string | number; label: string }[]; placeholder?: string }>(
  ({ className, options, placeholder, children, ...p }, ref) => (
    <select ref={ref} className={cn(inputCls, 'pr-8', className)} {...p}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      {children}
    </select>
  ),
);
export function Field({ label, error, required, hint, children, className }: { label: string; error?: string; required?: boolean; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}{required && <span className="text-red-500"> *</span>}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}

// ---------------------------------------------------------------- Card & layout bits
export function Card({ title, action, children, className, bodyClass }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cn('rounded-xl border border-slate-200 bg-white shadow-card', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-[15px] font-semibold text-slate-800">{title}</h3>
          {action}
        </header>
      )}
      <div className={cn('p-5', bodyClass)}>{children}</div>
    </section>
  );
}
export function PageHeader({ title, subtitle, actions, back }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {back}
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
export function Spinner({ className }: { className?: string }) {
  return <div className={cn('flex items-center justify-center py-12 text-slate-400', className)}><Loader2 className="h-6 w-6 animate-spin" /></div>;
}
export function EmptyState({ title = 'Nothing here yet', text, action, icon }: { title?: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-400">{icon ?? <Inbox className="h-6 w-6" />}</div>
      <p className="font-medium text-slate-700">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-800">{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
export function DetailGrid({ items, cols = 3 }: { items: [string, ReactNode][]; cols?: 2 | 3 | 4 }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4', cols === 2 ? 'sm:grid-cols-2' : cols === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3')}>
      {items.map(([k, v]) => (
        <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="mt-0.5 break-words text-sm text-slate-800">{v === null || v === undefined || v === '' ? '—' : v}</dd></div>
      ))}
    </dl>
  );
}

// ---------------------------------------------------------------- Badges
const tone: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', blue: 'bg-blue-50 text-blue-700 ring-blue-600/20', amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20', slate: 'bg-slate-100 text-slate-600 ring-slate-500/20', violet: 'bg-violet-50 text-violet-700 ring-violet-600/20', cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20',
};
const STATUS_TONE: Record<string, keyof typeof tone> = {
  ACTIVE: 'green', APPROVED: 'green', PAID: 'green', COMPLETED: 'green', CLOSED: 'slate', JOINED: 'green', VERIFIED: 'green', LOCKED: 'green', ACCEPTED: 'green', PRESENT: 'green', CLEARED: 'green', DONE: 'green', SELECTED: 'green', RECONCILED: 'green', ISSUED: 'blue', FILED: 'green', PROCESSED: 'green',
  OPEN: 'blue', IN_PROGRESS: 'blue', SENT: 'blue', SUBMITTED: 'blue', COMPUTED: 'blue', SCHEDULED: 'blue', RELEASED: 'blue', PLANNED: 'blue', GENERATED: 'blue', RECORDED: 'blue', UPCOMING: 'blue', ONBOARDING: 'cyan', INTERVIEW_SCHEDULED: 'blue', INTERVIEWED: 'violet', SHORTLISTED: 'violet', SCREENED: 'cyan', SOURCED: 'slate', OFFERED: 'violet', UPLOADED: 'blue', COMMITTED: 'green',
  PENDING: 'amber', PENDING_APPROVAL: 'amber', DRAFT: 'slate', UNDER_REVIEW: 'amber', ON_HOLD: 'amber', NOTICE: 'amber', PARTIALLY_PAID: 'amber', DUE: 'amber', RENEWAL_DUE: 'amber', INITIATED: 'amber', CLEARANCE: 'amber', FNF_PENDING: 'amber', HALF_DAY: 'amber', LEAVE: 'violet', BLOCKED: 'red', DUES: 'red',
  REJECTED: 'red', CANCELLED: 'slate', EXPIRED: 'red', OVERDUE: 'red', ABSENT: 'red', DROPPED: 'slate', NO_SHOW: 'red', TERMINATED: 'red', EXITED: 'slate', FAILED: 'red', DECLINED: 'red', REVOKED: 'red', ENDED: 'slate', INACTIVE: 'slate', BLACKLISTED: 'red', WITHDRAWN: 'slate', BOUNCED: 'red', DISABLED: 'slate',
  HIGH: 'red', URGENT: 'red', MEDIUM: 'amber', LOW: 'slate', NORMAL: 'slate',
};
export function Badge({ children, color = 'slate', className }: { children: ReactNode; color?: keyof typeof tone; className?: string }) {
  return <span className={cn('inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', tone[color], className)}>{children}</span>;
}
export function StatusBadge({ value }: { value?: string | null }) {
  if (!value) return <span className="text-slate-400">—</span>;
  return <Badge color={STATUS_TONE[value] ?? 'slate'}>{titleCase(value)}</Badge>;
}

// ---------------------------------------------------------------- Overlays
export function Modal({ open, onClose, title, children, footer, size = 'md' }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  useEscape(open, onClose);
  if (!open) return null;
  const w = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-[8vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className={cn('w-full rounded-xl bg-white shadow-xl', w)}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
export function Drawer({ open, onClose, title, children, footer, width = 'max-w-xl' }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: string }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className={cn('flex h-full w-full flex-col bg-white shadow-xl', width)}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
}
export function ConfirmDialog({ open, onClose, onConfirm, title, text, confirmLabel = 'Confirm', danger, loading }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; text: ReactNode; confirmLabel?: string; danger?: boolean; loading?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button></>}>
      <div className="text-sm text-slate-600">{text}</div>
    </Modal>
  );
}

// ---------------------------------------------------------------- Tabs
export function Tabs({ tabs, value, onChange }: { tabs: { key: string; label: ReactNode; count?: number }[]; value: string; onChange: (k: string) => void }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <button key={t.key} onClick={() => onChange(t.key)}
          className={cn('-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors', value === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700')}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function ProgressBar({ value, className, color = 'bg-brand-600' }: { value: number; className?: string; color?: string }) {
  return <div className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-100', className)}><div className={cn('h-full rounded-full', color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

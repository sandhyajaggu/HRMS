import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, Search, ChevronDown, LogOut, KeyRound, X, CalendarDays, Check } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { navFor, ROLE_LABEL } from '@/config/navigation';
import { useFetch, useList, useAction } from '@/api/hooks';
import { cn, formatDate, formatDateTime, initials } from '@/lib/utils';
import { ChangePasswordModal } from '@/features/settings/ChangePassword';
import { env } from '@/lib/env';

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="h-9 w-9 shrink-0" aria-hidden>
        {[0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => (
          <rect key={`${r}${c}`} x={c * 8 + 1} y={r * 8 + 1} width="6" height="6" rx="1.2"
            fill={['#F59E0B', '#EF4444', '#22C55E', '#3B82F6', '#8B5CF6', '#06B6D4'][(r * 4 + c * 3) % 6]} opacity={(r + c) % 3 === 0 ? 1 : 0.85} />
        )))}
      </svg>
      {!compact && (
        <div className="leading-tight">
          <div className="text-[15px] font-bold tracking-wide text-white">YSK INFOTECH</div>
          <div className="text-[11px] font-medium text-blue-200">HRMS · Staffing platform</div>
        </div>
      )}
    </div>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activeRole } = useAuth();
  const sections = navFor(activeRole);
  const { data: approvals } = useList('approval_requests', { status: 'PENDING', page_size: 1 });
  const loc = useLocation();
  useEffect(() => { onClose(); /* close on navigate (mobile) */ }, [loc.pathname]); // eslint-disable-line
  return (
    <>
      <div className={cn('fixed inset-0 z-30 bg-slate-900/50 lg:hidden', open ? 'block' : 'hidden')} onClick={onClose} />
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-900 text-slate-200 transition-transform lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Logo />
          <button className="rounded p-1 text-slate-300 hover:bg-white/10 lg:hidden" onClick={onClose} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map((s, i) => (
            <div key={i} className="mb-4">
              {s.title && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-blue-300/70">{s.title}</p>}
              <ul className="space-y-0.5">
                {s.items.map((it) => (
                  <li key={it.path}>
                    <NavLink to={it.path} end={it.path === '/' || it.path === '/compliance'}
                      className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors', isActive ? 'bg-brand-600 text-white shadow' : 'text-slate-300 hover:bg-white/5 hover:text-white')}>
                      <it.icon className="h-[18px] w-[18px] shrink-0" />
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.path === '/approvals' && !!approvals?.total && <span className="rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold text-white">{approvals.total}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 px-5 py-4 text-xs text-slate-400">
          <p className="font-medium text-slate-300">YSK Infotech Pvt Ltd</p>
          <p>© {new Date().getFullYear()} All rights reserved</p>
          {env.useMock && <p className="mt-1 text-amber-300/80">Demo mode · mock data</p>}
        </div>
      </aside>
    </>
  );
}

function GlobalSearch() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const { data = [] } = useFetch<{ type: string; label: string; path: string }[]>('/search', { q }, q.length >= 2);
  const ref = useClickOutside(() => setOpen(false));
  return (
    <div ref={ref} className="relative hidden w-full max-w-md md:block">
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
      <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Search employees, candidates, clients, invoices…"
        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100" />
      {open && q.length >= 2 && (
        <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {data.length === 0 ? <p className="px-4 py-3 text-sm text-slate-500">No matches for “{q}”</p> : data.map((r, i) => (
            <button key={i} className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-slate-50" onClick={() => { nav(r.path); setOpen(false); setQ(''); }}>
              <span className="truncate text-slate-700">{r.label}</span><span className="text-xs text-slate-400">{r.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const { data } = useList('notifications', { page_size: 15 });
  const readAll = useAction('/notifications/read-all');
  const unread = data?.items.filter((n: any) => !n.is_read).length ?? 0;
  return (
    <div ref={ref} className="relative">
      <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            {unread > 0 && <button className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline" onClick={() => readAll.mutate(undefined)}><Check className="h-3 w-3" />Mark all read</button>}
          </div>
          <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {data?.items.length ? data.items.map((n: any) => (
              <li key={n.id} className={cn('px-4 py-3', !n.is_read && 'bg-brand-50/50')}>
                <p className="text-sm font-medium text-slate-800">{n.title}</p>
                <p className="text-xs text-slate-500">{n.body}</p>
                <p className="mt-1 text-[11px] text-slate-400">{formatDateTime(n.created_at)}</p>
              </li>
            )) : <li className="px-4 py-6 text-center text-sm text-slate-500">You're all caught up</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, logout, activeRole, setActiveRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const nav = useNavigate();
  if (!user) return null;
  return (
    <div ref={ref} className="relative">
      <button className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-100" onClick={() => setOpen((o) => !o)}>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-800 text-sm font-semibold text-white">{initials(user.full_name)}</span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-semibold text-slate-800">{user.full_name}</span>
          <span className="block text-xs text-slate-500">{activeRole && ROLE_LABEL[activeRole]}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <div className="border-b border-slate-100 px-4 py-2.5"><p className="text-sm font-medium text-slate-800">{user.email}</p></div>
          {user.roles.length > 1 && (
            <div className="border-b border-slate-100 py-1">
              <p className="px-4 pt-1 text-[11px] font-semibold uppercase text-slate-400">Switch portal</p>
              {user.roles.map((r) => <button key={r} onClick={() => { setActiveRole(r); setOpen(false); nav('/'); }} className={cn('block w-full px-4 py-2 text-left text-sm hover:bg-slate-50', r === activeRole && 'font-semibold text-brand-700')}>{ROLE_LABEL[r]}</button>)}
            </div>
          )}
          <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={() => { setPwd(true); setOpen(false); }}><KeyRound className="h-4 w-4" />Change password</button>
          <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50" onClick={() => { logout(); nav('/login'); }}><LogOut className="h-4 w-4" />Sign out</button>
        </div>
      )}
      <ChangePasswordModal open={pwd} onClose={() => setPwd(false)} />
    </div>
  );
}

function useClickOutside(cb: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cb(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [cb]);
  return ref;
}

export function AppLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 xl:flex"><CalendarDays className="h-4 w-4 text-slate-400" />{formatDate(new Date(), 'dd MMM yyyy, EEEE')}</span>
            <Notifications />
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  );
}

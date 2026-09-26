import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { http, tokenStore } from '@/api/http';
import type { RoleCode, User } from '@/lib/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  activeRole: RoleCode | null;
  setActiveRole: (r: RoleCode) => void;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  hasRole: (...roles: RoleCode[]) => boolean;
}
const Ctx = createContext<AuthState | null>(null);
const ROLE_KEY = 'ysk_hrms_active_role';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActive] = useState<RoleCode | null>(null);
  const qc = useQueryClient();

  const pickRole = (u: User) => {
    const saved = (() => { try { return localStorage.getItem(ROLE_KEY) as RoleCode | null; } catch { return null; } })();
    setActive(saved && u.roles.includes(saved) ? saved : u.roles[0]);
  };

  useEffect(() => {
    if (!tokenStore.get()) { setLoading(false); return; }
    http.get<User>('/auth/me').then((r) => { setUser(r.data); pickRole(r.data); }).catch(() => tokenStore.set(null)).finally(() => setLoading(false));
    const onLogout = () => { setUser(null); qc.clear(); };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await http.post('/auth/login', { email, password });
    tokenStore.set(data);
    const me = await http.get<User>('/auth/me');
    setUser(me.data);
    try { localStorage.removeItem(ROLE_KEY); } catch { /* ignore */ }
    setActive(me.data.roles[0]);
    return me.data;
  }, []);

  const logout = useCallback(() => { tokenStore.set(null); setUser(null); qc.clear(); }, [qc]);
  const setActiveRole = (r: RoleCode) => { setActive(r); try { localStorage.setItem(ROLE_KEY, r); } catch { /* ignore */ } };
  // Permissions follow the active portal so a multi-role user sees one consistent menu.
  const hasRole = useCallback((...roles: RoleCode[]) => !!activeRole && roles.includes(activeRole), [activeRole]);

  return <Ctx.Provider value={{ user, loading, activeRole, setActiveRole, login, logout, hasRole }}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
};

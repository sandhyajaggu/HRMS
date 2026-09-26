import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useAuth } from './AuthContext';
import { Spinner, EmptyState } from '@/components/ui';
import type { RoleCode } from '@/lib/types';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner className="h-screen" />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}

export function RoleGate({ roles, children }: { roles?: RoleCode[]; children: ReactNode }) {
  const { hasRole } = useAuth();
  if (roles && !hasRole(...roles))
    return <EmptyState icon={<ShieldOff className="h-6 w-6" />} title="You don't have access to this page" text="Switch to a portal that has this permission, or ask the MD to update your role." />;
  return <>{children}</>;
}

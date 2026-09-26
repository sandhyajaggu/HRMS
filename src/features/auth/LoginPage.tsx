import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Building2, ShieldCheck, Users, Wallet } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { apiError } from '@/api/http';
import { Button, Field, Input } from '@/components/ui';
import { Logo } from '@/layouts/AppLayout';
import { env } from '@/lib/env';

const DEMO = [
  ['Managing Director', 'md@ysk.in'], ['Operations Manager', 'ops@ysk.in'], ['Recruitment Manager', 'recmgr@ysk.in'],
  ['HR Recruiter', 'recruiter@ysk.in'], ['HR Operations', 'hrops@ysk.in'], ['Billing & Accounts', 'accounts@ysk.in'],
];

export default function LoginPage() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as any;
  const [error, setError] = useState('');
  const { register, handleSubmit, setValue, formState: { isSubmitting, errors } } = useForm({ defaultValues: { email: '', password: '' } });
  if (user) return <Navigate to="/" replace />;
  const submit = handleSubmit(async (v) => {
    setError('');
    try { await login(v.email, v.password); nav(loc.state?.from ?? '/', { replace: true }); }
    catch (e) { setError(apiError(e)); }
  });
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy-900 p-12 text-white lg:flex">
        <Logo />
        <div className="relative z-10 max-w-lg">
          <h1 className="text-4xl font-bold leading-tight">From client requirement to payment, in one system.</h1>
          <p className="mt-4 text-blue-100/80">Recruitment, onboarding, deployment, attendance, payroll with PF and ESI, GST billing and collections for your staffing operations.</p>
          <ul className="mt-10 grid grid-cols-2 gap-5 text-sm text-blue-50">
            {[[Building2, 'Multi-client deployments'], [Users, 'Recruitment pipeline'], [Wallet, 'Payroll & statutory'], [ShieldCheck, 'Role-based access']].map(([I, t]: any) => (
              <li key={t} className="flex items-center gap-3"><span className="rounded-lg bg-white/10 p-2"><I className="h-4 w-4" /></span>{t}</li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-blue-200/60">© {new Date().getFullYear()} YSK Infotech Pvt Ltd</p>
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl" />
      </div>
      <div className="flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><div className="inline-block rounded-xl bg-navy-900 p-3"><Logo /></div></div>
          <h2 className="text-2xl font-semibold text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Use your YSK work email.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="username" {...register('email', { required: 'Email is required' })} placeholder="name@ysk.in" /></Field>
            <Field label="Password" error={errors.password?.message}><Input type="password" autoComplete="current-password" {...register('password', { required: 'Password is required' })} /></Field>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <Button type="submit" className="w-full" loading={isSubmitting}>Sign in</Button>
          </form>
          {env.useMock && (
            <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500">Demo portals (password: demo123)</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {DEMO.map(([label, email]) => (
                  <button key={email} type="button" className="rounded-lg border border-slate-200 px-2.5 py-2 text-left text-xs text-slate-700 hover:border-brand-300 hover:bg-brand-50"
                    onClick={() => { setValue('email', email); setValue('password', 'demo123'); submit(); }}>{label}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

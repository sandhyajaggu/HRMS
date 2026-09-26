import { Suspense, lazy } from 'react';
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/auth/AuthContext';
import { RequireAuth, RoleGate } from '@/auth/guards';
import { AppLayout } from '@/layouts/AppLayout';
import { Spinner } from '@/components/ui';
import { env } from '@/lib/env';
import type { RoleCode } from '@/lib/types';

import LoginPage from '@/features/auth/LoginPage';
import Dashboard from '@/features/dashboards';
import * as L from '@/features/pages/ListPages';
import ClientDetail from '@/features/pages/ClientDetail';
import RequisitionDetail from '@/features/pages/RequisitionDetail';
import CandidateDetail from '@/features/pages/CandidateDetail';
import EmployeeDetail from '@/features/pages/EmployeeDetail';
import Pipeline from '@/features/pages/Pipeline';
import Onboarding from '@/features/pages/Onboarding';
import Attendance from '@/features/pages/Attendance';
import Approvals from '@/features/pages/Approvals';
import { PayrollRuns, PayrollRunDetail, PayslipView } from '@/features/pages/Payroll';
import { InvoiceNew, InvoiceDetail, Receipts, Receivables, TaxPage } from '@/features/pages/Billing';
import { ExitDetail, ComplianceReturns, Reports, AdminUsers, MasterData, SettingsPage, OfferDetail } from '@/features/pages/Misc';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 10_000 } } });
const Router = env.router === 'hash' ? HashRouter : BrowserRouter;

const ALL: RoleCode[] = ['MD', 'OPS_MANAGER', 'REC_MANAGER', 'RECRUITER', 'HR_OPS', 'ACCOUNTS'];
const MGMT: RoleCode[] = ['MD', 'OPS_MANAGER'];
const REC: RoleCode[] = ['MD', 'REC_MANAGER', 'RECRUITER'];
const ACC: RoleCode[] = ['MD', 'ACCOUNTS'];
const WORKFORCE: RoleCode[] = ['MD', 'OPS_MANAGER', 'HR_OPS'];

const page = (roles: RoleCode[], el: JSX.Element) => <RoleGate roles={roles}>{el}</RoleGate>;

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <Toaster position="top-right" richColors closeButton />
          <Suspense fallback={<Spinner className="h-screen" />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
                <Route index element={<Dashboard />} />
                <Route path="approvals" element={page(['MD', 'OPS_MANAGER', 'REC_MANAGER'], <Approvals />)} />

                <Route path="clients" element={page([...ACC, 'OPS_MANAGER'], <L.Clients />)} />
                <Route path="clients/:id" element={page([...ACC, 'OPS_MANAGER'], <ClientDetail />)} />
                <Route path="contracts" element={page([...ACC, 'OPS_MANAGER'], <L.Contracts />)} />
                <Route path="licenses" element={page(MGMT, <L.Licenses />)} />

                <Route path="requisitions" element={page([...REC, 'OPS_MANAGER', 'HR_OPS'], <L.Requisitions />)} />
                <Route path="requisitions/:id" element={page([...REC, 'OPS_MANAGER', 'HR_OPS'], <RequisitionDetail />)} />
                <Route path="candidates" element={page([...REC, 'HR_OPS'], <L.Candidates />)} />
                <Route path="candidates/:id" element={page([...REC, 'HR_OPS'], <CandidateDetail />)} />
                <Route path="pipeline" element={page(REC, <Pipeline />)} />
                <Route path="interviews" element={page(REC, <L.Interviews />)} />
                <Route path="offers" element={page([...REC, 'HR_OPS'], <L.Offers />)} />
                <Route path="offers/:id" element={page([...REC, 'HR_OPS'], <OfferDetail />)} />
                <Route path="follow-ups" element={page(REC, <L.FollowUps />)} />
                <Route path="drives" element={page(['MD', 'REC_MANAGER'], <L.Drives />)} />
                <Route path="vendors" element={page(['MD', 'REC_MANAGER'], <L.Vendors />)} />
                <Route path="recruiter-targets" element={page(['MD', 'REC_MANAGER'], <L.RecruiterTargets />)} />

                <Route path="onboarding" element={page(WORKFORCE, <Onboarding />)} />
                <Route path="employees" element={page(WORKFORCE, <L.Employees />)} />
                <Route path="employees/:id" element={page(WORKFORCE, <EmployeeDetail />)} />
                <Route path="deployments" element={page(WORKFORCE, <L.Deployments />)} />
                <Route path="attendance" element={page(WORKFORCE, <Attendance />)} />
                <Route path="shifts" element={page(['OPS_MANAGER', 'HR_OPS'], <L.Shifts />)} />
                <Route path="leave" element={page(['OPS_MANAGER', 'HR_OPS'], <L.Leave />)} />
                <Route path="overtime" element={page(['OPS_MANAGER', 'HR_OPS'], <L.Overtime />)} />
                <Route path="exits" element={page(WORKFORCE, <L.Exits />)} />
                <Route path="exits/:id" element={page(WORKFORCE, <ExitDetail />)} />

                <Route path="payroll" element={page(MGMT, <PayrollRuns />)} />
                <Route path="payroll/:id" element={page(MGMT, <PayrollRunDetail />)} />
                <Route path="payslips/:id" element={page(WORKFORCE, <PayslipView />)} />
                <Route path="salary-structures" element={page(MGMT, <L.SalaryStructures />)} />
                <Route path="advances" element={page(MGMT, <L.Advances />)} />
                <Route path="compliance" element={page([...MGMT, 'ACCOUNTS'], <L.Compliance />)} />
                <Route path="compliance/returns" element={page(MGMT, <ComplianceReturns />)} />

                <Route path="invoices" element={page([...ACC, 'OPS_MANAGER'], <L.Invoices />)} />
                <Route path="invoices/new" element={page(ACC, <InvoiceNew />)} />
                <Route path="invoices/:id" element={page([...ACC, 'OPS_MANAGER'], <InvoiceDetail />)} />
                <Route path="receipts" element={page(ACC, <Receipts />)} />
                <Route path="receivables" element={page([...ACC, 'OPS_MANAGER'], <Receivables />)} />
                <Route path="credit-notes" element={page(ACC, <L.CreditNotes />)} />
                <Route path="expenses" element={page(ACC, <L.Expenses />)} />
                <Route path="tax" element={page(ACC, <TaxPage />)} />

                <Route path="reports" element={page(ALL, <Reports />)} />
                <Route path="announcements" element={page(MGMT, <L.Announcements />)} />
                <Route path="tickets" element={page(ALL, <L.Tickets />)} />
                <Route path="admin/users" element={page(['MD'], <AdminUsers />)} />
                <Route path="admin/masters" element={page(MGMT, <MasterData />)} />
                <Route path="settings" element={page(ALL, <SettingsPage />)} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { useOne, useList } from '@/api/hooks';
import { Button, Card, DetailGrid, PageHeader, Spinner, StatusBadge, Tabs, Badge } from '@/components/ui';
import { DataTable } from '@/components/DataTable';
import { ResourcePage, ResourceForm } from '@/components/ResourcePage';
import { employeesConfig, deploymentsConfig, documentsConfig, employeeAssetsConfig, salaryAssignmentsConfig, leaveConfig } from '../configs';
import { formatDate, formatINR, titleCase } from '@/lib/utils';
import { useAuth } from '@/auth/AuthContext';

export default function EmployeeDetail() {
  const { id } = useParams();
  const eid = Number(id);
  const { data: e, isLoading } = useOne('employees', eid);
  const { data: slips } = useList('payslips', { employee_id: eid, page_size: 12 });
  const { data: bank } = useList('employee_bank_accounts', { employee_id: eid });
  const { hasRole } = useAuth();
  const [tab, setTab] = useState('profile');
  const [edit, setEdit] = useState(false);
  if (isLoading || !e) return <Spinner />;
  const sensitive = hasRole('MD', 'OPS_MANAGER', 'HR_OPS');
  const acct = bank?.items?.[0];
  return (
    <>
      <PageHeader back={<Link to="/employees" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" />All employees</Link>}
        title={e.full_name} subtitle={<span className="flex flex-wrap items-center gap-2">{e.employee_code} · {e.current_designation_name ?? titleCase(e.category)} {e.current_client_name && `· ${e.current_client_name}`} <StatusBadge value={e.status} /></span>}
        actions={<Button onClick={() => setEdit(true)}>Edit employee</Button>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'profile', label: 'Profile' }, { key: 'deployments', label: 'Deployments' }, { key: 'salary', label: 'Salary' },
        { key: 'payslips', label: 'Payslips', count: slips?.total }, { key: 'documents', label: 'Documents' }, { key: 'assets', label: 'Assets' }, { key: 'leave', label: 'Leave' }]} />
      {tab === 'profile' && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card title="Personal details" className="lg:col-span-2">
            <DetailGrid items={[['Employee code', e.employee_code], ['Full name', e.full_name], ['Father / spouse', e.father_or_spouse_name], ['Gender', titleCase(e.gender)],
              ['Date of birth', formatDate(e.date_of_birth)], ['Marital status', titleCase(e.marital_status ?? '')], ['Mobile', e.mobile], ['Email', e.email],
              ['Date of joining', formatDate(e.date_of_joining)], ['Date of exit', formatDate(e.date_of_exit)], ['Category', titleCase(e.category)], ['Home state', e.state_name],
              ['Current address', e.current_address], ['Permanent address', e.permanent_address]]} />
          </Card>
          <div className="space-y-5">
            <Card title={<span className="flex items-center gap-2"><Shield className="h-4 w-4 text-slate-400" />Statutory</span>}>
              <DetailGrid cols={2} items={[['UAN', e.uan ?? <Badge color="amber">Pending</Badge>], ['ESIC IP', e.esic_ip_number ?? <Badge color="amber">Pending</Badge>],
                ['PF applicable', e.pf_applicable ? 'Yes' : 'No'], ['ESI applicable', e.esi_applicable ? 'Yes' : 'No'], ['PT applicable', e.pt_applicable ? 'Yes' : 'No'],
                ['Aadhaar', sensitive ? `XXXX XXXX ${e.aadhaar_last4 ?? '••••'}` : 'Hidden'], ['PAN', sensitive ? `XXXXX${e.pan_last4 ?? '••••'}` : 'Hidden']]} />
              <p className="mt-3 text-xs text-slate-400">Full identifiers are stored encrypted; only the last four digits are shown.</p>
            </Card>
            <Card title="Bank account">
              {acct ? <DetailGrid cols={2} items={[['Bank', acct.bank_name], ['Account', `••••${acct.account_last4}`], ['IFSC', acct.ifsc], ['Holder', acct.account_holder_name]]} />
                : <p className="text-sm text-slate-500">No bank account on record yet.</p>}
            </Card>
          </div>
        </div>
      )}
      {tab === 'deployments' && <ResourcePage config={deploymentsConfig} fixed={{ employee_id: eid }} embedded />}
      {tab === 'salary' && <ResourcePage config={salaryAssignmentsConfig} fixed={{ employee_id: eid }} embedded />}
      {tab === 'payslips' && (
        <Card bodyClass="p-0">
          <DataTable rows={slips?.items ?? []} columns={[{ key: 'period_month', header: 'Month', render: (p: any) => formatDate(p.period_month, 'MMM yyyy') },
            { key: 'paid_days', header: 'Paid days', align: 'right' }, { key: 'gross_earnings', header: 'Gross', align: 'right', render: (p: any) => formatINR(p.gross_earnings) },
            { key: 'total_deductions', header: 'Deductions', align: 'right', render: (p: any) => formatINR(p.total_deductions) },
            { key: 'net_pay', header: 'Net pay', align: 'right', render: (p: any) => <span className="font-semibold">{formatINR(p.net_pay)}</span> },
            { key: 'status', header: 'Status', render: (p: any) => <StatusBadge value={p.status} /> },
            { key: 'view', header: '', align: 'right', render: (p: any) => <Link to={`/payslips/${p.id}`} className="text-brand-600 hover:underline">View</Link> }]} />
        </Card>
      )}
      {tab === 'documents' && <ResourcePage config={documentsConfig} fixed={{ entity_type: 'EMPLOYEE', entity_id: eid }} embedded />}
      {tab === 'assets' && <ResourcePage config={employeeAssetsConfig} fixed={{ employee_id: eid }} embedded />}
      {tab === 'leave' && <ResourcePage config={leaveConfig} fixed={{ employee_id: eid }} embedded />}
      {edit && <ResourceForm config={employeesConfig} record={e} onClose={() => setEdit(false)} />}
    </>
  );
}

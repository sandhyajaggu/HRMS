import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useOne, useList } from '@/api/hooks';
import { Card, DetailGrid, PageHeader, Spinner, StatusBadge, Tabs, Button } from '@/components/ui';
import { ResourcePage, ResourceForm } from '@/components/ResourcePage';
import { clientsConfig, sitesConfig, contactsConfig, contractsConfig, rateCardsConfig, licensesConfig, requisitionsConfig, invoicesConfig, deploymentsConfig } from '../configs';
import { formatDate, formatINR } from '@/lib/utils';

export default function ClientDetail() {
  const { id } = useParams();
  const cid = Number(id);
  const { data: c, isLoading } = useOne('clients', cid);
  const [tab, setTab] = useState('overview');
  const [edit, setEdit] = useState(false);
  const { data: deployments } = useList('deployments', { client_id: cid, status: 'ACTIVE', page_size: 1 });
  const { data: reqs } = useList('requisitions', { client_id: cid, page_size: 1 });
  const { data: invoices } = useList('invoices', { client_id: cid, page_size: 100 });
  if (isLoading || !c) return <Spinner />;
  const outstanding = (invoices?.items ?? []).reduce((s: number, i: any) => s + (i.status === 'DRAFT' ? 0 : i.balance_due), 0);
  const fixed = { client_id: cid };
  return (
    <>
      <PageHeader back={<Link to="/clients" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" />All clients</Link>}
        title={c.legal_name} subtitle={<span className="flex items-center gap-2">{c.code} · {c.industry_name} <StatusBadge value={c.status} /></span>}
        actions={<><Link to={`/invoices/new?client_id=${cid}`}><Button variant="secondary">Generate invoice</Button></Link><Button onClick={() => setEdit(true)}>Edit client</Button></>} />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[['Deployed employees', deployments?.total ?? 0], ['Requisitions', reqs?.total ?? 0], ['Invoices', invoices?.total ?? 0], ['Outstanding', formatINR(outstanding)]].map(([l, v]: any) => (
          <Card key={l} bodyClass="p-4"><p className="text-xs text-slate-500">{l}</p><p className="mt-1 text-2xl font-bold text-slate-900">{v}</p></Card>
        ))}
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'overview', label: 'Overview' }, { key: 'sites', label: 'Sites' }, { key: 'contacts', label: 'Contacts' },
        { key: 'contracts', label: 'Contracts & rates' }, { key: 'licenses', label: 'Licences' }, { key: 'deployments', label: 'Deployments' },
        { key: 'requisitions', label: 'Requisitions' }, { key: 'invoices', label: 'Invoices' }]} />
      {tab === 'overview' && (
        <Card title="Client details">
          <DetailGrid items={[['Legal name', c.legal_name], ['Trade name', c.trade_name], ['Client code', c.code], ['Industry', c.industry_name], ['GSTIN', c.gstin], ['PAN', c.pan],
            ['TAN (TDS)', c.tan], ['Place of supply', c.billing_state_name], ['Credit days', c.credit_days], ['Account manager', c.account_manager_name],
            ['Onboarded on', formatDate(c.onboarded_on)], ['Billing address', c.billing_address]]} />
        </Card>
      )}
      {tab === 'sites' && <ResourcePage config={sitesConfig} fixed={fixed} embedded />}
      {tab === 'contacts' && <ResourcePage config={contactsConfig} fixed={fixed} embedded />}
      {tab === 'contracts' && (
        <div className="space-y-5">
          <ResourcePage config={contractsConfig} fixed={fixed} embedded />
          <ResourcePage config={rateCardsConfig} embedded />
        </div>
      )}
      {tab === 'licenses' && <ResourcePage config={licensesConfig} fixed={fixed} embedded />}
      {tab === 'deployments' && <ResourcePage config={deploymentsConfig} fixed={fixed} embedded />}
      {tab === 'requisitions' && <ResourcePage config={requisitionsConfig} fixed={fixed} embedded />}
      {tab === 'invoices' && <ResourcePage config={invoicesConfig} fixed={fixed} embedded />}
      {edit && <ResourceForm config={clientsConfig} record={c} onClose={() => setEdit(false)} />}
    </>
  );
}

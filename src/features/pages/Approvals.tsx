import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useList, useAction } from '@/api/hooks';
import { Button, Card, EmptyState, Modal, PageHeader, StatusBadge, Tabs, Textarea, Badge } from '@/components/ui';
import { DataTable } from '@/components/DataTable';
import { formatDateTime, titleCase } from '@/lib/utils';

export default function Approvals() {
  const [tab, setTab] = useState('PENDING');
  const { data, isLoading } = useList('approval_requests', { status: tab, page_size: 50, sort: '-requested_at' });
  const [act, setAct] = useState<{ row: any; action: 'APPROVED' | 'REJECTED' } | null>(null);
  const decide = useAction((v: any) => `/approval_requests/${v.id}/decide`, { success: 'Decision recorded', onDone: () => setAct(null) });
  const [comments, setComments] = useState('');
  return (
    <>
      <PageHeader title="Approvals" subtitle="Payroll runs, invoices, leave, overtime, expenses and full-and-final settlements waiting for a decision." />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'PENDING', label: 'Pending', count: data && tab === 'PENDING' ? data.total : undefined }, { key: 'APPROVED', label: 'Approved' }, { key: 'REJECTED', label: 'Rejected' }]} />
      <Card bodyClass="p-0">
        <DataTable loading={isLoading} rows={data?.items ?? []} empty={<EmptyState title="Nothing waiting for approval" text="New requests appear here as soon as they are raised." />}
          columns={[
            { key: 'entity_type', header: 'Type', render: (r: any) => <Badge color="violet">{titleCase(r.entity_type)}</Badge> },
            { key: 'summary', header: 'Request' },
            { key: 'requested_by_name', header: 'Requested by' },
            { key: 'requested_at', header: 'Requested at', render: (r: any) => formatDateTime(r.requested_at) },
            { key: 'status', header: 'Status', render: (r: any) => <StatusBadge value={r.status} /> },
            { key: 'actions', header: '', align: 'right', render: (r: any) => r.status === 'PENDING' ? (
              <span className="inline-flex gap-2">
                <Button size="sm" variant="success" icon={<Check className="h-3.5 w-3.5" />} onClick={() => { setComments(''); setAct({ row: r, action: 'APPROVED' }); }}>Approve</Button>
                <Button size="sm" variant="secondary" icon={<X className="h-3.5 w-3.5" />} onClick={() => { setComments(''); setAct({ row: r, action: 'REJECTED' }); }}>Reject</Button>
              </span>) : '—' },
          ]} />
      </Card>
      <Modal open={!!act} onClose={() => setAct(null)} size="sm" title={act?.action === 'APPROVED' ? 'Approve request' : 'Reject request'}
        footer={<><Button variant="secondary" onClick={() => setAct(null)}>Cancel</Button>
          <Button variant={act?.action === 'APPROVED' ? 'success' : 'danger'} loading={decide.isPending}
            onClick={() => decide.mutate({ id: act!.row.id, action: act!.action, comments })}>{act?.action === 'APPROVED' ? 'Approve' : 'Reject'}</Button></>}>
        <p className="mb-3 text-sm text-slate-600">{act?.row.summary}</p>
        <Textarea placeholder="Comments (optional)" value={comments} onChange={(e) => setComments(e.target.value)} />
      </Modal>
    </>
  );
}

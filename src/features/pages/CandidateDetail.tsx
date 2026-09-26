import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, Mail } from 'lucide-react';
import { useOne, useList, useAction } from '@/api/hooks';
import { Button, Card, DetailGrid, PageHeader, Select, Spinner, StatusBadge, Tabs, Badge } from '@/components/ui';
import { DataTable } from '@/components/DataTable';
import { ResourceForm } from '@/components/ResourcePage';
import { candidatesConfig } from '../configs';
import { formatDate, formatDateTime, formatINR, titleCase } from '@/lib/utils';

const STAGES = ['SOURCED', 'SCREENED', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'INTERVIEWED', 'SELECTED', 'OFFERED', 'JOINED', 'REJECTED', 'DROPPED'];

export default function CandidateDetail() {
  const { id } = useParams();
  const cid = Number(id);
  const { data: c, isLoading } = useOne('candidates', cid);
  const { data: apps } = useList('applications', { candidate_id: cid, page_size: 50 });
  const { data: follow } = useList('follow_ups', { candidate_id: cid, page_size: 50 });
  const [tab, setTab] = useState('applications');
  const [edit, setEdit] = useState(false);
  const move = useAction((v: any) => `/applications/${v.id}/move`);
  if (isLoading || !c) return <Spinner />;
  return (
    <>
      <PageHeader back={<Link to="/candidates" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" />All candidates</Link>}
        title={c.full_name} subtitle={<span className="flex flex-wrap items-center gap-3">{c.candidate_code} <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{c.mobile}</span>
          {c.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{c.email}</span>} <StatusBadge value={c.status} /></span>}
        actions={<Button onClick={() => setEdit(true)}>Edit candidate</Button>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'applications', label: 'Applications', count: apps?.total }, { key: 'followups', label: 'Follow-ups', count: follow?.total }, { key: 'profile', label: 'Profile' }]} />
      {tab === 'applications' && (
        <Card bodyClass="p-0">
          <DataTable rows={apps?.items ?? []} columns={[
            { key: 'requisition_name', header: 'Requisition', render: (a: any) => <Link className="font-medium text-brand-600 hover:underline" to={`/requisitions/${a.requisition_id}`}>{a.requisition_name}</Link> },
            { key: 'client_name', header: 'Client' }, { key: 'designation_name', header: 'Position' }, { key: 'recruiter_name', header: 'Recruiter' },
            { key: 'stage', header: 'Stage', render: (a: any) => <StatusBadge value={a.stage} /> },
            { key: 'stage_updated_at', header: 'Updated', render: (a: any) => formatDateTime(a.stage_updated_at) },
            { key: 'move', header: 'Move to', align: 'right', render: (a: any) => <Select className="w-44" value="" placeholder="Change stage…" onChange={(e) => e.target.value && move.mutate({ id: a.id, stage: e.target.value })}
              options={STAGES.filter((s) => s !== a.stage).map((s) => ({ value: s, label: titleCase(s) }))} /> }]} />
        </Card>
      )}
      {tab === 'followups' && (
        <Card bodyClass="p-0">
          <DataTable rows={follow?.items ?? []} columns={[{ key: 'due_at', header: 'Due', render: (f: any) => formatDateTime(f.due_at) },
            { key: 'follow_up_type', header: 'Type', render: (f: any) => <Badge color="violet">{titleCase(f.follow_up_type)}</Badge> },
            { key: 'assigned_to_name', header: 'Assigned to' }, { key: 'status', header: 'Status', render: (f: any) => <StatusBadge value={f.status} /> }, { key: 'outcome_notes', header: 'Notes' }]} />
        </Card>
      )}
      {tab === 'profile' && (
        <Card title="Candidate profile">
          <DetailGrid items={[['Code', c.candidate_code], ['Mobile', c.mobile], ['Alternate mobile', c.alt_mobile], ['Email', c.email], ['Gender', titleCase(c.gender ?? '')],
            ['Date of birth', formatDate(c.date_of_birth)], ['City', c.current_city], ['State', c.state_name], ['Qualification', c.highest_qualification],
            ['Experience', `${c.experience_years ?? 0} years`], ['Current salary', formatINR(c.current_salary)], ['Expected salary', formatINR(c.expected_salary)],
            ['Source', titleCase(c.source ?? '')], ['Vendor', c.vendor_name], ['Owner recruiter', c.owner_recruiter_name],
            ['Skills', (c.skills ?? []).join(', ')], ['Languages', (c.languages ?? []).join(', ')]]} />
        </Card>
      )}
      {edit && <ResourceForm config={candidatesConfig} record={c} onClose={() => setEdit(false)} />}
    </>
  );
}

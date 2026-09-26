import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { useOne, useList, useSave, useAction, useAll } from '@/api/hooks';
import { Button, Card, DetailGrid, Modal, PageHeader, ProgressBar, Select, Spinner, StatusBadge, Tabs, Field } from '@/components/ui';
import { DataTable } from '@/components/DataTable';
import { ResourceForm, ResourcePage } from '@/components/ResourcePage';
import { requisitionsConfig } from '../configs';
import { formatDate, formatDateTime, formatINR, titleCase } from '@/lib/utils';

const STAGES = ['SOURCED', 'SCREENED', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'INTERVIEWED', 'SELECTED', 'OFFERED', 'JOINED', 'REJECTED', 'DROPPED'];

export default function RequisitionDetail() {
  const { id } = useParams();
  const rid = Number(id);
  const { data: r, isLoading } = useOne('requisitions', rid);
  const [tab, setTab] = useState('candidates');
  const [edit, setEdit] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const { data: apps } = useList('applications', { requisition_id: rid, page_size: 100 });
  const { data: allocs } = useList('requisition_allocations', { requisition_id: rid, page_size: 20 });
  const move = useAction((v: any) => `/applications/${v.id}/move`);
  if (isLoading || !r) return <Spinner />;
  return (
    <>
      <PageHeader back={<Link to="/requisitions" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" />All requisitions</Link>}
        title={`${r.req_no} · ${r.designation_name}`} subtitle={<span className="flex items-center gap-2">{r.client_name} · {r.site_name} <StatusBadge value={r.status} /> <StatusBadge value={r.priority} /></span>}
        actions={<><Button variant="secondary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>Add candidate</Button><Button onClick={() => setEdit(true)}>Edit</Button></>} />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card bodyClass="p-4"><p className="text-xs text-slate-500">Positions</p><p className="mt-1 text-2xl font-bold">{r.positions_filled} / {r.positions_required}</p>
          <ProgressBar className="mt-2" value={(r.positions_filled / r.positions_required) * 100} /></Card>
        <Card bodyClass="p-4"><p className="text-xs text-slate-500">Candidates in pipeline</p><p className="mt-1 text-2xl font-bold">{apps?.total ?? 0}</p></Card>
        <Card bodyClass="p-4"><p className="text-xs text-slate-500">Offered salary</p><p className="mt-1 text-2xl font-bold">{formatINR(r.offered_gross_monthly)}</p></Card>
        <Card bodyClass="p-4"><p className="text-xs text-slate-500">Required by</p><p className="mt-1 text-2xl font-bold">{formatDate(r.required_by)}</p></Card>
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'candidates', label: 'Candidates', count: apps?.total }, { key: 'allocation', label: 'Recruiter allocation', count: allocs?.total }, { key: 'details', label: 'Details' }]} />
      {tab === 'candidates' && (
        <Card bodyClass="p-0">
          <DataTable rows={apps?.items ?? []} columns={[
            { key: 'candidate_name', header: 'Candidate', render: (a: any) => <Link className="font-medium text-brand-600 hover:underline" to={`/candidates/${a.candidate_id}`}>{a.candidate_name}</Link> },
            { key: 'candidate_mobile', header: 'Mobile' }, { key: 'recruiter_name', header: 'Recruiter' },
            { key: 'sourced_on', header: 'Sourced', render: (a: any) => formatDate(a.sourced_on) },
            { key: 'stage', header: 'Stage', render: (a: any) => <StatusBadge value={a.stage} /> },
            { key: 'move', header: 'Move to', align: 'right', render: (a: any) => (
              <Select className="w-44" value="" onChange={(e) => e.target.value && move.mutate({ id: a.id, stage: e.target.value })} placeholder="Change stage…"
                options={STAGES.filter((s) => s !== a.stage).map((s) => ({ value: s, label: titleCase(s) }))} />) },
          ]} />
        </Card>
      )}
      {tab === 'allocation' && <AllocationTab rid={rid} allocs={allocs?.items ?? []} required={r.positions_required} />}
      {tab === 'details' && (
        <Card title="Requisition details">
          <DetailGrid items={[['Client', r.client_name], ['Site', r.site_name], ['Designation', r.designation_name], ['Shift', r.shift_name], ['Positions required', r.positions_required],
            ['Positions filled', r.positions_filled], ['Qualification', r.qualification], ['Experience', `${r.min_experience_years ?? 0} – ${r.max_experience_years ?? '—'} years`],
            ['Gender preference', titleCase(r.gender_preference ?? 'ANY')], ['Offered gross', formatINR(r.offered_gross_monthly)], ['Raised on', formatDate(r.raised_on)],
            ['Required by', formatDate(r.required_by)], ['Job description', r.job_description]]} />
        </Card>
      )}
      {edit && <ResourceForm config={requisitionsConfig} record={r} onClose={() => setEdit(false)} />}
      {addOpen && <AddCandidateModal rid={rid} onClose={() => setAddOpen(false)} />}
    </>
  );
}

function AllocationTab({ rid, allocs, required }: { rid: number; allocs: any[]; required: number }) {
  const [open, setOpen] = useState(false);
  const save = useSave('requisition_allocations', { success: 'Recruiter allocated', onDone: () => setOpen(false) });
  const { data: recruiters = [] } = useAll('users', { role: 'RECRUITER' });
  const [form, setForm] = useState({ recruiter_id: '', allocated_positions: '', target_date: '' });
  return (
    <Card title="Recruiter allocation" action={<Button size="sm" onClick={() => setOpen(true)}>Allocate</Button>} bodyClass="p-0">
      <DataTable rows={allocs} columns={[{ key: 'recruiter_name', header: 'Recruiter' }, { key: 'allocated_positions', header: 'Positions', align: 'right' },
        { key: 'target_date', header: 'Target date', render: (a: any) => formatDate(a.target_date) }, { key: 'allocated_at', header: 'Allocated', render: (a: any) => formatDateTime(a.allocated_at) }]} />
      <Modal open={open} onClose={() => setOpen(false)} title="Allocate positions to a recruiter" size="sm"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button loading={save.isPending} onClick={() => save.mutate({ data: { requisition_id: rid, recruiter_id: Number(form.recruiter_id), allocated_positions: Number(form.allocated_positions), target_date: form.target_date || null, allocated_by: 3 } })}>Allocate</Button></>}>
        <div className="space-y-4">
          <Field label="Recruiter" required><Select value={form.recruiter_id} onChange={(e) => setForm({ ...form, recruiter_id: e.target.value })} placeholder="Select recruiter"
            options={recruiters.map((u: any) => ({ value: u.id, label: u.full_name }))} /></Field>
          <Field label="Positions" required hint={`Requisition needs ${required}`}><input type="number" className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm"
            value={form.allocated_positions} onChange={(e) => setForm({ ...form, allocated_positions: e.target.value })} /></Field>
          <Field label="Target date"><input type="date" className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} /></Field>
        </div>
      </Modal>
    </Card>
  );
}

function AddCandidateModal({ rid, onClose }: { rid: number; onClose: () => void }) {
  const [q, setQ] = useState('');
  const { data } = useList('candidates', { search: q, status: 'ACTIVE', page_size: 8 });
  const save = useSave('applications', { success: 'Candidate added to requisition', onDone: onClose });
  return (
    <Modal open onClose={onClose} title="Add candidate to requisition">
      <input className="mb-3 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm" placeholder="Search candidates by name or mobile" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <ul className="divide-y divide-slate-100">
        {data?.items.map((c: any) => (
          <li key={c.id} className="flex items-center justify-between py-2.5">
            <div><p className="text-sm font-medium text-slate-800">{c.full_name}</p><p className="text-xs text-slate-500">{c.mobile} · {c.current_city} · {c.experience_years} yrs</p></div>
            <Button size="sm" variant="secondary" loading={save.isPending} onClick={() => save.mutate({ data: { requisition_id: rid, candidate_id: c.id, recruiter_id: c.owner_recruiter_id ?? 4, stage: 'SOURCED', sourced_on: new Date().toISOString().slice(0, 10) } })}>Add</Button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500">Not in the list? <Link to="/candidates?new=1" className="text-brand-600 hover:underline">Create a new candidate</Link>.</p>
    </Modal>
  );
}

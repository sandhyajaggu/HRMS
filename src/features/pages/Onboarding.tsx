import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, UserPlus } from 'lucide-react';
import { useList, useAction, useSave } from '@/api/hooks';
import { Button, Card, EmptyState, Modal, PageHeader, ProgressBar, Spinner, StatusBadge, Tabs, Badge } from '@/components/ui';
import { DataTable } from '@/components/DataTable';
import { formatDate } from '@/lib/utils';

export default function Onboarding() {
  const [tab, setTab] = useState('inprogress');
  const { data, isLoading } = useList('employee_onboardings', { page_size: 100 });
  const { data: offers } = useList('offers', { status: 'ACCEPTED', page_size: 50 });
  const [open, setOpen] = useState<any>(null);
  const convert = useAction((v: any) => `/offers/${v.id}/convert`, { success: 'Onboarding started' });
  const rows = (data?.items ?? []).filter((o: any) => (tab === 'completed' ? o.status === 'COMPLETED' : o.status !== 'COMPLETED'));
  const pendingOffers = (offers?.items ?? []).filter((o: any) => !(data?.items ?? []).some((x: any) => x.offer_id === o.id));
  if (isLoading) return <Spinner />;
  return (
    <>
      <PageHeader title="Onboarding" subtitle="Document collection, statutory registration and deployment confirmation for new joinees." />
      {pendingOffers.length > 0 && (
        <Card className="mb-5 border-brand-200 bg-brand-50/60" title="Accepted offers waiting to be onboarded">
          <ul className="divide-y divide-brand-100">
            {pendingOffers.map((o: any) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                <div><p className="text-sm font-medium text-slate-800">{o.candidate_name}</p>
                  <p className="text-xs text-slate-500">{o.position_name} · {o.client_name} · joining {formatDate(o.joining_date)}</p></div>
                <Button size="sm" icon={<UserPlus className="h-4 w-4" />} loading={convert.isPending} onClick={() => convert.mutate({ id: o.id })}>Start onboarding</Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'inprogress', label: 'In progress', count: (data?.items ?? []).filter((o: any) => o.status !== 'COMPLETED').length },
        { key: 'completed', label: 'Completed' }]} />
      <Card bodyClass="p-0">
        <DataTable rows={rows} onRowClick={(r) => setOpen(r)} columns={[
          { key: 'employee_code', header: 'Code' },
          { key: 'employee_name', header: 'Employee', render: (o: any) => <Link className="font-medium text-brand-600 hover:underline" to={`/employees/${o.employee_id}`} onClick={(e) => e.stopPropagation()}>{o.employee_name}</Link> },
          { key: 'designation_name', header: 'Designation' }, { key: 'client_name', header: 'Client' },
          { key: 'date_of_joining', header: 'Joining', render: (o: any) => formatDate(o.date_of_joining) },
          { key: 'progress', header: 'Checklist', render: (o: any) => <span className="flex items-center gap-2"><ProgressBar className="w-24" value={o.progress} />{o.progress}%</span> },
          { key: 'assigned_to_name', header: 'HR Ops' }, { key: 'status', header: 'Status', render: (o: any) => <StatusBadge value={o.status} /> }]}
          empty={<EmptyState title="No onboarding cases" text="Accepted offers appear here once you start onboarding." />} />
      </Card>
      {open && <ChecklistModal ob={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function ChecklistModal({ ob, onClose }: { ob: any; onClose: () => void }) {
  const save = useSave('employee_onboardings', { success: 'Checklist updated' });
  const complete = useAction(`/employee_onboardings/${ob.id}/complete`, { success: 'Onboarding completed, employee deployed', onDone: onClose });
  const [tasks, setTasks] = useState<any[]>(ob.tasks ?? []);
  const toggle = (id: number) => {
    const next = tasks.map((t) => (t.id === id ? { ...t, status: t.status === 'DONE' ? 'PENDING' : 'DONE' } : t));
    setTasks(next);
    save.mutate({ id: ob.id, data: { tasks: next } });
  };
  const done = tasks.filter((t) => t.status === 'DONE').length;
  return (
    <Modal open onClose={onClose} size="lg" title={`Onboarding: ${ob.employee_name}`}
      footer={<><Button variant="secondary" onClick={onClose}>Close</Button>
        <Button loading={complete.isPending} onClick={() => complete.mutate(undefined)}>Complete & deploy</Button></>}>
      <div className="mb-4 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm">
        <span className="text-slate-600">{ob.designation_name} · {ob.client_name} · joining {formatDate(ob.date_of_joining)}</span>
        <Badge color={done === tasks.length ? 'green' : 'amber'}>{done} of {tasks.length} done</Badge>
      </div>
      <ul className="divide-y divide-slate-100">
        {tasks.map((t) => (
          <li key={t.id}>
            <button className="flex w-full items-center gap-3 py-3 text-left hover:bg-slate-50" onClick={() => toggle(t.id)}>
              {t.status === 'DONE' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-slate-300" />}
              <span className={t.status === 'DONE' ? 'text-slate-400 line-through' : 'text-slate-700'}>{t.title}</span>
              {t.is_mandatory && <Badge color="slate" className="ml-auto">Mandatory</Badge>}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-slate-500">Completing onboarding activates the employee and turns the planned deployment into an active one.</p>
    </Modal>
  );
}

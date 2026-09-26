import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useList, useAction, useAll } from '@/api/hooks';
import { Card, PageHeader, Select, Spinner, Badge, Button } from '@/components/ui';
import { formatDate, cn } from '@/lib/utils';

const STAGES = [
  { key: 'SOURCED', label: 'Sourced', color: 'bg-slate-100 text-slate-700' },
  { key: 'SCREENED', label: 'Screened', color: 'bg-cyan-100 text-cyan-800' },
  { key: 'SHORTLISTED', label: 'Shortlisted', color: 'bg-violet-100 text-violet-800' },
  { key: 'INTERVIEW_SCHEDULED', label: 'Interview scheduled', color: 'bg-blue-100 text-blue-800' },
  { key: 'INTERVIEWED', label: 'Interviewed', color: 'bg-indigo-100 text-indigo-800' },
  { key: 'SELECTED', label: 'Selected', color: 'bg-emerald-100 text-emerald-800' },
  { key: 'OFFERED', label: 'Offered', color: 'bg-amber-100 text-amber-800' },
  { key: 'JOINED', label: 'Joined', color: 'bg-green-600 text-white' },
];

export default function Pipeline() {
  const [req, setReq] = useState('');
  const [client, setClient] = useState('');
  const { data: reqs = [] } = useAll('requisitions', client ? { client_id: client } : {});
  const { data, isLoading } = useList('applications', { page_size: 500, ...(req ? { requisition_id: req } : {}) });
  const move = useAction((v: any) => `/applications/${v.id}/move`);
  const [drag, setDrag] = useState<number | null>(null);
  const apps = (data?.items ?? []).filter((a: any) => !client || String(a.client_name) === String(reqs.find((r: any) => String(r.id) === req)?.client_name) || !req);
  return (
    <>
      <PageHeader title="Recruitment pipeline" subtitle="Drag a candidate card to the next stage, or use the buttons on the card."
        actions={<div className="flex gap-2">
          <Select className="w-52" value={client} placeholder="All clients" onChange={(e) => { setClient(e.target.value); setReq(''); }}
            options={[...new Map(reqs.map((r: any) => [r.client_id, { value: r.client_id, label: r.client_name }])).values()] as any} />
          <Select className="w-64" value={req} placeholder="All requisitions" onChange={(e) => setReq(e.target.value)}
            options={reqs.map((r: any) => ({ value: r.id, label: `${r.req_no} · ${r.designation_name}` }))} />
        </div>} />
      {isLoading ? <Spinner /> : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((s) => {
            const items = apps.filter((a: any) => a.stage === s.key);
            return (
              <div key={s.key} className="w-72 shrink-0" onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (drag) { move.mutate({ id: drag, stage: s.key }); setDrag(null); } }}>
                <div className="mb-2 flex items-center justify-between">
                  <span className={cn('rounded-md px-2 py-1 text-xs font-semibold', s.color)}>{s.label}</span>
                  <span className="text-xs font-medium text-slate-500">{items.length}</span>
                </div>
                <div className="min-h-[70vh] space-y-2 rounded-xl bg-slate-100/70 p-2">
                  {items.map((a: any) => (
                    <article key={a.id} draggable onDragStart={() => setDrag(a.id)} onDragEnd={() => setDrag(null)}
                      className="cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm active:cursor-grabbing">
                      <Link to={`/candidates/${a.candidate_id}`} className="text-sm font-semibold text-slate-800 hover:text-brand-600">{a.candidate_name}</Link>
                      <p className="mt-0.5 text-xs text-slate-500">{a.designation_name}</p>
                      <p className="text-xs text-slate-400">{a.client_name}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <Badge color="slate">{a.candidate_mobile}</Badge>
                        <span className="text-[11px] text-slate-400">{formatDate(a.stage_updated_at, 'dd MMM')}</span>
                      </div>
                      <div className="mt-2 flex gap-1">
                        {STAGES[STAGES.findIndex((x) => x.key === s.key) + 1] && (
                          <Button size="sm" variant="secondary" className="flex-1" onClick={() => move.mutate({ id: a.id, stage: STAGES[STAGES.findIndex((x) => x.key === s.key) + 1].key })}>Advance</Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => move.mutate({ id: a.id, stage: 'REJECTED', remarks: 'Rejected from pipeline' })}>Reject</Button>
                      </div>
                    </article>
                  ))}
                  {!items.length && <p className="px-2 py-6 text-center text-xs text-slate-400">No candidates</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText, Printer, Send, CheckCircle2, Plus } from 'lucide-react';
import { useAll, useFetch, useAction, useList } from '@/api/hooks';
import { resource } from '@/api/resources';
import { apiError } from '@/api/http';
import { Button, Card, DetailGrid, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, StatusBadge, Badge } from '@/components/ui';
import { DataTable } from '@/components/DataTable';
import { Donut } from '@/components/charts';
import { formatDate, formatINR, formatINRShort, formatMonth, monthStart, titleCase } from '@/lib/utils';
import { useAuth } from '@/auth/AuthContext';

// ------------------------------------------------------------------ generate invoice
export function InvoiceNew() {
  const [params] = useSearchParams();
  const { data: clients = [] } = useAll('clients');
  const [client, setClient] = useState(params.get('client_id') ?? '');
  const lastMonth = new Date(); lastMonth.setMonth(lastMonth.getMonth() - 1);
  const [month, setMonth] = useState(monthStart(lastMonth).slice(0, 7));
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const generate = useAction('/invoices/generate', { success: 'Invoice generated', onDone: (r: any) => window.location.assign(`${window.location.pathname}#/invoices/${r.id}`) });
  const run = async () => {
    setBusy(true); setError(''); setPreview(null);
    try { setPreview(await resource.action('/invoices/preview', { client_id: Number(client), period_month: `${month}-01` })); }
    catch (e) { setError(apiError(e)); }
    finally { setBusy(false); }
  };
  return (
    <>
      <PageHeader back={<Link to="/invoices" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" />All invoices</Link>}
        title="Generate invoice" subtitle="Invoice lines are built from locked attendance, the contract's billing model and its rate cards." />
      <Card className="mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Client" required className="w-64"><Select value={client} onChange={(e) => setClient(e.target.value)} placeholder="Select client" options={clients.map((c: any) => ({ value: c.id, label: c.legal_name }))} /></Field>
          <Field label="Billing month" required className="w-44"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></Field>
          <Button disabled={!client} loading={busy} onClick={run}>Preview invoice</Button>
        </div>
        {error && <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p>}
      </Card>
      {preview && (
        <Card title={`Preview · ${titleCase(preview.billing_model)} billing`} action={<Button icon={<FileText className="h-4 w-4" />} loading={generate.isPending}
          onClick={() => generate.mutate({ client_id: Number(client), period_month: `${month}-01` })}>Create invoice</Button>} bodyClass="p-0">
          <DataTable rows={preview.lines.map((l: any, i: number) => ({ ...l, id: i }))} columns={[
            { key: 'line_no', header: '#' }, { key: 'line_type', header: 'Type', render: (l: any) => <Badge color="slate">{titleCase(l.line_type)}</Badge> },
            { key: 'description', header: 'Description' }, { key: 'sac_code', header: 'SAC' }, { key: 'headcount', header: 'Staff', align: 'right' },
            { key: 'man_days', header: 'Man-days', align: 'right' }, { key: 'rate', header: 'Rate', align: 'right', render: (l: any) => formatINR(l.rate, true) },
            { key: 'amount', header: 'Amount', align: 'right', render: (l: any) => formatINR(l.amount, true) }]} />
          <div className="flex justify-end border-t border-slate-100 p-5">
            <dl className="w-72 space-y-1.5 text-sm">
              {[['Taxable value', preview.taxable_amount], ...(preview.igst_amount ? [['IGST 18%', preview.igst_amount]] : [['CGST 9%', preview.cgst_amount], ['SGST 9%', preview.sgst_amount]]), ['Round off', preview.round_off]].map(([l, v]: any) => (
                <div key={l} className="flex justify-between"><dt className="text-slate-600">{l}</dt><dd className="tabular-nums">{formatINR(v, true)}</dd></div>
              ))}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold"><dt>Invoice total</dt><dd className="tabular-nums">{formatINR(preview.total_amount)}</dd></div>
            </dl>
          </div>
        </Card>
      )}
    </>
  );
}

// ------------------------------------------------------------------ invoice detail
export function InvoiceDetail() {
  const { id } = useParams();
  const { data: inv, isLoading } = useFetch<any>(`/invoices/${id}/detail`);
  const submit = useAction(`/invoices/${id}/submit`, { success: 'Sent for approval' });
  const send = useAction(`/invoices/${id}/send`, { success: 'Invoice marked as sent' });
  const { hasRole } = useAuth();
  if (isLoading || !inv) return <Spinner />;
  return (
    <>
      <PageHeader back={<Link to="/invoices" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" />All invoices</Link>}
        title={inv.invoice_no} subtitle={<span className="flex items-center gap-2">{inv.client_name} · {formatDate(inv.period_from, 'MMM yyyy')} <StatusBadge value={inv.status} /></span>}
        actions={<div className="flex gap-2">
          <Button variant="secondary" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Print</Button>
          {inv.status === 'DRAFT' && <Button icon={<Send className="h-4 w-4" />} loading={submit.isPending} onClick={() => submit.mutate(undefined)}>Send for approval</Button>}
          {inv.status === 'APPROVED' && hasRole('MD', 'ACCOUNTS') && <Button icon={<CheckCircle2 className="h-4 w-4" />} loading={send.isPending} onClick={() => send.mutate(undefined)}>Mark as sent</Button>}
        </div>} />
      <Card className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">YSK Infotech Pvt Ltd</h2>
            <p className="text-sm text-slate-500">{inv.branch?.address}</p>
            <p className="text-sm text-slate-500">GSTIN: {inv.supplier_gstin}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-slate-400">Tax invoice</p>
            <p className="text-lg font-bold text-slate-900">{inv.invoice_no}</p>
            <p className="text-sm text-slate-500">Date: {formatDate(inv.invoice_date)}</p>
            <p className="text-sm text-slate-500">Due: {formatDate(inv.due_date)}</p>
          </div>
        </div>
        <div className="mb-6 grid gap-5 sm:grid-cols-2">
          <div><p className="text-xs font-semibold uppercase text-slate-400">Bill to</p>
            <p className="mt-1 font-semibold text-slate-800">{inv.client.legal_name}</p>
            <p className="text-sm text-slate-600">{inv.client.billing_address}</p>
            <p className="text-sm text-slate-600">GSTIN: {inv.client_gstin ?? '—'}</p></div>
          <div className="sm:text-right"><p className="text-xs font-semibold uppercase text-slate-400">Details</p>
            <p className="mt-1 text-sm text-slate-600">Period: {formatDate(inv.period_from)} – {formatDate(inv.period_to)}</p>
            <p className="text-sm text-slate-600">Place of supply: {inv.place_of_supply?.name} ({inv.place_of_supply?.gst_state_code})</p>
            <p className="text-sm text-slate-600">Reverse charge: No</p></div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead><tr className="border-y border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
              <th className="px-3 py-2 text-left">#</th><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-left">SAC</th>
              <th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Rate</th><th className="px-3 py-2 text-right">Amount</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {inv.lines.map((l: any) => (
                <tr key={l.id}><td className="px-3 py-2.5">{l.line_no}</td><td className="px-3 py-2.5">{l.description}</td><td className="px-3 py-2.5">{l.sac_code}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{l.quantity}</td><td className="px-3 py-2.5 text-right tabular-nums">{formatINR(l.rate, true)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatINR(l.amount, true)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 flex justify-end">
          <dl className="w-80 space-y-1.5 text-sm">
            {[['Taxable value', inv.taxable_amount], ...(inv.igst_amount ? [['IGST 18%', inv.igst_amount]] : [['CGST 9%', inv.cgst_amount], ['SGST 9%', inv.sgst_amount]]), ['Round off', inv.round_off]].map(([l, v]: any) => (
              <div key={l} className="flex justify-between"><dt className="text-slate-600">{l}</dt><dd className="tabular-nums">{formatINR(v, true)}</dd></div>
            ))}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold"><dt>Total</dt><dd className="tabular-nums">{formatINR(inv.total_amount)}</dd></div>
            <div className="flex justify-between text-emerald-700"><dt>Received</dt><dd className="tabular-nums">{formatINR(inv.amount_received)}</dd></div>
            <div className="flex justify-between font-semibold text-rose-700"><dt>Balance due</dt><dd className="tabular-nums">{formatINR(inv.balance_due)}</dd></div>
          </dl>
        </div>
        {inv.receipts?.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Receipts against this invoice</h3>
            <ul className="divide-y divide-slate-100 text-sm">
              {inv.receipts.map((a: any) => (
                <li key={a.id} className="flex justify-between py-2"><span className="text-slate-600">{a.receipt?.receipt_no} · {formatDate(a.receipt?.receipt_date)} · {a.receipt?.payment_mode} {a.receipt?.reference_no}</span>
                  <span className="tabular-nums">{formatINR(a.allocated_amount)} {a.tds_allocated > 0 && <span className="text-slate-400">+ TDS {formatINR(a.tds_allocated)}</span>}</span></li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-400">Subject to Hyderabad jurisdiction. This is a computer-generated invoice.</p>
      </Card>
    </>
  );
}

// ------------------------------------------------------------------ receipts with allocation
export function Receipts() {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useList('receipts', { page_size: 50, sort: '-receipt_date' });
  return (
    <>
      <PageHeader title="Receipts" subtitle="Record client payments and allocate them to open invoices. TDS deducted by the client is recorded separately."
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>Record receipt</Button>} />
      <Card bodyClass="p-0">
        <DataTable loading={isLoading} rows={data?.items ?? []} columns={[
          { key: 'receipt_no', header: 'Receipt' }, { key: 'receipt_date', header: 'Date', render: (r: any) => formatDate(r.receipt_date) },
          { key: 'client_name', header: 'Client' }, { key: 'amount_received', header: 'Amount', align: 'right', render: (r: any) => formatINR(r.amount_received) },
          { key: 'tds_amount', header: 'TDS', align: 'right', render: (r: any) => formatINR(r.tds_amount) },
          { key: 'payment_mode', header: 'Mode' }, { key: 'reference_no', header: 'Reference' },
          { key: 'unallocated_amount', header: 'Unallocated', align: 'right', render: (r: any) => (r.unallocated_amount > 0 ? <Badge color="amber">{formatINR(r.unallocated_amount)}</Badge> : '—') },
          { key: 'status', header: 'Status', render: (r: any) => <StatusBadge value={r.status} /> }]} />
      </Card>
      {open && <ReceiptModal onClose={() => setOpen(false)} />}
    </>
  );
}

function ReceiptModal({ onClose }: { onClose: () => void }) {
  const { data: clients = [] } = useAll('clients');
  const [form, setForm] = useState({ client_id: '', receipt_date: new Date().toISOString().slice(0, 10), amount_received: '', tds_amount: '', payment_mode: 'NEFT', reference_no: '' });
  const [alloc, setAlloc] = useState<Record<number, string>>({});
  const { data: invoices } = useList('invoices', { client_id: form.client_id, status__in: 'SENT,PARTIALLY_PAID,APPROVED', page_size: 50 }, !!form.client_id);
  const create = useAction('/receipts', { success: 'Receipt recorded', onDone: onClose });
  const open = (invoices?.items ?? []).filter((i: any) => i.balance_due > 0);
  const totalAlloc = useMemo(() => Object.values(alloc).reduce((s, v) => s + (Number(v) || 0), 0), [alloc]);
  const gross = (Number(form.amount_received) || 0) + (Number(form.tds_amount) || 0);
  const autoAllocate = () => {
    let left = gross;
    const next: Record<number, string> = {};
    open.forEach((i: any) => { const take = Math.min(left, i.balance_due); if (take > 0) { next[i.id] = String(Math.round(take)); left -= take; } });
    setAlloc(next);
  };
  return (
    <Modal open onClose={onClose} size="lg" title="Record receipt"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={create.isPending} disabled={!form.client_id || !form.amount_received}
          onClick={() => create.mutate({ ...form, client_id: Number(form.client_id), amount_received: Number(form.amount_received), tds_amount: Number(form.tds_amount || 0),
            allocations: Object.entries(alloc).map(([invoice_id, v]) => ({ invoice_id: Number(invoice_id), allocated_amount: Number(v) })) })}>Save receipt</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Client" required><Select value={form.client_id} onChange={(e) => { setForm({ ...form, client_id: e.target.value }); setAlloc({}); }} placeholder="Select client" options={clients.map((c: any) => ({ value: c.id, label: c.legal_name }))} /></Field>
        <Field label="Receipt date" required><Input type="date" value={form.receipt_date} onChange={(e) => setForm({ ...form, receipt_date: e.target.value })} /></Field>
        <Field label="Amount credited in bank" required><Input type="number" value={form.amount_received} onChange={(e) => setForm({ ...form, amount_received: e.target.value })} /></Field>
        <Field label="TDS deducted by client" hint="Section 194C"><Input type="number" value={form.tds_amount} onChange={(e) => setForm({ ...form, tds_amount: e.target.value })} /></Field>
        <Field label="Payment mode"><Select value={form.payment_mode} onChange={(e) => setForm({ ...form, payment_mode: e.target.value })} options={['NEFT', 'RTGS', 'IMPS', 'CHEQUE', 'UPI', 'CASH'].map((v) => ({ value: v, label: v }))} /></Field>
        <Field label="Reference (UTR / cheque no.)"><Input value={form.reference_no} onChange={(e) => setForm({ ...form, reference_no: e.target.value })} /></Field>
      </div>
      {form.client_id && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Allocate to invoices</h3>
            <Button size="sm" variant="secondary" onClick={autoAllocate}>Auto-allocate oldest first</Button>
          </div>
          {open.length === 0 ? <EmptyState title="No open invoices for this client" /> : (
            <table className="min-w-full text-sm">
              <thead><tr className="border-b border-slate-200 text-xs text-slate-500"><th className="py-2 text-left">Invoice</th><th className="py-2 text-left">Due</th><th className="py-2 text-right">Balance</th><th className="py-2 text-right">Allocate</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {open.map((i: any) => (
                  <tr key={i.id}><td className="py-2">{i.invoice_no}</td><td className="py-2">{formatDate(i.due_date)}</td>
                    <td className="py-2 text-right tabular-nums">{formatINR(i.balance_due)}</td>
                    <td className="py-2 text-right"><Input className="ml-auto w-32 text-right" type="number" value={alloc[i.id] ?? ''} onChange={(e) => setAlloc({ ...alloc, [i.id]: e.target.value })} /></td></tr>
                ))}
              </tbody>
            </table>
          )}
          <p className={`mt-3 text-sm ${totalAlloc > gross ? 'text-rose-600' : 'text-slate-500'}`}>Allocated {formatINR(totalAlloc)} of {formatINR(gross)} (amount + TDS)</p>
        </div>
      )}
    </Modal>
  );
}

// ------------------------------------------------------------------ receivables
export function Receivables() {
  const { data, isLoading } = useFetch<any>('/reports/receivables_aging');
  const { data: dash } = useFetch<any>('/dashboard/accounts');
  if (isLoading || !data) return <Spinner />;
  const total = data.rows.reduce((s: number, r: any) => s + r.balance, 0);
  return (
    <>
      <PageHeader title="Receivables" subtitle="Outstanding invoices by age. Chase the oldest buckets first." />
      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card title="Aging" className="lg:col-span-1">
          {dash && <Donut data={dash.aging} colors={['#22C55E', '#2F6FEB', '#F59E0B', '#8B5CF6', '#EF4444']} center={formatINRShort(total)} centerLabel="Outstanding" valueFormat={(v) => formatINRShort(v)} height={190} />}
        </Card>
        <Card title="Top overdue clients" className="lg:col-span-2" bodyClass="p-0">
          <DataTable rows={(dash?.top_overdue ?? []).map((c: any, i: number) => ({ ...c, id: i }))} columns={[
            { key: 'name', header: 'Client' }, { key: 'amount', header: 'Overdue amount', align: 'right', render: (c: any) => formatINR(c.amount) },
            { key: 'days', header: 'Days overdue', align: 'right', render: (c: any) => <span className="font-semibold text-rose-600">{c.days}</span> }]} />
        </Card>
      </div>
      <Card title="Open invoices" bodyClass="p-0">
        <DataTable rows={data.rows.map((r: any, i: number) => ({ ...r, id: i }))} columns={[
          { key: 'client', header: 'Client' }, { key: 'invoice_no', header: 'Invoice' },
          { key: 'invoice_date', header: 'Invoice date', render: (r: any) => formatDate(r.invoice_date) },
          { key: 'due_date', header: 'Due date', render: (r: any) => formatDate(r.due_date) },
          { key: 'balance', header: 'Balance', align: 'right', render: (r: any) => formatINR(r.balance) },
          { key: 'age', header: 'Age (days)', align: 'right', render: (r: any) => <Badge color={r.age > 90 ? 'red' : r.age > 60 ? 'amber' : 'slate'}>{r.age}</Badge> }]} />
      </Card>
    </>
  );
}

// ------------------------------------------------------------------ TDS & GST
export function TaxPage() {
  const { data: tds } = useList('tds_certificates', { page_size: 50 });
  const { data: gst } = useList('gst_returns', { page_size: 50 });
  const { data: stat } = useList('statutory_payments', { page_size: 50 });
  return (
    <>
      <PageHeader title="TDS & GST" subtitle="Form 16A certificates received from clients, GST return filing status and other statutory payments." />
      <div className="space-y-5">
        <Card title="TDS certificates (Form 16A)" bodyClass="p-0">
          <DataTable rows={tds?.items ?? []} empty={<EmptyState title="No certificates recorded" />} columns={[
            { key: 'client_name', header: 'Client' }, { key: 'quarter', header: 'Quarter', render: (r: any) => `Q${r.quarter}` },
            { key: 'certificate_no', header: 'Certificate' }, { key: 'tds_amount', header: 'TDS amount', align: 'right', render: (r: any) => formatINR(r.tds_amount) },
            { key: 'received_on', header: 'Received', render: (r: any) => formatDate(r.received_on) }]} />
        </Card>
        <Card title="GST returns" bodyClass="p-0">
          <DataTable rows={gst?.items ?? []} empty={<EmptyState title="No returns recorded yet" text="GSTR-1 and GSTR-3B filing status appears here." />} columns={[
            { key: 'return_type', header: 'Return' }, { key: 'period_month', header: 'Period', render: (r: any) => formatMonth(r.period_month) },
            { key: 'taxable_value', header: 'Taxable value', align: 'right', render: (r: any) => formatINR(r.taxable_value) },
            { key: 'total_tax', header: 'Tax', align: 'right', render: (r: any) => formatINR(r.total_tax) },
            { key: 'due_date', header: 'Due date', render: (r: any) => formatDate(r.due_date) }, { key: 'status', header: 'Status', render: (r: any) => <StatusBadge value={r.status} /> }]} />
        </Card>
        <Card title="Other statutory payments" bodyClass="p-0">
          <DataTable rows={stat?.items ?? []} columns={[
            { key: 'payment_type', header: 'Type' }, { key: 'period_month', header: 'Period', render: (r: any) => formatMonth(r.period_month) },
            { key: 'amount', header: 'Amount', align: 'right', render: (r: any) => formatINR(r.amount) },
            { key: 'due_date', header: 'Due date', render: (r: any) => formatDate(r.due_date) },
            { key: 'paid_on', header: 'Paid on', render: (r: any) => formatDate(r.paid_on) }, { key: 'status', header: 'Status', render: (r: any) => <StatusBadge value={r.status} /> }]} />
        </Card>
      </div>
    </>
  );
}

/* Axios adapter that serves every API call from the in-memory mock database.
   Endpoint shapes are the contract for the FastAPI backend (see README → API contract). */
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { getDB, persist, resetDB } from './db';
import * as E from './engine';

const LATENCY = 180;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Collections exposed through the generic CRUD endpoints
const READONLY = new Set(['activity_log', 'audit_log', 'application_stage_history', 'roles', 'permissions', 'role_permissions']);
const SEARCH_FIELDS: Record<string, string[]> = {
  employees: ['employee_code', 'first_name', 'last_name', 'mobile', 'uan'], candidates: ['candidate_code', 'full_name', 'mobile', 'email', 'current_city'],
  clients: ['code', 'legal_name', 'gstin'], requisitions: ['req_no', 'job_description'], invoices: ['invoice_no'], users: ['full_name', 'email'],
};
const AUTO_NUMBER: Record<string, [string, string]> = {
  requisitions: ['req_no', 'REQUISITION'], candidates: ['candidate_code', 'CANDIDATE'], offers: ['offer_no', 'OFFER'], receipts: ['receipt_no', 'RECEIPT'],
  expenses: ['expense_no', 'EXPENSE'], support_tickets: ['ticket_no', 'TICKET'], credit_notes: ['credit_note_no', 'CREDIT_NOTE'], payroll_runs: ['run_no', 'PAYROLL_RUN'],
};

function respond(config: InternalAxiosRequestConfig, status: number, data: any): AxiosResponse {
  return { data, status, statusText: String(status), headers: {}, config, request: {} };
}
function fail(config: InternalAxiosRequestConfig, status: number, detail: string) {
  const err: any = new Error(detail);
  err.isAxiosError = true;
  err.config = config;
  err.response = respond(config, status, { detail });
  return err;
}

function currentUser(config: InternalAxiosRequestConfig) {
  const h = String(config.headers?.Authorization ?? '');
  const m = h.match(/^Bearer mock\.(\d+)\./);
  return m ? E.byId('users', Number(m[1])) : undefined;
}
const tokensFor = (id: number) => ({ access_token: `mock.${id}.${Date.now()}`, refresh_token: `mockrefresh.${id}`, token_type: 'bearer' });
const publicUser = (u: any) => { const { password, ...rest } = u; return rest; };

function list(c: string, q: Record<string, any>) {
  let rows = [...E.T(c)];
  const { page = 1, page_size = 20, search, sort, ...filters } = q;
  for (const [k, raw] of Object.entries(filters)) {
    if (raw === undefined || raw === '') continue;
    const v = String(raw);
    if (k.endsWith('__in')) { const f = k.slice(0, -4); const set = v.split(','); rows = rows.filter((r) => set.includes(String(r[f]))); }
    else if (k.endsWith('__gte')) { const f = k.slice(0, -5); rows = rows.filter((r) => String(r[f] ?? '') >= v); }
    else if (k.endsWith('__lte')) { const f = k.slice(0, -5); rows = rows.filter((r) => String(r[f] ?? '') <= v); }
    else if (k.endsWith('__ne')) { const f = k.slice(0, -4); rows = rows.filter((r) => String(r[f]) !== v); }
    else if (k === 'role') rows = rows.filter((r) => (r.roles ?? []).includes(v));
    else if (k === 'recruiter_mine') rows = rows;
    else rows = rows.filter((r) => (Array.isArray(r[k]) ? r[k].map(String).includes(v) : String(r[k]) === v));
  }
  let dec = rows.map((r) => E.decorate(c, r));
  if (search) {
    const s = String(search).toLowerCase();
    const fields = SEARCH_FIELDS[c];
    dec = dec.filter((r) => (fields ? fields.map((f) => r[f]) : Object.values(r)).concat(r.full_name ?? '', r.client_name ?? '', r.employee_name ?? '', r.candidate_name ?? '')
      .some((v) => v !== null && typeof v !== 'object' && String(v).toLowerCase().includes(s)));
  }
  const key = sort ? String(sort).replace(/^-/, '') : 'id';
  const dir = sort ? (String(sort).startsWith('-') ? -1 : 1) : -1;
  dec.sort((a, b) => { const x = a[key], y = b[key]; if (x === y) return 0; if (x == null) return 1; if (y == null) return -1; return (x > y ? 1 : -1) * dir; });
  const p = Number(page), ps = Number(page_size);
  return { items: dec.slice((p - 1) * ps, p * ps), total: dec.length, page: p, page_size: ps };
}

type Handler = (m: RegExpMatchArray, body: any, q: Record<string, any>, user: any) => any;
const routes: [string, RegExp, Handler][] = [
  ['GET', /^\/dashboard\/(\w+)$/, (m, _b, _q, u) => E.dashboard(m[1].toUpperCase(), u)],
  ['GET', /^\/reports\/(\w+)$/, (m, _b, q) => E.report(m[1], q)],
  ['GET', /^\/attendance\/grid$/, (_m, _b, q) => E.attendanceGrid(q)],
  ['POST', /^\/attendance\/bulk$/, (_m, b, _q, u) => E.bulkAttendance(b, u.id)],
  ['POST', /^\/attendance_periods\/(\d+)\/(submit|approve|lock|reopen)$/, (m, _b, _q, u) => E.transitionPeriod(+m[1], m[2], u.id)],
  ['POST', /^\/applications\/(\d+)\/move$/, (m, b, _q, u) => E.moveApplication(+m[1], b.stage, b.remarks ?? '', u.id)],
  ['POST', /^\/offers\/(\d+)\/convert$/, (m, _b, _q, u) => E.convertOffer(+m[1], u.id)],
  ['POST', /^\/employee_onboardings\/(\d+)\/complete$/, (m, _b, _q, u) => E.completeOnboarding(+m[1], u.id)],
  ['POST', /^\/payroll_runs\/(\d+)\/compute$/, (m) => E.computePayroll(+m[1])],
  ['POST', /^\/payroll_runs\/(\d+)\/submit$/, (m, _b, _q, u) => { const r = E.byId('payroll_runs', +m[1])!; if (r.status !== 'COMPUTED') throw new E.ApiError(409, 'Compute the run first'); r.status = 'UNDER_REVIEW'; return E.submitForApproval('PAYROLL_RUN', r.id, `Payroll ${r.run_no}: ${E.byId('clients', r.client_id)?.legal_name}, ${r.employee_count} employees, net ₹${r.total_net.toLocaleString('en-IN')}`, u.id); }],
  ['POST', /^\/payroll_runs\/(\d+)\/mark-paid$/, (m, _b, _q, u) => { const r = E.byId('payroll_runs', +m[1])!; if (r.status !== 'APPROVED') throw new E.ApiError(409, 'Only approved runs can be marked paid'); r.status = 'PAID'; r.paid_at = new Date().toISOString(); E.T('payslips').filter((p) => p.payroll_run_id === r.id && p.status !== 'ON_HOLD').forEach((p) => { p.status = 'PAID'; p.paid_at = r.paid_at; }); E.T('salary_advances').filter((a) => a.status === 'ACTIVE').forEach((a) => { const ps = E.T('payslips').find((p) => p.payroll_run_id === r.id && p.employee_id === a.employee_id); if (ps) { a.recovered_amount = Math.min(a.amount, a.recovered_amount + a.instalment_amount); if (a.recovered_amount >= a.amount) a.status = 'CLOSED'; } }); E.log('PAYROLL_PAID', 'payroll_runs', r.id, `Salaries paid for ${E.byId('clients', r.client_id)?.legal_name}`, u.id, r.client_id); return r; }],
  ['GET', /^\/payslips\/(\d+)\/detail$/, (m) => { const p = E.byId('payslips', +m[1]); if (!p) throw new E.ApiError(404, 'Not found'); const e = E.byId('employees', p.employee_id)!; const dep = E.byId('deployments', p.deployment_id); const bank = E.T('employee_bank_accounts').find((b) => b.employee_id === e.id && b.is_primary); return { ...E.decorate('payslips', p), employee: E.decorate('employees', e), client_name: E.byId('clients', dep?.client_id)?.legal_name, designation_name: E.byId('designations', dep?.designation_id)?.name, bank, lines: E.T('payslip_lines').filter((l) => l.payslip_id === p.id).map((l) => ({ ...l, ...(({ code, name, component_type }) => ({ code, name, component_type }))(E.byId('salary_components', l.component_id)!) })) }; }],
  ['POST', /^\/invoices\/preview$/, (_m, b) => E.previewInvoice(b)],
  ['POST', /^\/invoices\/generate$/, (_m, b, _q, u) => E.createInvoice(b, u.id)],
  ['POST', /^\/invoices\/(\d+)\/submit$/, (m, _b, _q, u) => { const i = E.byId('invoices', +m[1])!; if (i.status !== 'DRAFT') throw new E.ApiError(409, 'Only drafts can be submitted'); i.status = 'PENDING_APPROVAL'; return E.submitForApproval('INVOICE', i.id, `Invoice ${i.invoice_no}: ${E.byId('clients', i.client_id)?.legal_name}, ₹${i.total_amount.toLocaleString('en-IN')}`, u.id); }],
  ['POST', /^\/invoices\/(\d+)\/send$/, (m, _b, _q, u) => { const i = E.byId('invoices', +m[1])!; if (i.status !== 'APPROVED') throw new E.ApiError(409, 'Invoice must be approved before sending'); i.status = 'SENT'; i.sent_at = new Date().toISOString(); E.log('INVOICE_SENT', 'invoices', i.id, `Invoice ${i.invoice_no} sent to client`, u.id, i.client_id); return i; }],
  ['POST', /^\/invoices\/(\d+)\/cancel$/, (m, b) => { const i = E.byId('invoices', +m[1])!; if (i.amount_received > 0) throw new E.ApiError(409, 'Invoice has receipts; issue a credit note instead'); i.status = 'CANCELLED'; i.cancel_reason = b?.reason; return i; }],
  ['GET', /^\/invoices\/(\d+)\/detail$/, (m) => { const i = E.byId('invoices', +m[1]); if (!i) throw new E.ApiError(404, 'Not found'); const c = E.byId('clients', i.client_id)!; return { ...E.decorate('invoices', i), client: c, branch: E.byId('branches', i.branch_id), lines: E.T('invoice_lines').filter((l) => l.invoice_id === i.id).map((l) => E.decorate('invoice_lines', l)).sort((a, b) => a.line_no - b.line_no), receipts: E.T('receipt_allocations').filter((a) => a.invoice_id === i.id).map((a) => ({ ...a, receipt: E.byId('receipts', a.receipt_id) })), place_of_supply: E.byId('states', i.place_of_supply_state_id) }; }],
  ['POST', /^\/receipts$/, (_m, b, _q, u) => E.recordReceipt(b, u.id)],
  ['POST', /^\/approval_requests\/(\d+)\/decide$/, (m, b, _q, u) => E.decideApproval(+m[1], b.action, b.comments ?? '', u)],
  ['GET', /^\/employee_exits\/(\d+)\/fnf-draft$/, (m) => E.fnfDraft(+m[1])],
  ['POST', /^\/employee_exits\/(\d+)\/complete$/, (m, _b, _q, u) => E.completeExit(+m[1], u.id)],
  ['POST', /^\/leave_requests$/, (_m, b, _q, u) => { const lr = E.insert('leave_requests', { ...b, status: 'PENDING' }, u.id); E.submitForApproval('LEAVE', lr.id, `${E.empName(lr.employee_id)}: ${E.byId('leave_types', lr.leave_type_id)?.code} ${lr.days} day(s) from ${lr.from_date}`, u.id); return lr; }],
  ['POST', /^\/overtime_requests$/, (_m, b, _q, u) => { const o = E.insert('overtime_requests', { ...b, status: 'PENDING' }, u.id); E.submitForApproval('OVERTIME', o.id, `${E.empName(o.employee_id)}: ${o.ot_minutes / 60} h overtime on ${o.ot_date}`, u.id); return o; }],
  ['POST', /^\/expenses$/, (_m, b, _q, u) => { const x = E.insert('expenses', { ...b, expense_no: E.nextNumber('EXPENSE'), status: 'SUBMITTED' }, u.id); E.submitForApproval('EXPENSE', x.id, `Expense ${x.expense_no}: ₹${Number(x.amount).toLocaleString('en-IN')}`, u.id); return x; }],
  ['POST', /^\/fnf_settlements\/(\d+)\/submit$/, (m, _b, _q, u) => { const f = E.byId('fnf_settlements', +m[1])!; return E.submitForApproval('FNF', f.id, `F&F for ${E.empName(f.employee_id)}: ₹${Number(f.net_payable).toLocaleString('en-IN')}`, u.id); }],
  ['POST', /^\/notifications\/read-all$/, (_m, _b, _q, u) => { E.T('notifications').filter((n) => n.user_id === u.id).forEach((n) => (n.is_read = true)); return { ok: true }; }],
  ['GET', /^\/roles\/matrix$/, () => ({ roles: E.T('roles'), permissions: E.T('permissions'), grants: E.T('role_permissions') })],
  ['POST', /^\/roles\/(\d+)\/permissions$/, (m, b) => { const rid = +m[1]; getDB().role_permissions = E.T('role_permissions').filter((g) => g.role_id !== rid); (b.permission_ids as number[]).forEach((pid) => E.T('role_permissions').push({ id: Date.now() + pid, role_id: rid, permission_id: pid })); return { ok: true }; }],
  ['POST', /^\/admin\/reset-demo$/, () => { resetDB(); E.bootstrap(); return { ok: true }; }],
  ['GET', /^\/search$/, (_m, _b, q) => { const s = String(q.q ?? '').toLowerCase(); if (s.length < 2) return []; const hit = (v: any) => String(v ?? '').toLowerCase().includes(s);
    return [...E.T('employees').filter((e) => hit(e.employee_code) || hit(`${e.first_name} ${e.last_name}`) || hit(e.mobile)).slice(0, 5).map((e) => ({ type: 'Employee', label: `${e.first_name} ${e.last_name ?? ''} (${e.employee_code})`, path: `/employees/${e.id}` })),
      ...E.T('candidates').filter((c) => hit(c.full_name) || hit(c.mobile) || hit(c.candidate_code)).slice(0, 5).map((c) => ({ type: 'Candidate', label: `${c.full_name} (${c.candidate_code})`, path: `/candidates/${c.id}` })),
      ...E.T('clients').filter((c) => hit(c.legal_name) || hit(c.code)).slice(0, 3).map((c) => ({ type: 'Client', label: c.legal_name, path: `/clients/${c.id}` })),
      ...E.T('invoices').filter((i) => hit(i.invoice_no)).slice(0, 3).map((i) => ({ type: 'Invoice', label: i.invoice_no, path: `/invoices/${i.id}` }))]; }],
];

export const mockAdapter: AxiosAdapter = async (config) => {
  await wait(LATENCY);
  getDB();
  E.bootstrap();
  const method = (config.method ?? 'get').toUpperCase();
  const url = (config.url ?? '').replace(/^https?:\/\/[^/]+/, '').replace(config.baseURL ?? '', '').split('?')[0];
  const q = { ...(config.params ?? {}) };
  let body: any = config.data;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { /* keep */ } }

  try {
    // ---- auth (no token needed)
    if (url === '/auth/login' && method === 'POST') {
      const u = E.T('users').find((x) => x.email.toLowerCase() === String(body?.email ?? '').toLowerCase());
      if (!u || u.password !== body?.password) throw new E.ApiError(401, 'Invalid email or password');
      if (u.status !== 'ACTIVE') throw new E.ApiError(403, 'Account is disabled');
      u.last_login_at = new Date().toISOString(); persist();
      return respond(config, 200, tokensFor(u.id));
    }
    if (url === '/auth/refresh' && method === 'POST') {
      const m = String(body?.refresh_token ?? '').match(/^mockrefresh\.(\d+)$/);
      if (!m) throw new E.ApiError(401, 'Invalid refresh token');
      return respond(config, 200, tokensFor(+m[1]));
    }
    const user = currentUser(config);
    if (!user) throw new E.ApiError(401, 'Not authenticated');
    if (url === '/auth/me') return respond(config, 200, publicUser(user));
    if (url === '/auth/change-password' && method === 'POST') {
      if (user.password !== body.current_password) throw new E.ApiError(400, 'Current password is incorrect');
      user.password = body.new_password; persist(); return respond(config, 200, { ok: true });
    }

    // ---- custom routes
    for (const [m, re, h] of routes) {
      const match = url.match(re);
      if (match && m === method) {
        const data = h(match, body ?? {}, q, user);
        if (method !== 'GET') persist();
        return respond(config, 200, data);
      }
    }

    // ---- generic CRUD
    const parts = url.split('/').filter(Boolean);
    const [c, id] = parts;
    if (!c || parts.length > 2) throw new E.ApiError(404, `No route ${method} ${url}`);
    const db = getDB();
    if (!db[c]) throw new E.ApiError(404, `Unknown resource ${c}`);
    if (method === 'GET' && !id) {
      if (c === 'notifications') q.user_id = user.id;
      return respond(config, 200, list(c, q));
    }
    if (method === 'GET' && id) {
      const row = E.byId(c, id);
      if (!row) throw new E.ApiError(404, `${c} ${id} not found`);
      return respond(config, 200, E.decorate(c, row));
    }
    if (READONLY.has(c)) throw new E.ApiError(405, 'Read-only resource');
    if (method === 'POST') {
      const data = { ...body };
      const an = AUTO_NUMBER[c];
      if (an && !data[an[0]]) data[an[0]] = E.nextNumber(an[1]);
      if (c === 'employees' && !data.employee_code) data.employee_code = `YSK${String(E.T('employees').length + 1).padStart(4, '0')}`;
      if (c === 'deployments' && !data.deployment_no) data.deployment_no = `DEP-${String(E.T('deployments').length + 1).padStart(5, '0')}`;
      if (c === 'deployments') {
        const overlap = E.T('deployments').find((d) => d.employee_id === Number(data.employee_id) && d.status !== 'CANCELLED' && d.status !== 'ENDED' && (!data.end_date || d.start_date <= data.end_date) && (!d.end_date || d.end_date >= data.start_date));
        if (overlap) throw new E.ApiError(409, `Employee already has deployment ${overlap.deployment_no} in this period`);
      }
      if (c === 'candidates' && E.T('candidates').some((x) => x.mobile === data.mobile)) throw new E.ApiError(409, 'A candidate with this mobile number already exists');
      if (c === 'applications' && E.T('applications').some((x) => x.requisition_id === Number(data.requisition_id) && x.candidate_id === Number(data.candidate_id))) throw new E.ApiError(409, 'Candidate is already in this requisition');
      if (c === 'users') { data.password = data.password || 'demo123'; data.roles = data.roles ?? []; }
      const rec = E.insert(c, data, user.id);
      if (c === 'fnf_settlements') rec.net_payable = ['pending_salary', 'leave_encashment', 'bonus', 'gratuity', 'other_earnings'].reduce((s2, k) => s2 + Number(rec[k] || 0), 0) - ['notice_recovery', 'advance_recovery', 'asset_recovery', 'other_deductions'].reduce((s2, k) => s2 + Number(rec[k] || 0), 0);
      if (c === 'employee_exits') ['HR', 'OPERATIONS', 'ACCOUNTS', 'CLIENT_SITE', 'ASSETS'].forEach((department) => E.insert('exit_clearances', { exit_id: rec.id, department, status: 'PENDING', dues_amount: 0 }, user.id));
      if (c === 'employee_exits') { const e = E.byId('employees', rec.employee_id); if (e) e.status = 'NOTICE'; }
      if (c === 'requisitions') E.log('REQUISITION_CREATED', c, rec.id, `New requirement ${rec.req_no}: ${rec.positions_required} x ${E.byId('designations', rec.designation_id)?.name} for ${E.byId('clients', rec.client_id)?.legal_name}`, user.id, rec.client_id);
      if (c === 'interviews') { const a = E.byId('applications', rec.application_id); if (a && ['SOURCED', 'SCREENED', 'SHORTLISTED'].includes(a.stage)) E.moveApplication(a.id, 'INTERVIEW_SCHEDULED', 'Interview scheduled', user.id); }
      if (c === 'offers') { const a = E.byId('applications', rec.application_id); if (a && a.stage !== 'OFFERED') E.moveApplication(a.id, 'OFFERED', 'Offer created', user.id); }
      persist();
      return respond(config, 201, E.decorate(c, rec));
    }
    if ((method === 'PATCH' || method === 'PUT') && id) {
      const row = E.byId(c, id);
      if (!row) throw new E.ApiError(404, `${c} ${id} not found`);
      if (c === 'invoices' && !['DRAFT'].includes(row.status) && body && Object.keys(body).some((k) => k !== 'status')) throw new E.ApiError(409, 'Only draft invoices can be edited');
      Object.assign(row, body, { updated_at: new Date().toISOString(), updated_by: user.id });
      if (c === 'fnf_settlements') row.net_payable = ['pending_salary', 'leave_encashment', 'bonus', 'gratuity', 'other_earnings'].reduce((s, k) => s + Number(row[k] || 0), 0) - ['notice_recovery', 'advance_recovery', 'asset_recovery', 'other_deductions'].reduce((s, k) => s + Number(row[k] || 0), 0);
      if (c === 'leave_balances') row.closing = row.opening + row.accrued - row.used - row.encashed - row.lapsed;
      persist();
      return respond(config, 200, E.decorate(c, row));
    }
    if (method === 'DELETE' && id) {
      const before = db[c].length;
      db[c] = db[c].filter((r) => r.id !== Number(id));
      if (db[c].length === before) throw new E.ApiError(404, 'Not found');
      persist();
      return respond(config, 204, null);
    }
    throw new E.ApiError(405, 'Method not allowed');
  } catch (e: any) {
    if (e instanceof E.ApiError) throw fail(config, e.status, e.message);
    console.error('[mock]', e);
    throw fail(config, 500, e?.message ?? 'Mock server error');
  }
};

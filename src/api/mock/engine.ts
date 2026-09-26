/* Business logic for the mock backend. The FastAPI services should implement the same rules;
   this file doubles as a readable spec for payroll, billing and dashboard calculations. */
import { addDays, format, getDaysInMonth, parseISO, startOfMonth, subMonths, startOfWeek, differenceInCalendarDays, subDays } from 'date-fns';
import { getDB, nextId, type Rec } from './db';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const now = () => new Date().toISOString();
const round = (n: number) => Math.round(n);
const r2 = (n: number) => Math.round(n * 100) / 100;
const sum = (a: any[], f: (x: any) => number) => a.reduce((s, x) => s + (Number(f(x)) || 0), 0);
const monthOf = (d: string) => d.slice(0, 7);

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

// ---------------------------------------------------------------- helpers
export const T = (c: string) => getDB()[c] ?? (getDB()[c] = []);
export const byId = (c: string, id: any) => T(c).find((x) => x.id === Number(id));
export function insert(c: string, row: Record<string, any>, userId?: number): Rec {
  const rec = { id: nextId(c), created_at: now(), updated_at: now(), created_by: userId ?? null, ...row } as Rec;
  T(c).push(rec);
  return rec;
}
export function nextNumber(docType: string): string {
  const s = T('number_series').find((x) => x.doc_type === docType);
  if (!s) return `${docType}-${Date.now()}`;
  const n = s.next_number++;
  return `${s.prefix}${String(n).padStart(s.padding, '0')}`;
}
export function log(action: string, entity_type: string, entity_id: number, summary: string, actor_id?: number, client_id?: number | null) {
  insert('activity_log', { actor_id: actor_id ?? null, action, entity_type, entity_id, client_id: client_id ?? null, summary });
}
export function notify(roleCodes: string[], title: string, body: string, entity_type?: string, entity_id?: number, priority = 'NORMAL') {
  T('users').filter((u) => u.roles.some((r: string) => roleCodes.includes(r))).forEach((u) =>
    insert('notifications', { user_id: u.id, notif_type: entity_type ?? 'INFO', title, body, entity_type, entity_id, priority, is_read: false }));
}
export const empName = (id: number) => { const e = byId('employees', id); return e ? `${e.first_name} ${e.last_name ?? ''}`.trim() : ''; };
const setting = (p: string) => Number(T('statutory_settings').find((s) => s.parameter === p)?.value ?? 0);

// ---------------------------------------------------------------- display decoration (the API adds *_name fields)
const NAME: Record<string, [string, (r: Rec) => string]> = {
  client_id: ['clients', (r) => r.legal_name], site_id: ['client_sites', (r) => r.name], designation_id: ['designations', (r) => r.name],
  employee_id: ['employees', (r) => `${r.first_name} ${r.last_name ?? ''}`.trim()], candidate_id: ['candidates', (r) => r.full_name],
  recruiter_id: ['users', (r) => r.full_name], assigned_to: ['users', (r) => r.full_name], owner_recruiter_id: ['users', (r) => r.full_name],
  requested_by: ['users', (r) => r.full_name], raised_by: ['users', (r) => r.full_name], owner_id: ['users', (r) => r.full_name], account_manager_id: ['users', (r) => r.full_name],
  requisition_id: ['requisitions', (r) => r.req_no], contract_id: ['contracts', (r) => r.contract_no], leave_type_id: ['leave_types', (r) => r.name],
  payroll_run_id: ['payroll_runs', (r) => r.run_no], invoice_id: ['invoices', (r) => r.invoice_no], shift_id: ['shifts', (r) => r.name], vendor_id: ['vendors', (r) => r.name],
  industry_id: ['industries', (r) => r.name], state_id: ['states', (r) => r.name], billing_state_id: ['states', (r) => r.name], category_id: ['expense_categories', (r) => r.name],
  salary_structure_id: ['salary_structures', (r) => r.name], component_id: ['salary_components', (r) => r.name], leave_policy_id: ['leave_policies', (r) => r.name],
  branch_id: ['branches', (r) => r.name], approver_role_id: ['roles', (r) => r.name], calendar_id: ['holiday_calendars', (r) => r.name],
};
export function decorate(c: string, row: Rec): Rec {
  const out: Rec = { ...row };
  for (const k of Object.keys(row)) {
    const m = NAME[k];
    if (m && row[k] != null) {
      const ref = byId(m[0], row[k]);
      if (ref) out[k.replace(/_id$/, '') + '_name'] = m[1](ref);
    }
  }
  if (c === 'employees') {
    out.full_name = `${row.first_name} ${row.last_name ?? ''}`.trim();
    const dep = T('deployments').filter((d) => d.employee_id === row.id && ['ACTIVE', 'PLANNED'].includes(d.status)).at(-1);
    if (dep) { out.current_client_name = byId('clients', dep.client_id)?.legal_name; out.current_designation_name = byId('designations', dep.designation_id)?.name; out.current_site_name = byId('client_sites', dep.site_id)?.name; }
  }
  if (c === 'applications') { const cand = byId('candidates', row.candidate_id); out.candidate_mobile = cand?.mobile; const q = byId('requisitions', row.requisition_id); out.client_name = byId('clients', q?.client_id)?.legal_name; out.designation_name = byId('designations', q?.designation_id)?.name; }
  if (c === 'interviews' || c === 'offers') { const a = byId('applications', row.application_id); if (a) { out.candidate_name = byId('candidates', a.candidate_id)?.full_name; const q = byId('requisitions', a.requisition_id); out.client_name = byId('clients', q?.client_id)?.legal_name; out.position_name = byId('designations', q?.designation_id)?.name; out.requisition_id = a.requisition_id; out.candidate_id = a.candidate_id; } }
  if (c === 'requisitions') out.open_positions = Math.max(0, row.positions_required - row.positions_filled);
  if (c === 'employee_onboardings') { const e = byId('employees', row.employee_id); out.employee_code = e?.employee_code; out.date_of_joining = e?.date_of_joining; const t = row.tasks ?? []; out.progress = t.length ? Math.round((t.filter((x: any) => x.status !== 'PENDING').length / t.length) * 100) : 0; const d = T('deployments').find((x) => x.employee_id === row.employee_id); out.client_name = byId('clients', d?.client_id)?.legal_name; out.designation_name = byId('designations', d?.designation_id)?.name; }
  if (c === 'employee_exits') out.employee_code = byId('employees', row.employee_id)?.employee_code;
  if (c === 'payslips') out.employee_code = byId('employees', row.employee_id)?.employee_code;
  if (c === 'users') { out.role_names = (row.roles ?? []).map((code: string) => T('roles').find((r) => r.code === code)?.name).join(', '); delete out.password; }
  if (c === 'invoices') out.days_overdue = row.balance_due > 0 ? Math.max(0, differenceInCalendarDays(new Date(), parseISO(row.due_date))) : 0;
  return out;
}

// ---------------------------------------------------------------- attendance
function monthDays(month: string) {
  const start = parseISO(month.length === 7 ? month + '-01' : month);
  return Array.from({ length: getDaysInMonth(start) }, (_, i) => iso(addDays(start, i)));
}
export function attendanceGrid(q: { client_id?: string; site_id?: string; month?: string }) {
  const month = (q.month || iso(startOfMonth(new Date()))).slice(0, 7);
  const days = monthDays(month);
  const clientId = Number(q.client_id);
  const deps = T('deployments').filter((d) => d.client_id === clientId && (!q.site_id || d.site_id === Number(q.site_id)) && d.status !== 'CANCELLED'
    && d.start_date <= days.at(-1)! && (!d.end_date || d.end_date >= days[0]));
  const att = T('attendance').filter((a) => monthOf(a.attendance_date) === month);
  const idx = new Map(att.map((a) => [`${a.employee_id}|${a.attendance_date}`, a]));
  const period = T('attendance_periods').find((p) => p.client_id === clientId && monthOf(p.period_month) === month) ?? null;
  const rows = deps.map((d) => {
    const e = byId('employees', d.employee_id)!;
    const cells: Record<string, { status: string; ot_minutes: number } | null> = {};
    const s = { P: 0, A: 0, HD: 0, L: 0, WO: 0, H: 0, OT: 0 };
    days.forEach((day) => {
      const a = idx.get(`${d.employee_id}|${day}`);
      cells[day] = a ? { status: a.status, ot_minutes: a.ot_minutes } : null;
      if (!a) return;
      if (a.status === 'PRESENT' || a.status === 'ON_DUTY') s.P++; else if (a.status === 'ABSENT') s.A++; else if (a.status === 'HALF_DAY') s.HD++;
      else if (a.status === 'LEAVE') s.L++; else if (a.status === 'WEEKLY_OFF') s.WO++; else if (a.status === 'HOLIDAY') s.H++;
      s.OT += a.ot_minutes || 0;
    });
    return { deployment_id: d.id, employee_id: e.id, employee_code: e.employee_code, name: `${e.first_name} ${e.last_name ?? ''}`.trim(),
      designation: byId('designations', d.designation_id)?.name, start_date: d.start_date, end_date: d.end_date, cells,
      summary: { ...s, paid_days: s.P + s.WO + s.H + s.L + s.HD * 0.5, ot_hours: r2(s.OT / 60) } };
  });
  return { month, days, period, rows };
}
export function bulkAttendance(body: { rows: { employee_id?: number; employee_code?: string; attendance_date: string; status: string; ot_minutes?: number }[]; source?: string }, userId: number) {
  const errors: { row: number; message: string }[] = [];
  let success = 0;
  const valid = ['PRESENT', 'ABSENT', 'HALF_DAY', 'WEEKLY_OFF', 'HOLIDAY', 'LEAVE', 'ON_DUTY', 'COMP_OFF'];
  const codes: Record<string, string> = { P: 'PRESENT', A: 'ABSENT', HD: 'HALF_DAY', WO: 'WEEKLY_OFF', H: 'HOLIDAY', L: 'LEAVE', OD: 'ON_DUTY' };
  body.rows.forEach((row, i) => {
    const emp = row.employee_id ? byId('employees', row.employee_id) : T('employees').find((e) => e.employee_code === row.employee_code);
    const status = codes[String(row.status).toUpperCase()] ?? String(row.status).toUpperCase();
    if (!emp) return errors.push({ row: i + 1, message: `Unknown employee ${row.employee_code ?? row.employee_id}` });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.attendance_date)) return errors.push({ row: i + 1, message: `Invalid date ${row.attendance_date}` });
    if (!valid.includes(status)) return errors.push({ row: i + 1, message: `Invalid status ${row.status}` });
    const dep = T('deployments').find((d) => d.employee_id === emp.id && d.status !== 'CANCELLED' && d.start_date <= row.attendance_date && (!d.end_date || d.end_date >= row.attendance_date));
    if (!dep) return errors.push({ row: i + 1, message: `${emp.employee_code} is not deployed on ${row.attendance_date}` });
    const period = T('attendance_periods').find((p) => p.client_id === dep.client_id && monthOf(p.period_month) === monthOf(row.attendance_date));
    if (period && period.status === 'LOCKED') return errors.push({ row: i + 1, message: `Attendance for ${monthOf(row.attendance_date)} is locked` });
    const existing = T('attendance').find((a) => a.employee_id === emp.id && a.attendance_date === row.attendance_date);
    const data = { status, ot_minutes: Number(row.ot_minutes ?? 0), worked_minutes: status === 'PRESENT' ? 480 : status === 'HALF_DAY' ? 240 : 0, source: body.source ?? 'MANUAL', updated_at: now() };
    if (existing) Object.assign(existing, data);
    else insert('attendance', { employee_id: emp.id, deployment_id: dep.id, attendance_date: row.attendance_date, shift_id: 1, late_minutes: 0, ...data }, userId);
    success++;
  });
  return { success, errors };
}
export function transitionPeriod(id: number, action: string, userId: number) {
  const p = byId('attendance_periods', id);
  if (!p) throw new ApiError(404, 'Period not found');
  const flow: Record<string, [string, string]> = { submit: ['OPEN', 'SUBMITTED'], approve: ['SUBMITTED', 'APPROVED'], lock: ['APPROVED', 'LOCKED'], reopen: ['SUBMITTED', 'OPEN'] };
  const f = flow[action];
  if (!f) throw new ApiError(400, 'Unknown action');
  if (p.status !== f[0]) throw new ApiError(409, `Period is ${p.status}; cannot ${action}`);
  p.status = f[1];
  if (action === 'submit') { p.submitted_by = userId; p.submitted_at = now(); }
  if (action === 'approve') { p.approved_at = now(); p.client_approved_by = p.client_approved_by || 'Client HR'; }
  if (action === 'lock') { p.locked_by = userId; p.locked_at = now(); }
  log(`ATTENDANCE_${f[1]}`, 'attendance_periods', p.id, `Attendance ${f[1].toLowerCase()} for ${byId('clients', p.client_id)?.legal_name} (${format(parseISO(p.period_month), 'MMM yyyy')})`, userId, p.client_id);
  return p;
}

// ---------------------------------------------------------------- payroll engine
function ptFor(gross: number) {
  const slab = T('professional_tax_slabs').find((s) => gross >= s.min_gross && (s.max_gross == null || gross <= s.max_gross));
  return slab ? Number(slab.tax_amount) : 0;
}
export function computePayroll(runId: number) {
  const run = byId('payroll_runs', runId);
  if (!run) throw new ApiError(404, 'Payroll run not found');
  if (!['DRAFT', 'COMPUTED', 'UNDER_REVIEW'].includes(run.status)) throw new ApiError(409, `Run is ${run.status}; cannot recompute`);
  const month = monthOf(run.period_month);
  const days = monthDays(month);
  const mdays = days.length;
  const period = T('attendance_periods').find((p) => p.client_id === run.client_id && monthOf(p.period_month) === month);
  if (!period || period.status !== 'LOCKED') throw new ApiError(409, 'Lock the attendance period for this client and month before running payroll');
  // clear previous result
  const old = T('payslips').filter((p) => p.payroll_run_id === run.id).map((p) => p.id);
  getDB().payslip_lines = T('payslip_lines').filter((l) => !old.includes(l.payslip_id));
  getDB().payslips = T('payslips').filter((p) => p.payroll_run_id !== run.id);

  const ceiling = setting('PF_WAGE_CEILING'), pfRate = setting('PF_EE_RATE') / 100, esiLimit = setting('ESI_WAGE_LIMIT');
  const esiEE = setting('ESI_EE_RATE') / 100, esiER = setting('ESI_ER_RATE') / 100, epsRate = setting('PF_ER_EPS_RATE') / 100;
  const comp = (code: string) => T('salary_components').find((c) => c.code === code)!.id;
  const deps = T('deployments').filter((d) => d.client_id === run.client_id && d.status !== 'CANCELLED' && d.start_date <= days.at(-1)! && (!d.end_date || d.end_date >= days[0]));
  const att = T('attendance').filter((a) => monthOf(a.attendance_date) === month);

  for (const d of deps) {
    const rows = att.filter((a) => a.employee_id === d.employee_id);
    if (!rows.length) continue;
    const cnt = (s: string) => rows.filter((a) => a.status === s).length;
    const present = cnt('PRESENT') + cnt('ON_DUTY') + cnt('HALF_DAY') * 0.5;
    const wo = cnt('WEEKLY_OFF'), hol = cnt('HOLIDAY'), leave = cnt('LEAVE');
    const lop = cnt('ABSENT') + cnt('HALF_DAY') * 0.5 + (mdays - rows.length);
    const paid = present + wo + hol + leave;
    const otHours = r2(sum(rows, (a) => a.ot_minutes) / 60);
    const asg = T('employee_salary_assignments').filter((s) => s.employee_id === d.employee_id && s.effective_from <= days.at(-1)!).at(-1);
    if (!asg) continue;
    const gross = Number(asg.gross_monthly);
    const f = paid / mdays;
    const basic = round(gross * 0.5 * f), hra = round(gross * 0.2 * f), conv = round(Math.min(1600, gross * 0.1) * f);
    const spl = round(gross * f) - basic - hra - conv;
    const ot = round(otHours * (gross / mdays / 8) * 2);
    const earnings = basic + hra + conv + spl + ot;
    const emp = byId('employees', d.employee_id)!;
    const pfWages = emp.pf_applicable ? Math.min(basic, ceiling) : 0;
    const pfEE = round(pfWages * pfRate), pfER = round(pfWages * pfRate);
    const esiEligible = emp.esi_applicable && gross <= esiLimit;
    const esiWages = esiEligible ? earnings : 0;
    const esiEEamt = Math.ceil(esiWages * esiEE), esiERamt = Math.ceil(esiWages * esiER);
    const pt = emp.pt_applicable ? ptFor(earnings) : 0;
    const adv = T('salary_advances').find((a) => a.employee_id === d.employee_id && a.status === 'ACTIVE');
    const advAmt = adv ? Math.min(adv.instalment_amount, adv.amount - adv.recovered_amount) : 0;
    const deductions = pfEE + esiEEamt + pt + advAmt;
    const ps = insert('payslips', { payroll_run_id: run.id, employee_id: d.employee_id, deployment_id: d.id, designation_id: d.designation_id, salary_assignment_id: asg.id,
      period_month: run.period_month, month_days: mdays, present_days: present, weekly_offs: wo, holidays: hol, paid_leave_days: leave, lop_days: lop, paid_days: paid,
      ot_hours: otHours, gross_monthly: gross, gross_earnings: earnings, total_deductions: deductions, net_pay: earnings - deductions, pf_wages: pfWages, esi_wages: esiWages,
      employer_pf: pfER, employer_esi: esiERamt, eps_share: round(pfWages * epsRate), status: 'COMPUTED' });
    const lines: [string, number, string][] = [['BASIC', basic, `50% of gross x ${paid}/${mdays}`], ['HRA', hra, '20% of gross'], ['CONV', conv, ''], ['SPL', spl, 'balancing'],
      ['OT', ot, `${otHours} h at 2x`], ['PF_EE', pfEE, `12% of ${pfWages}`], ['ESI_EE', esiEEamt, esiEligible ? `0.75% of ${esiWages}` : 'not eligible'],
      ['PT', pt, ''], ['ADV', advAmt, ''], ['PF_ER', pfER, ''], ['ESI_ER', esiERamt, '']];
    lines.filter(([code, a]) => a !== 0 || code === 'BASIC').forEach(([code, amount, calc_note]) => insert('payslip_lines', { payslip_id: ps.id, component_id: comp(code), component_code: code, amount, calc_note }));
  }
  const slips = T('payslips').filter((p) => p.payroll_run_id === run.id);
  Object.assign(run, { status: 'COMPUTED', employee_count: slips.length, total_gross: sum(slips, (p) => p.gross_earnings), total_deductions: sum(slips, (p) => p.total_deductions),
    total_net: sum(slips, (p) => p.net_pay), total_employer_contribution: sum(slips, (p) => p.employer_pf + p.employer_esi), computed_at: now(), updated_at: now() });
  return run;
}
export function submitForApproval(entity_type: string, entity_id: number, summary: string, userId: number) {
  const existing = T('approval_requests').find((a) => a.entity_type === entity_type && a.entity_id === entity_id && a.status === 'PENDING');
  if (existing) return existing;
  const req = insert('approval_requests', { entity_type, entity_id, summary, requested_by: userId, requested_at: now(), current_level: 1, status: 'PENDING' });
  const wf = T('approval_workflows').find((w) => w.entity_type === entity_type && w.level === 1);
  insert('approval_steps', { request_id: req.id, level: 1, approver_role_id: wf?.approver_role_id ?? 2, action: 'PENDING' });
  const role = byId('roles', wf?.approver_role_id ?? 2)?.code ?? 'OPS_MANAGER';
  notify([role, 'MD'], 'Approval needed', summary, 'approval_requests', req.id, 'HIGH');
  return req;
}
const ENTITY_TABLE: Record<string, string> = { PAYROLL_RUN: 'payroll_runs', INVOICE: 'invoices', LEAVE: 'leave_requests', OVERTIME: 'overtime_requests', EXPENSE: 'expenses', FNF: 'fnf_settlements', REQUISITION: 'requisitions', ADVANCE: 'salary_advances' };
export function decideApproval(id: number, action: 'APPROVED' | 'REJECTED', comments: string, user: Rec) {
  const req = byId('approval_requests', id);
  if (!req) throw new ApiError(404, 'Approval not found');
  if (req.status !== 'PENDING') throw new ApiError(409, 'Already decided');
  const step = T('approval_steps').find((s) => s.request_id === id && s.level === req.current_level);
  if (step) Object.assign(step, { action, approver_id: user.id, acted_at: now(), comments });
  Object.assign(req, { status: action, decided_at: now() });
  const ent = byId(ENTITY_TABLE[req.entity_type], req.entity_id);
  if (ent) {
    const map: Record<string, [string, string]> = { PAYROLL_RUN: ['APPROVED', 'DRAFT'], INVOICE: ['APPROVED', 'DRAFT'], LEAVE: ['APPROVED', 'REJECTED'], OVERTIME: ['APPROVED', 'REJECTED'],
      EXPENSE: ['APPROVED', 'REJECTED'], FNF: ['APPROVED', 'DRAFT'], REQUISITION: ['OPEN', 'CANCELLED'], ADVANCE: ['ACTIVE', 'WRITTEN_OFF'] };
    ent.status = action === 'APPROVED' ? map[req.entity_type][0] : map[req.entity_type][1];
    if (req.entity_type === 'LEAVE' && action === 'APPROVED') applyLeaveToAttendance(ent, user.id);
    if (req.entity_type === 'OVERTIME' && action === 'APPROVED') { const a = T('attendance').find((x) => x.employee_id === ent.employee_id && x.attendance_date === ent.ot_date); if (a) a.ot_minutes = ent.ot_minutes; }
  }
  log(`APPROVAL_${action}`, 'approval_requests', id, `${titleCase(req.entity_type)} ${action.toLowerCase()}: ${req.summary}`, user.id);
  return req;
}
function applyLeaveToAttendance(lr: Rec, userId: number) {
  for (let d = parseISO(lr.from_date); iso(d) <= lr.to_date; d = addDays(d, 1)) bulkAttendance({ rows: [{ employee_id: lr.employee_id, attendance_date: iso(d), status: 'LEAVE' }], source: 'SYSTEM' }, userId);
  const bal = T('leave_balances').find((b) => b.employee_id === lr.employee_id && b.leave_type_id === lr.leave_type_id);
  if (bal) { bal.used += Number(lr.days); bal.closing = bal.opening + bal.accrued - bal.used - bal.encashed - bal.lapsed; }
}
const titleCase = (s: string) => s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

// ---------------------------------------------------------------- billing engine
export function previewInvoice(q: { client_id: number; period_month: string }) {
  const client = byId('clients', q.client_id);
  if (!client) throw new ApiError(404, 'Client not found');
  const contract = T('contracts').find((c) => c.client_id === client.id && c.status === 'ACTIVE');
  if (!contract) throw new ApiError(409, 'No active contract for this client');
  const month = monthOf(q.period_month);
  const period = T('attendance_periods').find((p) => p.client_id === client.id && monthOf(p.period_month) === month);
  if (!period || period.status !== 'LOCKED') throw new ApiError(409, 'Attendance for this month must be locked before invoicing');
  const dup = T('invoices').find((i) => i.client_id === client.id && monthOf(i.period_from) === month && i.status !== 'CANCELLED');
  if (dup) throw new ApiError(409, `Invoice ${dup.invoice_no} already exists for this month`);
  const branch = byId('branches', client.branch_id)!;
  const lines: any[] = [];
  const days = monthDays(month);
  if (contract.billing_model === 'COST_PLUS') {
    const run = T('payroll_runs').find((r) => r.client_id === client.id && monthOf(r.period_month) === month && ['APPROVED', 'PAID', 'LOCKED'].includes(r.status));
    if (!run) throw new ApiError(409, 'Cost-plus billing needs an approved payroll run for this month');
    const slips = T('payslips').filter((p) => p.payroll_run_id === run.id);
    const byDes = new Map<number, any[]>();
    slips.forEach((s) => byDes.set(s.designation_id, [...(byDes.get(s.designation_id) ?? []), s]));
    byDes.forEach((ss, did) => lines.push({ line_type: 'MANPOWER', designation_id: did, description: `Manpower cost: ${byId('designations', did)?.name} (${ss.length} staff)`,
      headcount: ss.length, man_days: sum(ss, (s) => s.paid_days), quantity: 1, rate: sum(ss, (s) => s.gross_earnings), amount: sum(ss, (s) => s.gross_earnings), gst_rate: 18 }));
    const stat = sum(slips, (s) => s.employer_pf + s.employer_esi);
    lines.push({ line_type: 'STATUTORY', description: 'Employer PF & ESI contribution (at actuals)', quantity: 1, rate: stat, amount: stat, gst_rate: 18 });
    const base = sum(lines, (l) => l.amount);
    const sc = r2(base * Number(contract.service_charge_percent) / 100);
    lines.push({ line_type: 'SERVICE_CHARGE', description: `Service charge @ ${contract.service_charge_percent}%`, quantity: 1, rate: sc, amount: sc, gst_rate: 18 });
    lines.forEach((l) => (l.payroll_run_id = run.id));
  } else {
    const grid = attendanceGrid({ client_id: String(client.id), month });
    const cards = T('contract_rate_cards').filter((rc) => rc.contract_id === contract.id);
    const byDes = new Map<number, { hc: number; paid: number; ot: number }>();
    grid.rows.forEach((row) => {
      const dep = byId('deployments', row.deployment_id)!;
      const cur = byDes.get(dep.designation_id) ?? { hc: 0, paid: 0, ot: 0 };
      cur.hc++; cur.paid += row.summary.paid_days; cur.ot += row.summary.ot_hours;
      byDes.set(dep.designation_id, cur);
    });
    byDes.forEach((v, did) => {
      const rc = cards.find((c) => c.designation_id === did);
      if (!rc) return;
      const name = byId('designations', did)?.name;
      if (rc.rate_unit === 'DAY') lines.push({ line_type: 'MANPOWER', designation_id: did, rate_card_id: rc.id, description: `${name}: ${v.paid} man-days`, headcount: v.hc, man_days: v.paid, quantity: v.paid, rate: rc.billing_rate, amount: r2(v.paid * rc.billing_rate), gst_rate: 18 });
      else { const q2 = r2(v.paid / days.length); lines.push({ line_type: 'MANPOWER', designation_id: did, rate_card_id: rc.id, description: `${name}: ${v.hc} staff, ${v.paid} paid days`, headcount: v.hc, man_days: v.paid, quantity: q2, rate: rc.billing_rate, amount: r2(q2 * rc.billing_rate), gst_rate: 18 }); }
      if (v.ot > 0 && rc.ot_rate_per_hour) lines.push({ line_type: 'OVERTIME', designation_id: did, rate_card_id: rc.id, description: `${name}: overtime ${v.ot} h`, quantity: v.ot, rate: rc.ot_rate_per_hour, amount: r2(v.ot * rc.ot_rate_per_hour), gst_rate: 18 });
    });
  }
  lines.forEach((l, i) => { l.line_no = i + 1; l.sac_code = '998519'; });
  const taxable = r2(sum(lines, (l) => l.amount));
  const intra = client.billing_state_id === branch.state_id;
  const gst = r2(taxable * 0.18);
  const cgst = intra ? r2(gst / 2) : 0, sgst = intra ? r2(gst / 2) : 0, igst = intra ? 0 : gst;
  const raw = taxable + cgst + sgst + igst;
  const total = Math.round(raw);
  const start = parseISO(month + '-01');
  return { client_id: client.id, contract_id: contract.id, attendance_period_id: period.id, branch_id: branch.id, financial_year_id: 1,
    period_from: iso(start), period_to: days.at(-1), place_of_supply_state_id: client.billing_state_id, supplier_gstin: branch.gstin, client_gstin: client.gstin,
    taxable_amount: taxable, cgst_amount: cgst, sgst_amount: sgst, igst_amount: igst, round_off: r2(total - raw), total_amount: total, billing_model: contract.billing_model, lines };
}
export function createInvoice(body: any, userId: number, dateOverride?: Date) {
  const p = previewInvoice(body);
  const invDate = dateOverride ?? new Date();
  const client = byId('clients', p.client_id)!;
  const inv = insert('invoices', { ...p, lines: undefined, billing_model: undefined, invoice_no: nextNumber('INVOICE'), invoice_date: iso(invDate), due_date: iso(addDays(invDate, client.credit_days)),
    amount_received: 0, balance_due: p.total_amount, status: 'DRAFT' }, userId);
  p.lines.forEach((l: any) => insert('invoice_lines', { invoice_id: inv.id, ...l }));
  log('INVOICE_GENERATED', 'invoices', inv.id, `Invoice ${inv.invoice_no} generated for ${client.legal_name}`, userId, client.id);
  return inv;
}
export function recordReceipt(body: any, userId: number) {
  const allocs: { invoice_id: number; allocated_amount: number; tds_allocated?: number }[] = body.allocations ?? [];
  const totalAlloc = sum(allocs, (a) => Number(a.allocated_amount) + Number(a.tds_allocated ?? 0));
  const gross = Number(body.amount_received) + Number(body.tds_amount ?? 0) + Number(body.other_deductions ?? 0);
  if (totalAlloc - gross > 0.5) throw new ApiError(422, 'Allocated amount exceeds the receipt amount (incl. TDS)');
  const rc = insert('receipts', { receipt_no: nextNumber('RECEIPT'), client_id: Number(body.client_id), company_bank_account_id: body.company_bank_account_id ?? 2, receipt_date: body.receipt_date,
    amount_received: Number(body.amount_received), tds_amount: Number(body.tds_amount ?? 0), other_deductions: Number(body.other_deductions ?? 0), payment_mode: body.payment_mode,
    reference_no: body.reference_no, status: 'RECORDED', unallocated_amount: r2(gross - totalAlloc) }, userId);
  allocs.filter((a) => Number(a.allocated_amount) + Number(a.tds_allocated ?? 0) > 0).forEach((a) => {
    insert('receipt_allocations', { receipt_id: rc.id, invoice_id: a.invoice_id, allocated_amount: Number(a.allocated_amount), tds_allocated: Number(a.tds_allocated ?? 0) });
    const inv = byId('invoices', a.invoice_id)!;
    inv.amount_received = r2(inv.amount_received + Number(a.allocated_amount) + Number(a.tds_allocated ?? 0));
    inv.balance_due = r2(inv.total_amount - inv.amount_received);
    inv.status = inv.balance_due <= 0.5 ? 'PAID' : 'PARTIALLY_PAID';
  });
  log('RECEIPT_RECORDED', 'receipts', rc.id, `Receipt ${rc.receipt_no} of ₹${rc.amount_received.toLocaleString('en-IN')} recorded`, userId, rc.client_id);
  return rc;
}

// ---------------------------------------------------------------- recruitment workflow
const STAGE_ORDER = ['SOURCED', 'SCREENED', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'INTERVIEWED', 'SELECTED', 'OFFERED', 'JOINED'];
export function moveApplication(id: number, stage: string, remarks: string, userId: number) {
  const app = byId('applications', id);
  if (!app) throw new ApiError(404, 'Application not found');
  if (app.stage === stage) return app;
  if (app.stage === 'JOINED') throw new ApiError(409, 'Candidate has already joined');
  insert('application_stage_history', { application_id: id, from_stage: app.stage, to_stage: stage, changed_by: userId, changed_at: now(), remarks });
  const req = byId('requisitions', app.requisition_id)!;
  if (stage === 'JOINED') { req.positions_filled++; const c = byId('candidates', app.candidate_id); if (c) c.status = 'JOINED'; if (req.positions_filled >= req.positions_required) req.status = 'CLOSED'; }
  if (req.status === 'OPEN' && STAGE_ORDER.indexOf(stage) > 0) req.status = 'IN_PROGRESS';
  Object.assign(app, { stage, stage_updated_at: now(), rejection_reason: stage === 'REJECTED' ? remarks : app.rejection_reason });
  const cand = byId('candidates', app.candidate_id);
  log('APPLICATION_MOVED', 'applications', id, `${cand?.full_name} moved to ${titleCase(stage)} for ${req.req_no}`, userId, req.client_id);
  return app;
}
/** Accepted offer -> employee (ONBOARDING) + onboarding checklist + planned deployment + salary assignment */
export function convertOffer(offerId: number, userId: number) {
  const o = byId('offers', offerId);
  if (!o) throw new ApiError(404, 'Offer not found');
  if (o.status !== 'ACCEPTED') throw new ApiError(409, 'Only accepted offers can be converted');
  if (T('employee_onboardings').some((x) => x.offer_id === o.id)) throw new ApiError(409, 'Already converted');
  const app = byId('applications', o.application_id)!, req = byId('requisitions', app.requisition_id)!, cand = byId('candidates', app.candidate_id)!;
  const [f, ...l] = cand.full_name.split(' ');
  const e = insert('employees', { employee_code: nextEmpCode(), candidate_id: cand.id, branch_id: 1, category: 'DEPLOYED', first_name: f, last_name: l.join(' '), gender: cand.gender || 'MALE',
    date_of_birth: cand.date_of_birth, mobile: cand.mobile, email: cand.email, state_id: cand.state_id, pf_applicable: true, esi_applicable: true, pt_applicable: true,
    date_of_joining: o.joining_date, status: 'ONBOARDING' }, userId);
  const tasks: any[] = T('document_types').filter((d) => d.applies_to === 'EMPLOYEE').map((d, i) => ({ id: i + 1, title: `Collect & verify ${d.name}`, document_type_id: d.id, is_mandatory: d.is_mandatory, status: 'PENDING' }));
  tasks.push({ id: tasks.length + 1, title: 'UAN generation / linking', document_type_id: null, is_mandatory: true, status: 'PENDING' });
  tasks.push({ id: tasks.length + 1, title: 'ESIC registration', document_type_id: null, is_mandatory: true, status: 'PENDING' });
  const ob = insert('employee_onboardings', { employee_id: e.id, offer_id: o.id, template_id: 1, assigned_to: 5, status: 'IN_PROGRESS', started_at: now(), tasks }, userId);
  insert('deployments', { deployment_no: `DEP-${String(nextId('deployments')).padStart(5, '0')}`, employee_id: e.id, client_id: req.client_id, site_id: req.site_id, contract_id: req.contract_id,
    rate_card_id: T('contract_rate_cards').find((x) => x.contract_id === req.contract_id && x.designation_id === req.designation_id)?.id ?? null,
    designation_id: req.designation_id, requisition_id: req.id, start_date: o.joining_date, status: 'PLANNED' }, userId);
  insert('employee_salary_assignments', { employee_id: e.id, salary_structure_id: o.salary_structure_id, gross_monthly: o.gross_monthly, ctc_monthly: o.ctc_monthly, effective_from: o.joining_date, revision_reason: 'JOINING' }, userId);
  log('ONBOARDING_STARTED', 'employees', e.id, `Onboarding started for ${cand.full_name} (${e.employee_code})`, userId, req.client_id);
  notify(['HR_OPS'], 'New joinee to onboard', `${cand.full_name} joins on ${o.joining_date}`, 'employee_onboardings', ob.id);
  return { employee: e, onboarding: ob };
}
function nextEmpCode() {
  const max = T('employees').reduce((m, e) => Math.max(m, Number(String(e.employee_code).replace(/\D/g, '')) || 0), 0);
  return `YSK${String(max + 1).padStart(4, '0')}`;
}
export function completeOnboarding(id: number, userId: number) {
  const ob = byId('employee_onboardings', id);
  if (!ob) throw new ApiError(404, 'Onboarding not found');
  const pending = (ob.tasks ?? []).filter((t: any) => t.is_mandatory && t.status === 'PENDING');
  if (pending.length) throw new ApiError(409, `${pending.length} mandatory step(s) pending: ${pending.map((t: any) => t.title).join(', ')}`);
  Object.assign(ob, { status: 'COMPLETED', completed_at: now() });
  const e = byId('employees', ob.employee_id)!;
  e.status = 'ACTIVE';
  const dep = T('deployments').find((d) => d.employee_id === e.id && d.status === 'PLANNED');
  if (dep) dep.status = 'ACTIVE';
  log('EMPLOYEE_DEPLOYED', 'deployments', dep?.id ?? 0, `${e.first_name} ${e.last_name ?? ''} deployed to ${byId('clients', dep?.client_id)?.legal_name}`, userId, dep?.client_id);
  return ob;
}
export function completeExit(id: number, userId: number) {
  const x = byId('employee_exits', id);
  if (!x) throw new ApiError(404, 'Exit not found');
  const pending = T('exit_clearances').filter((c) => c.exit_id === id && c.status === 'PENDING');
  if (pending.length) throw new ApiError(409, 'All clearances must be completed first');
  const fnf = T('fnf_settlements').find((f) => f.exit_id === id);
  if (!fnf || fnf.status !== 'PAID') throw new ApiError(409, 'F&F settlement must be paid first');
  x.status = 'COMPLETED';
  const e = byId('employees', x.employee_id)!; e.status = 'EXITED'; e.date_of_exit = x.last_working_date;
  const dep = byId('deployments', x.deployment_id); if (dep) { dep.status = 'ENDED'; dep.end_date = x.last_working_date; dep.end_reason = 'EXIT'; }
  log('EXIT_COMPLETED', 'employee_exits', id, `Exit completed for ${e.first_name} ${e.last_name ?? ''}`, userId);
  return x;
}
export function fnfDraft(exitId: number) {
  const x = byId('employee_exits', exitId)!;
  const asg = T('employee_salary_assignments').filter((s) => s.employee_id === x.employee_id).at(-1);
  const gross = Number(asg?.gross_monthly ?? 0);
  const lwd = parseISO(x.last_working_date);
  const daysWorked = lwd.getDate();
  const el = T('leave_balances').find((b) => b.employee_id === x.employee_id && b.leave_type_id === 3);
  const assets = sum(T('employee_assets').filter((a) => a.employee_id === x.employee_id && a.status === 'ISSUED'), (a) => a.recoverable_amount);
  const adv = T('salary_advances').find((a) => a.employee_id === x.employee_id && a.status === 'ACTIVE');
  return { exit_id: exitId, employee_id: x.employee_id, pending_salary: round(gross / getDaysInMonth(lwd) * daysWorked), leave_encashment: round((el?.closing ?? 0) * gross * 0.5 / 26),
    bonus: 0, gratuity: 0, other_earnings: 0, notice_recovery: round(gross / 30 * (x.notice_shortfall_days ?? 0)), advance_recovery: adv ? adv.amount - adv.recovered_amount : 0,
    asset_recovery: assets, other_deductions: 0, status: 'DRAFT' };
}

// ---------------------------------------------------------------- dashboards
const lastLocked = () => iso(subMonths(startOfMonth(new Date()), 1));
function recentActivities(n = 6, clientScope?: number[]) {
  return [...T('activity_log')].filter((a) => !clientScope || !a.client_id || clientScope.includes(a.client_id)).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, n);
}
function pendingApprovals() {
  return T('approval_requests').filter((a) => a.status === 'PENDING').map((a) => decorate('approval_requests', a)).sort((a, b) => b.requested_at.localeCompare(a.requested_at));
}
function billingTrend(n = 6) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const m = format(subMonths(new Date(), i), 'yyyy-MM');
    const inv = T('invoices').filter((x) => x.status !== 'CANCELLED' && monthOf(x.invoice_date) === m);
    const rec = T('receipts').filter((x) => monthOf(x.receipt_date) === m);
    out.push({ month: format(parseISO(m + '-01'), 'MMM yy'), invoiced: sum(inv, (x) => x.total_amount), received: sum(rec, (x) => x.amount_received + x.tds_amount),
      pending: sum(inv, (x) => x.balance_due) });
  }
  return out;
}
function aging() {
  const b = { '0-30': 0, '31-60': 0, '61-90': 0, '91-120': 0, '120+': 0 } as Record<string, number>;
  T('invoices').filter((i) => i.balance_due > 0 && i.status !== 'CANCELLED' && i.status !== 'DRAFT').forEach((i) => {
    const age = differenceInCalendarDays(new Date(), parseISO(i.invoice_date));
    const k = age <= 30 ? '0-30' : age <= 60 ? '31-60' : age <= 90 ? '61-90' : age <= 120 ? '91-120' : '120+';
    b[k] += i.balance_due;
  });
  return Object.entries(b).map(([name, value]) => ({ name, value: round(value) }));
}
function funnel(apps: Rec[]) {
  const reached = (s: string) => apps.filter((a) => STAGE_ORDER.indexOf(a.stage) >= STAGE_ORDER.indexOf(s) || (['REJECTED', 'DROPPED'].includes(a.stage) && s === 'SOURCED')).length;
  return [['Sourced', 'SOURCED'], ['Screened', 'SCREENED'], ['Shortlisted', 'SHORTLISTED'], ['Interviewed', 'INTERVIEWED'], ['Selected', 'SELECTED'], ['Joined', 'JOINED']]
    .map(([name, s]) => ({ name, value: reached(s) }));
}
function thisMonthApps(apps: Rec[]) { const m = format(new Date(), 'yyyy-MM'); return apps.filter((a) => monthOf(a.sourced_on) === m || monthOf(a.stage_updated_at) === m); }
function latestAttendanceDay() { const all = T('attendance'); return all.length ? all.reduce((m, a) => (a.attendance_date > m ? a.attendance_date : m), '') : iso(new Date()); }

export function dashboard(role: string, user: Rec) {
  const emps = T('employees').filter((e) => e.category === 'DEPLOYED');
  const deployed = T('deployments').filter((d) => d.status === 'ACTIVE');
  const clients = T('clients');
  const m = format(new Date(), 'yyyy-MM');
  const joinedThisMonth = emps.filter((e) => monthOf(e.date_of_joining) === m && e.status !== 'ONBOARDING').length;
  const onboarding = emps.filter((e) => e.status === 'ONBOARDING').length;
  const invoices = T('invoices').filter((i) => i.status !== 'CANCELLED');
  const outstanding = sum(invoices.filter((i) => i.status !== 'DRAFT'), (i) => i.balance_due);
  const deploymentByClient = clients.map((c) => ({ name: c.legal_name, short: c.trade_name ?? c.legal_name, value: deployed.filter((d) => d.client_id === c.id).length })).sort((a, b) => b.value - a.value);
  const lastRun = T('payroll_runs').filter((r) => r.period_month === lastLocked());
  const payrollSummary = { month: lastLocked(), total_gross: sum(lastRun, (r) => r.total_gross), employer_pf: sum(T('payslips').filter((p) => lastRun.some((r) => r.id === p.payroll_run_id)), (p) => p.employer_pf),
    employer_esi: sum(T('payslips').filter((p) => lastRun.some((r) => r.id === p.payroll_run_id)), (p) => p.employer_esi), total_deductions: sum(lastRun, (r) => r.total_deductions), total_net: sum(lastRun, (r) => r.total_net) };
  const alerts = [
    ...T('compliance_tasks').filter((c) => c.status !== 'COMPLETED' && differenceInCalendarDays(parseISO(c.due_date), new Date()) <= 20).map((c) => ({ level: differenceInCalendarDays(parseISO(c.due_date), new Date()) < 5 ? 'high' : 'medium', text: `${c.title} due ${format(parseISO(c.due_date), 'dd MMM')}` })),
    ...T('attendance_periods').filter((p) => p.period_month === lastLocked() && p.status !== 'LOCKED').map((p) => ({ level: 'high', text: `Attendance not locked: ${byId('clients', p.client_id)?.legal_name}` })),
    ...(invoices.filter((i) => i.status === 'PENDING_APPROVAL').length ? [{ level: 'medium', text: `${invoices.filter((i) => i.status === 'PENDING_APPROVAL').length} invoices pending approval` }] : []),
  ].slice(0, 6);

  if (role === 'MD') {
    const apps = T('applications');
    const byIndustry = T('industries').map((ind) => {
      const reqs = T('requisitions').filter((q) => byId('clients', q.client_id)?.industry_id === ind.id && !['CANCELLED'].includes(q.status));
      return { name: ind.name, open: sum(reqs.filter((q) => ['OPEN', 'IN_PROGRESS'].includes(q.status)), (q) => q.positions_required - q.positions_filled),
        in_progress: apps.filter((a) => reqs.some((q) => q.id === a.requisition_id) && ['INTERVIEW_SCHEDULED', 'INTERVIEWED', 'SELECTED', 'OFFERED'].includes(a.stage)).length,
        filled: sum(reqs, (q) => q.positions_filled) };
    });
    const monthInv = invoices.filter((i) => monthOf(i.invoice_date) === m);
    const lastMonthInv = invoices.filter((i) => monthOf(i.invoice_date) === format(subMonths(new Date(), 1), 'yyyy-MM'));
    const billed = sum(invoices, (i) => i.total_amount), collected = sum(invoices, (i) => i.amount_received);
    return {
      kpis: { total_clients: clients.length, active_clients: clients.filter((c) => c.status === 'ACTIVE').length, total_employees: emps.filter((e) => e.status !== 'EXITED').length,
        deployed: deployed.length, joined_this_month: joinedThisMonth, onboarding, monthly_billing: sum(monthInv.length ? monthInv : lastMonthInv, (i) => i.total_amount),
        outstanding, outstanding_clients: new Set(invoices.filter((i) => i.balance_due > 0 && i.status !== 'DRAFT').map((i) => i.client_id)).size,
        revenue_taxable: sum(monthInv.length ? monthInv : lastMonthInv, (i) => i.taxable_amount) },
      employee_status: ['ACTIVE', 'ONBOARDING', 'NOTICE', 'EXITED'].map((s) => ({ name: titleCase(s), value: emps.filter((e) => e.status === s).length })),
      recruitment_by_industry: byIndustry, billing_trend: billingTrend(6), top_clients: deploymentByClient.slice(0, 5), payroll_summary: payrollSummary,
      collections: { total: billed, collected, pending: billed - collected }, alerts, recent: recentActivities(6),
    };
  }
  if (role === 'OPS_MANAGER') {
    const day = latestAttendanceDay();
    const today = T('attendance').filter((a) => a.attendance_date === day);
    const present = today.filter((a) => ['PRESENT', 'ON_DUTY', 'HALF_DAY'].includes(a.status)).length;
    const absent = today.filter((a) => a.status === 'ABSENT').length, leave = today.filter((a) => a.status === 'LEAVE').length;
    const shiftCounts = T('shifts').map((s) => ({ name: s.name, value: T('shift_assignments').filter((x) => x.shift_id === s.id && deployed.some((d) => d.id === x.deployment_id)).length }));
    const slips = T('payslips').filter((p) => p.period_month === lastLocked());
    const runs = T('payroll_runs').filter((r) => r.period_month === lastLocked());
    const runsByStatus = (st: string[]) => sum(runs.filter((r) => st.includes(r.status)), (r) => r.employee_count);
    const pendingClients = clients.filter((c) => !runs.some((r) => r.client_id === c.id)).length;
    return {
      attendance_date: day,
      kpis: { total_employees: emps.filter((e) => e.status !== 'EXITED').length, deployed: deployed.length, present, absent, on_leave: leave,
        attendance_pct: today.length ? r2((present / today.length) * 100) : 0, active_clients: clients.filter((c) => c.status === 'ACTIVE').length, total_clients: clients.length,
        pending_payroll: pendingClients + runs.filter((r) => ['DRAFT', 'COMPUTED', 'UNDER_REVIEW'].includes(r.status)).length,
        compliance_alerts: T('compliance_tasks').filter((c) => ['DUE', 'OVERDUE'].includes(c.status)).length + T('client_licenses').filter((l) => l.status !== 'ACTIVE').length },
      attendance_today: [{ name: 'Present', value: present }, { name: 'Absent', value: absent }, { name: 'On leave', value: leave }],
      deployment_by_client: deploymentByClient, shift_summary: shiftCounts,
      payroll_status: [{ name: 'Processed', value: runsByStatus(['APPROVED', 'PAID', 'LOCKED']) }, { name: 'In progress', value: runsByStatus(['COMPUTED', 'UNDER_REVIEW', 'DRAFT']) },
        { name: 'Pending', value: Math.max(0, deployed.length - slips.length) }],
      compliance: [
        { name: 'PF compliance', total: deployed.length, pending: emps.filter((e) => e.status === 'ACTIVE' && !e.uan).length + emps.filter((e) => e.status === 'ONBOARDING').length },
        { name: 'ESI compliance', total: deployed.length, pending: emps.filter((e) => e.status !== 'EXITED' && !e.esic_ip_number).length },
        { name: 'Labour licence', total: T('client_licenses').length, pending: T('client_licenses').filter((l) => l.status !== 'ACTIVE').length },
        { name: 'Contract labour', total: clients.length, pending: T('contracts').filter((c) => c.status !== 'ACTIVE').length },
      ],
      invoices: { generated_this_month: sum(invoices.filter((i) => monthOf(i.invoice_date) === m), (i) => i.total_amount), received_this_month: sum(T('receipts').filter((r) => monthOf(r.receipt_date) === m), (r) => r.amount_received),
        outstanding, overdue_count: invoices.filter((i) => i.balance_due > 0 && i.status !== 'DRAFT' && i.due_date < iso(new Date())).length },
      approvals: pendingApprovals().slice(0, 6), alerts, recent: recentActivities(6),
    };
  }
  if (role === 'REC_MANAGER' || role === 'RECRUITER') {
    const mine = role === 'RECRUITER';
    const reqIds = mine ? T('requisition_allocations').filter((a) => a.recruiter_id === user.id).map((a) => a.requisition_id) : T('requisitions').map((q) => q.id);
    const reqs = T('requisitions').filter((q) => reqIds.includes(q.id));
    const apps = T('applications').filter((a) => (mine ? a.recruiter_id === user.id : true));
    const appsM = thisMonthApps(apps);
    const interviews = T('interviews').filter((iv) => apps.some((a) => a.id === iv.application_id));
    const todayStr = iso(new Date()), weekStart = iso(startOfWeek(new Date(), { weekStartsOn: 1 })), weekEnd = iso(addDays(parseISO(weekStart), 6));
    const offers = T('offers').filter((o) => apps.some((a) => a.id === o.application_id));
    const joinedM = apps.filter((a) => a.stage === 'JOINED' && monthOf(a.stage_updated_at) === m).length;
    const selected = apps.filter((a) => ['SELECTED', 'OFFERED', 'JOINED'].includes(a.stage)).length;
    const target = T('recruiter_targets').find((t) => t.recruiter_id === user.id && monthOf(t.period_month) === m);
    const recruiters = T('users').filter((u) => u.roles.includes('RECRUITER')).map((u) => {
      const ua = T('applications').filter((a) => a.recruiter_id === u.id);
      const sel = ua.filter((a) => ['SELECTED', 'OFFERED', 'JOINED'].includes(a.stage)).length, jn = ua.filter((a) => a.stage === 'JOINED').length;
      return { id: u.id, name: u.full_name, sourced: ua.length, interviews: T('interviews').filter((iv) => ua.some((a) => a.id === iv.application_id)).length, selected: sel, joined: jn, joining_pct: sel ? r2((jn / sel) * 100) : 0 };
    });
    const weeks = [0, 1, 2, 3, 4].map((w) => { const s = addDays(startOfMonth(new Date()), w * 7); return { name: `Week ${w + 1}`, value: apps.filter((a) => a.stage === 'JOINED' && a.stage_updated_at >= iso(s) && a.stage_updated_at < iso(addDays(s, 7))).length }; });
    const positions = new Map<string, number>();
    reqs.filter((q) => ['OPEN', 'IN_PROGRESS'].includes(q.status)).forEach((q) => { const n = byId('designations', q.designation_id)!.name; positions.set(n, (positions.get(n) ?? 0) + q.positions_required - q.positions_filled); });
    const followUps = T('follow_ups').filter((f) => f.status === 'PENDING' && (!mine || f.assigned_to === user.id));
    return {
      kpis: { open_requirements: reqs.filter((q) => ['OPEN', 'IN_PROGRESS', 'ON_HOLD'].includes(q.status)).length, total_requirements: reqs.length, closed_requirements: reqs.filter((q) => q.status === 'CLOSED').length,
        total_positions: sum(reqs.filter((q) => ['OPEN', 'IN_PROGRESS'].includes(q.status)), (q) => q.positions_required), candidates_total: mine ? apps.length : T('candidates').length,
        candidates_active: T('candidates').filter((c) => c.status === 'ACTIVE').length, sourced_this_month: appsM.length,
        interviews_scheduled: interviews.filter((iv) => iv.status === 'SCHEDULED').length, interviews_today: interviews.filter((iv) => iv.scheduled_at.slice(0, 10) === todayStr).length,
        interviews_week: interviews.filter((iv) => iv.scheduled_at.slice(0, 10) >= weekStart && iv.scheduled_at.slice(0, 10) <= weekEnd).length,
        offers_released: offers.length, offers_pending: offers.filter((o) => o.status === 'RELEASED').length, offers_joined: offers.filter((o) => o.status === 'ACCEPTED').length,
        joined_this_month: joinedM, joining_target: target?.joining_target ?? 20, joining_ratio: selected ? r2((apps.filter((a) => a.stage === 'JOINED').length / selected) * 100) : 0,
        sourcing_target: target?.sourcing_target ?? 150 },
      requirement_status: ['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'CLOSED'].map((s) => ({ name: titleCase(s), value: reqs.filter((q) => q.status === s).length })),
      open_by_client: clients.map((c) => ({ name: c.legal_name, value: reqs.filter((q) => q.client_id === c.id && ['OPEN', 'IN_PROGRESS'].includes(q.status)).length })).sort((a, b) => b.value - a.value),
      funnel: funnel(apps),
      interviews_overview: { scheduled: interviews.filter((i) => i.status === 'SCHEDULED').length, completed: interviews.filter((i) => i.status === 'COMPLETED').length,
        pending: interviews.filter((i) => i.status === 'COMPLETED' && !i.result).length + interviews.filter((i) => i.result === 'ON_HOLD').length, cancelled: interviews.filter((i) => ['CANCELLED', 'NO_SHOW'].includes(i.status)).length },
      upcoming_interviews: interviews.filter((i) => i.status === 'SCHEDULED').sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)).slice(0, 6).map((i) => decorate('interviews', i)),
      recruiter_performance: recruiters.sort((a, b) => b.joined - a.joined), joining_trend: weeks,
      top_positions: [...positions.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5),
      follow_ups: { candidate: followUps.filter((f) => f.follow_up_type === 'CANDIDATE').length, feedback: followUps.filter((f) => f.follow_up_type === 'FEEDBACK').length,
        offer: followUps.filter((f) => f.follow_up_type === 'OFFER').length, joining: followUps.filter((f) => f.follow_up_type === 'JOINING').length },
      recent: recentActivities(6),
    };
  }
  if (role === 'HR_OPS') {
    const apps = T('applications');
    const obs = T('employee_onboardings').filter((o) => o.status !== 'COMPLETED');
    const docsPending = T('documents').filter((d) => d.verification_status === 'PENDING').length + sum(obs, (o) => (o.tasks ?? []).filter((t: any) => t.document_type_id && t.status === 'PENDING').length);
    return {
      kpis: { total_requisitions: T('requisitions').length, open_positions: sum(T('requisitions').filter((q) => ['OPEN', 'IN_PROGRESS'].includes(q.status)), (q) => q.positions_required - q.positions_filled),
        new_joinees: joinedThisMonth, deployed: deployed.length, pending_onboarding: obs.length },
      pipeline: [{ name: 'Requisition', value: T('requisitions').filter((q) => ['OPEN', 'IN_PROGRESS'].includes(q.status)).length }, { name: 'Sourcing', value: apps.filter((a) => ['SOURCED', 'SCREENED', 'SHORTLISTED'].includes(a.stage)).length },
        { name: 'Interview', value: apps.filter((a) => ['INTERVIEW_SCHEDULED', 'INTERVIEWED'].includes(a.stage)).length }, { name: 'Selected', value: apps.filter((a) => ['SELECTED', 'OFFERED'].includes(a.stage)).length },
        { name: 'Onboarding', value: obs.length }, { name: 'Deployed', value: deployed.length }],
      tasks: [
        { title: 'Verify documents', count: docsPending, priority: 'High', link: '/onboarding' },
        { title: 'Onboarding checklists', count: obs.length, priority: 'Medium', link: '/onboarding' },
        { title: 'Pending leave requests', count: T('leave_requests').filter((l) => l.status === 'PENDING').length, priority: 'Medium', link: '/leave' },
        { title: 'Deployment confirmation', count: T('deployments').filter((d) => d.status === 'PLANNED').length, priority: 'High', link: '/deployments' },
        { title: 'Collect bank details', count: T('employees').filter((e) => e.status === 'ONBOARDING' && !T('employee_bank_accounts').some((b) => b.employee_id === e.id)).length, priority: 'Low', link: '/employees' },
        { title: 'Exit clearances', count: T('exit_clearances').filter((c) => c.status === 'PENDING').length, priority: 'Medium', link: '/exits' },
      ],
      deployment_by_client: deploymentByClient,
      upcoming_onboarding: obs.map((o) => decorate('employee_onboardings', o)).sort((a, b) => String(a.date_of_joining).localeCompare(String(b.date_of_joining))).slice(0, 5),
      recent: recentActivities(6),
    };
  }
  if (role === 'ACCOUNTS') {
    const monthInv = invoices.filter((i) => monthOf(i.invoice_date) === m);
    const prevInv = invoices.filter((i) => monthOf(i.invoice_date) === format(subMonths(new Date(), 1), 'yyyy-MM'));
    const recM = T('receipts').filter((r) => monthOf(r.receipt_date) === m);
    const overdue = invoices.filter((i) => i.balance_due > 0 && i.status !== 'DRAFT' && i.due_date < iso(new Date()));
    const overdueByClient = clients.map((c) => { const o = overdue.filter((i) => i.client_id === c.id); return { client_id: c.id, name: c.legal_name, amount: sum(o, (i) => i.balance_due), days: o.length ? Math.max(...o.map((i) => differenceInCalendarDays(new Date(), parseISO(i.due_date)))) : 0 }; })
      .filter((x) => x.amount > 0).sort((a, b) => b.amount - a.amount);
    const reminders = invoices.filter((i) => i.balance_due > 0 && i.status !== 'DRAFT').map((i) => ({ ...decorate('invoices', i), due_in: differenceInCalendarDays(parseISO(i.due_date), new Date()) }))
      .sort((a, b) => a.due_in - b.due_in).slice(0, 5);
    return {
      kpis: { invoiced_this_month: sum(monthInv, (i) => i.total_amount), invoiced_prev: sum(prevInv, (i) => i.total_amount), received_this_month: sum(recM, (r) => r.amount_received),
        pending_receivables: outstanding, overdue_amount: sum(overdue, (i) => i.balance_due), credit_notes: sum(T('credit_notes').filter((c) => c.status !== 'CANCELLED'), (c) => c.total_amount),
        drafts: invoices.filter((i) => i.status === 'DRAFT').length },
      trend: billingTrend(8), aging: aging(), recent_invoices: [...invoices].sort((a, b) => b.id - a.id).slice(0, 6).map((i) => decorate('invoices', i)),
      top_overdue: overdueByClient.slice(0, 5), reminders,
      uninvoiced: clients.filter((c) => T('attendance_periods').some((p) => p.client_id === c.id && p.period_month === lastLocked() && p.status === 'LOCKED')
        && !invoices.some((i) => i.client_id === c.id && i.period_from === lastLocked())).map((c) => ({ id: c.id, name: c.legal_name })),
    };
  }
  throw new ApiError(404, 'Unknown dashboard');
}

// ---------------------------------------------------------------- reports
export function report(code: string, q: Record<string, any>) {
  const month = (q.month || lastLocked()).slice(0, 7);
  const clientF = (id: number) => !q.client_id || Number(q.client_id) === id;
  const cols = (...c: [string, string][]) => c.map(([key, label]) => ({ key, label }));
  switch (code) {
    case 'headcount':
      return { columns: cols(['client', 'Client'], ['site', 'Site'], ['designation', 'Designation'], ['count', 'Deployed']),
        rows: (() => { const m = new Map<string, any>(); T('deployments').filter((d) => d.status === 'ACTIVE' && clientF(d.client_id)).forEach((d) => { const k = `${d.client_id}|${d.site_id}|${d.designation_id}`; const r = m.get(k) ?? { client: byId('clients', d.client_id)?.legal_name, site: byId('client_sites', d.site_id)?.name, designation: byId('designations', d.designation_id)?.name, count: 0 }; r.count++; m.set(k, r); }); return [...m.values()]; })() };
    case 'attendance_summary': {
      const rows: any[] = [];
      T('clients').filter((c) => clientF(c.id)).forEach((c) => attendanceGrid({ client_id: String(c.id), month }).rows.forEach((r) => rows.push({ client: c.legal_name, code: r.employee_code, name: r.name, designation: r.designation, present: r.summary.P, absent: r.summary.A, half_day: r.summary.HD, leave: r.summary.L, weekly_off: r.summary.WO, holiday: r.summary.H, paid_days: r.summary.paid_days, ot_hours: r.summary.ot_hours })));
      return { columns: cols(['client', 'Client'], ['code', 'Emp code'], ['name', 'Name'], ['designation', 'Designation'], ['present', 'P'], ['absent', 'A'], ['half_day', 'HD'], ['leave', 'L'], ['weekly_off', 'WO'], ['holiday', 'H'], ['paid_days', 'Paid days'], ['ot_hours', 'OT h']), rows };
    }
    case 'payroll_register': {
      const runs = T('payroll_runs').filter((r) => monthOf(r.period_month) === month && clientF(r.client_id));
      const rows = T('payslips').filter((p) => runs.some((r) => r.id === p.payroll_run_id)).map((p) => ({ run: byId('payroll_runs', p.payroll_run_id)?.run_no, code: byId('employees', p.employee_id)?.employee_code, name: empName(p.employee_id), paid_days: p.paid_days, gross: p.gross_earnings, pf: T('payslip_lines').find((l) => l.payslip_id === p.id && l.component_code === 'PF_EE')?.amount ?? 0, esi: T('payslip_lines').find((l) => l.payslip_id === p.id && l.component_code === 'ESI_EE')?.amount ?? 0, pt: T('payslip_lines').find((l) => l.payslip_id === p.id && l.component_code === 'PT')?.amount ?? 0, deductions: p.total_deductions, net: p.net_pay }));
      return { columns: cols(['run', 'Run'], ['code', 'Emp code'], ['name', 'Name'], ['paid_days', 'Paid days'], ['gross', 'Gross'], ['pf', 'PF'], ['esi', 'ESI'], ['pt', 'PT'], ['deductions', 'Deductions'], ['net', 'Net pay']), rows, money: ['gross', 'pf', 'esi', 'pt', 'deductions', 'net'] };
    }
    case 'pf_register': {
      const slips = T('payslips').filter((p) => monthOf(p.period_month) === month && p.pf_wages > 0);
      return { columns: cols(['uan', 'UAN'], ['name', 'Member name'], ['gross', 'Gross wages'], ['epf_wages', 'EPF wages'], ['eps_wages', 'EPS wages'], ['ee', 'EE share'], ['eps', 'EPS (ER)'], ['epf_er', 'EPF (ER)'], ['ncp', 'NCP days']),
        rows: slips.map((p) => ({ uan: byId('employees', p.employee_id)?.uan ?? 'PENDING', name: empName(p.employee_id), gross: p.gross_earnings, epf_wages: p.pf_wages, eps_wages: p.pf_wages, ee: Math.round(p.pf_wages * 0.12), eps: p.eps_share, epf_er: p.employer_pf - p.eps_share, ncp: p.lop_days })), money: ['gross', 'epf_wages', 'eps_wages', 'ee', 'eps', 'epf_er'] };
    }
    case 'esi_register': {
      const slips = T('payslips').filter((p) => monthOf(p.period_month) === month && p.esi_wages > 0);
      return { columns: cols(['ip', 'IP number'], ['name', 'Name'], ['days', 'Days paid'], ['wages', 'Wages'], ['ee', 'EE contribution'], ['er', 'ER contribution']),
        rows: slips.map((p) => ({ ip: byId('employees', p.employee_id)?.esic_ip_number ?? 'PENDING', name: empName(p.employee_id), days: p.paid_days, wages: p.esi_wages, ee: Math.ceil(p.esi_wages * 0.0075), er: p.employer_esi })), money: ['wages', 'ee', 'er'] };
    }
    case 'billing_register':
      return { columns: cols(['invoice_no', 'Invoice'], ['date', 'Date'], ['client', 'Client'], ['gstin', 'Client GSTIN'], ['taxable', 'Taxable'], ['cgst', 'CGST'], ['sgst', 'SGST'], ['igst', 'IGST'], ['total', 'Total'], ['status', 'Status']),
        rows: T('invoices').filter((i) => clientF(i.client_id) && (!q.month || monthOf(i.invoice_date) === month)).map((i) => ({ invoice_no: i.invoice_no, date: i.invoice_date, client: byId('clients', i.client_id)?.legal_name, gstin: i.client_gstin, taxable: i.taxable_amount, cgst: i.cgst_amount, sgst: i.sgst_amount, igst: i.igst_amount, total: i.total_amount, status: i.status })),
        money: ['taxable', 'cgst', 'sgst', 'igst', 'total'] };
    case 'receivables_aging':
      return { columns: cols(['client', 'Client'], ['invoice_no', 'Invoice'], ['invoice_date', 'Invoice date'], ['due_date', 'Due date'], ['balance', 'Balance'], ['age', 'Age (days)']),
        rows: T('invoices').filter((i) => i.balance_due > 0 && i.status !== 'DRAFT' && clientF(i.client_id)).map((i) => ({ client: byId('clients', i.client_id)?.legal_name, invoice_no: i.invoice_no, invoice_date: i.invoice_date, due_date: i.due_date, balance: i.balance_due, age: differenceInCalendarDays(new Date(), parseISO(i.invoice_date)) })), money: ['balance'] };
    case 'recruitment_mis': {
      const rows = T('requisitions').filter((r) => clientF(r.client_id)).map((r) => { const a = T('applications').filter((x) => x.requisition_id === r.id); const f = funnel(a); return { req_no: r.req_no, client: byId('clients', r.client_id)?.legal_name, position: byId('designations', r.designation_id)?.name, required: r.positions_required, sourced: f[0].value, interviewed: f[3].value, selected: f[4].value, joined: f[5].value, status: r.status }; });
      return { columns: cols(['req_no', 'Req'], ['client', 'Client'], ['position', 'Position'], ['required', 'Required'], ['sourced', 'Sourced'], ['interviewed', 'Interviewed'], ['selected', 'Selected'], ['joined', 'Joined'], ['status', 'Status']), rows };
    }
    case 'recruiter_performance':
      return { columns: cols(['name', 'Recruiter'], ['sourced', 'Sourced'], ['interviews', 'Interviews'], ['selected', 'Selected'], ['joined', 'Joined'], ['joining_pct', 'Joining %']), rows: (dashboard('REC_MANAGER', {} as any) as any).recruiter_performance };
    case 'exits':
      return { columns: cols(['code', 'Emp code'], ['name', 'Name'], ['type', 'Exit type'], ['lwd', 'Last working day'], ['status', 'Status']),
        rows: T('employee_exits').map((x) => ({ code: byId('employees', x.employee_id)?.employee_code, name: empName(x.employee_id), type: x.exit_type, lwd: x.last_working_date, status: x.status })) };
    default:
      throw new ApiError(404, 'Unknown report');
  }
}

// ---------------------------------------------------------------- one-time derived seed (payroll, invoices, receipts...)
export function bootstrap() {
  const D = getDB();
  if (D._meta?.[0]?.bootstrapped) return;
  const today = new Date();
  const last = subMonths(startOfMonth(today), 1);
  // payroll runs for last month
  D.clients.forEach((c: Rec, i: number) => {
    const run = insert('payroll_runs', { run_no: nextNumber('PAYROLL_RUN'), period_month: iso(last), run_type: 'REGULAR', client_id: c.id, branch_id: 1,
      attendance_period_id: T('attendance_periods').find((p) => p.client_id === c.id && p.period_month === iso(last))?.id, status: 'DRAFT', employee_count: 0,
      total_gross: 0, total_deductions: 0, total_net: 0, total_employer_contribution: 0 }, 2);
    computePayroll(run.id);
    run.status = ['PAID', 'PAID', 'APPROVED', 'APPROVED', 'COMPUTED'][i];
    if (run.status === 'PAID') { run.paid_at = new Date(today.getFullYear(), today.getMonth(), Math.min(7, today.getDate())).toISOString(); T('payslips').filter((p) => p.payroll_run_id === run.id).forEach((p) => { p.status = 'PAID'; p.payment_ref = 'NEFT' + p.id; }); }
    if (run.status === 'COMPUTED') submitForApproval('PAYROLL_RUN', run.id, `Payroll ${run.run_no}: ${c.legal_name} (${format(last, 'MMM yyyy')}), ${run.employee_count} employees`, 2);
  });
  // history invoices (months -6..-2) + last month invoices for clients 1-3
  D.clients.forEach((c: Rec) => {
    for (let k = 6; k >= 2; k--) {
      const ms = subMonths(startOfMonth(today), k);
      const head = T('deployments').filter((d) => d.client_id === c.id && d.status === 'ACTIVE').length;
      const taxable = Math.round(head * (19500 + c.id * 700) * (0.92 + ((k * 7 + c.id) % 10) / 60));
      const intra = c.billing_state_id === 1;
      const gst = Math.round(taxable * 0.18 * 100) / 100;
      const total = Math.round(taxable + gst);
      const invDate = addDays(addDays(ms, getDaysInMonth(ms)), 4);
      const inv = insert('invoices', { invoice_no: nextNumber('INVOICE'), financial_year_id: 1, branch_id: 1, client_id: c.id, contract_id: c.id, invoice_date: iso(invDate),
        period_from: iso(ms), period_to: iso(addDays(ms, getDaysInMonth(ms) - 1)), due_date: iso(addDays(invDate, c.credit_days)), place_of_supply_state_id: c.billing_state_id,
        supplier_gstin: '36AABCY1234F1Z5', client_gstin: c.gstin, taxable_amount: taxable, cgst_amount: intra ? gst / 2 : 0, sgst_amount: intra ? gst / 2 : 0, igst_amount: intra ? 0 : gst,
        round_off: 0, total_amount: total, amount_received: 0, balance_due: total, status: 'SENT', sent_at: invDate.toISOString() }, 6);
      insert('invoice_lines', { invoice_id: inv.id, line_no: 1, line_type: 'MANPOWER', description: `Manpower services: ${head} staff`, sac_code: '998519', headcount: head, quantity: 1, rate: taxable, amount: taxable, gst_rate: 18 });
      const payDate = addDays(invDate, c.credit_days + ((c.id * 5) % 12) - 4);
      const unpaid = (c.id === 4 && k <= 3) || (c.id === 2 && k === 2) || (c.id === 5 && k === 2);
      if (!unpaid && payDate < today) {
        const tds = Math.round(taxable * 0.02);
        recordReceipt({ client_id: c.id, receipt_date: iso(payDate), amount_received: total - tds, tds_amount: tds, payment_mode: 'NEFT', reference_no: `UTR${inv.id}${c.id}0923`,
          allocations: [{ invoice_id: inv.id, allocated_amount: total - tds, tds_allocated: tds }] }, 6);
      } else if (c.id === 2 && k === 2) {
        recordReceipt({ client_id: c.id, receipt_date: iso(subDays(today, 6)), amount_received: Math.round(total * 0.5), tds_amount: 0, payment_mode: 'RTGS', reference_no: 'UTRPART01',
          allocations: [{ invoice_id: inv.id, allocated_amount: Math.round(total * 0.5) }] }, 6);
      }
    }
  });
  [1, 2, 3].forEach((cid) => { try { const inv = createInvoice({ client_id: cid, period_month: iso(last) }, 6, addDays(startOfMonth(today), Math.min(4, today.getDate() - 1))); inv.status = cid === 3 ? 'PENDING_APPROVAL' : 'SENT'; if (cid === 3) submitForApproval('INVOICE', inv.id, `Invoice ${inv.invoice_no} for ${byId('clients', cid)?.legal_name}: ₹${inv.total_amount.toLocaleString('en-IN')}`, 6); } catch { /* ignore */ } });
  // credit note
  const someInv = T('invoices').find((i) => i.client_id === 1);
  if (someInv) insert('credit_notes', { credit_note_no: nextNumber('CREDIT_NOTE'), invoice_id: someInv.id, client_id: 1, note_date: iso(subDays(today, 25)), reason: 'Attendance correction: 6 man-days',
    taxable_amount: 4962, cgst_amount: 446.58, sgst_amount: 446.58, igst_amount: 0, total_amount: 5855, status: 'ISSUED' }, 6);
  [1, 3].forEach((cid) => insert('tds_certificates', { client_id: cid, financial_year_id: 1, quarter: 1, certificate_no: `16A-${cid}Q1`, tds_amount: 18500 + cid * 3200, received_on: iso(subDays(today, 40)) }, 6));
  // compliance returns for last month
  const slips = T('payslips').filter((p) => p.period_month === iso(last));
  const pf = insert('pf_returns', { branch_id: 1, period_month: iso(last), member_count: slips.filter((p) => p.pf_wages > 0).length, total_epf_wages: sum(slips, (p) => p.pf_wages),
    total_ee_share: sum(slips, (p) => Math.round(p.pf_wages * 0.12)), total_er_epf: sum(slips, (p) => p.employer_pf - p.eps_share), total_er_eps: sum(slips, (p) => p.eps_share),
    admin_charges: Math.round(sum(slips, (p) => p.pf_wages) * 0.005), edli_charges: Math.round(sum(slips, (p) => p.pf_wages) * 0.005), due_date: iso(new Date(today.getFullYear(), today.getMonth(), 15)), status: 'GENERATED' }, 2);
  pf.challan_amount = pf.total_ee_share + pf.total_er_epf + pf.total_er_eps + pf.admin_charges + pf.edli_charges;
  insert('esi_returns', { branch_id: 1, period_month: iso(last), ip_count: slips.filter((p) => p.esi_wages > 0).length, total_wages: sum(slips, (p) => p.esi_wages),
    total_ee_contribution: sum(slips, (p) => Math.ceil(p.esi_wages * 0.0075)), total_er_contribution: sum(slips, (p) => p.employer_esi), due_date: iso(new Date(today.getFullYear(), today.getMonth(), 15)), status: 'GENERATED' }, 2);
  insert('statutory_payments', { payment_type: 'PT', branch_id: 1, state_id: 1, period_month: iso(last), amount: sum(T('payslip_lines').filter((l) => l.component_code === 'PT'), (l) => l.amount), due_date: iso(new Date(today.getFullYear(), today.getMonth(), 10)), status: today.getDate() > 10 ? 'PAID' : 'PENDING' }, 2);
  // approvals for leave, overtime, expense
  T('leave_requests').filter((l) => l.status === 'PENDING').forEach((l) => submitForApproval('LEAVE', l.id, `${empName(l.employee_id)}: ${byId('leave_types', l.leave_type_id)?.code} ${l.days} day(s) from ${format(parseISO(l.from_date), 'dd MMM')}`, 5));
  T('overtime_requests').filter((o) => o.status === 'PENDING').forEach((o) => submitForApproval('OVERTIME', o.id, `${empName(o.employee_id)}: ${o.ot_minutes / 60} h overtime on ${format(parseISO(o.ot_date), 'dd MMM')}`, 5));
  T('expenses').filter((x) => x.status === 'SUBMITTED').forEach((x) => submitForApproval('EXPENSE', x.id, `Expense ${x.expense_no}: ₹${x.amount.toLocaleString('en-IN')} (${x.vendor_name})`, 6));
  // activity feed
  const acts: [string, string, string, number, number, number | null][] = [
    ['ONBOARDING_STARTED', 'employees', 'New employee onboarded: Ravi Kumar', 5, 2, 1], ['DOCUMENT_VERIFIED', 'documents', 'Document verified: Suresh Yadav', 5, 4, 2],
    ['EMPLOYEE_DEPLOYED', 'deployments', 'Employee deployed: Anita Singh to Fresh Bites Foods', 5, 26, 3], ['SHIFT_ASSIGNED', 'shift_assignments', 'Night shift assigned: 12 staff at ABC Foods', 2, 30, 1],
    ['REQUISITION_APPROVED', 'requisitions', 'Requisition approved: REQ-0011 Assembler', 3, 50, 2], ['PAYROLL_PROCESSED', 'payroll_runs', 'Payroll processed for ABC Foods Pvt Ltd', 2, 70, 1],
    ['ATTENDANCE_UPLOADED', 'attendance_import_batches', 'Attendance uploaded for XYZ Electronics Ltd', 5, 80, 2], ['PF_ECR_GENERATED', 'pf_returns', `PF ECR file for ${format(last, 'MMM yyyy')} generated`, 2, 95, null],
    ['INTERVIEW_SCHEDULED', 'interviews', 'Interview scheduled for 5 candidates: XYZ Electronics Ltd', 4, 120, 2], ['OFFER_RELEASED', 'offers', 'Offer released to 2 candidates: Prime Manufacturing', 3, 200, 4],
  ];
  acts.forEach(([action, entity_type, summary, actor, mins, client]) => T('activity_log').push({ id: nextId('activity_log'), actor_id: actor, action, entity_type, entity_id: 1, client_id: client, summary, created_at: subDays(new Date(), 0).toISOString().replace(/T.*/, '') + `T${String(Math.max(0, 10 - Math.floor(mins / 60))).padStart(2, '0')}:${String(59 - (mins % 60)).padStart(2, '0')}:00.000Z` }));
  T('users').forEach((u) => insert('notifications', { user_id: u.id, notif_type: 'INFO', title: 'Welcome to YSK HRMS', body: 'This is demo data. Use Settings to reset it any time.', priority: 'LOW', is_read: false }));
  D._meta = [{ id: 1, bootstrapped: true }];
}

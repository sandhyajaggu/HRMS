/* In-memory database for the mock backend, seeded with realistic data and persisted to localStorage.
   Collections and columns follow the PostgreSQL schema one-to-one. */
import { addDays, format, getDaysInMonth, startOfMonth, subMonths, getDay, subDays } from 'date-fns';

export type Rec = Record<string, any> & { id: number };
export type DB = Record<string, Rec[]>;

const KEY = 'ysk_hrms_mockdb_v3';
const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const ts = (d: Date) => d.toISOString();

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let db: DB | null = null;

export function getDB(): DB {
  if (db) return db;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { db = JSON.parse(raw); return db!; }
  } catch { /* ignore */ }
  db = seed();
  persist();
  return db;
}

let t: any;
export function persist() {
  clearTimeout(t);
  t = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* quota: keep in memory */ }
  }, 200);
}

export function resetDB() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  db = seed();
  persist();
}

export function nextId(c: string) {
  const rows = getDB()[c] ?? (getDB()[c] = []);
  return rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
}

function seed(): DB {
  const r = rng(20250520);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const int = (a: number, b: number) => Math.floor(a + r() * (b - a + 1));
  const today = new Date();
  const now = ts(today);
  const thisMonth = startOfMonth(today);
  const lastMonth = subMonths(thisMonth, 1);
  const D: DB = {};
  const add = (c: string, row: Record<string, any>) => {
    const arr = (D[c] ??= []);
    const rec = { id: arr.length + 1, created_at: now, updated_at: now, ...row };
    arr.push(rec);
    return rec as Rec;
  };

  // ---------------- masters ----------------
  [['TS', 'Telangana', '36'], ['AP', 'Andhra Pradesh', '37'], ['KA', 'Karnataka', '29'], ['TN', 'Tamil Nadu', '33'], ['MH', 'Maharashtra', '27']]
    .forEach(([code, name, g]) => add('states', { code, name, gst_state_code: g }));
  add('branches', { code: 'HYD', name: 'Hyderabad Head Office', state_id: 1, address: 'Madhapur, Hyderabad, Telangana 500081',
    gstin: '36AABCY1234F1Z5', pf_establishment_code: 'APHYD0012345000', esi_employer_code: '52000123450001001', pt_registration_no: 'PT36001234', is_active: true });
  add('industries', { name: 'Food Processing', is_active: true });
  add('industries', { name: 'Electronics Manufacturing', is_active: true });
  const desig: [string, string, number, string][] = [
    ['MOP', 'Machine Operator', 1, 'SEMI_SKILLED'], ['ASM', 'Assembler', 2, 'SEMI_SKILLED'], ['PKH', 'Packing Helper', 1, 'UNSKILLED'],
    ['QCK', 'Quality Checker', 2, 'SKILLED'], ['STA', 'Store Assistant', 1, 'SEMI_SKILLED'], ['HLP', 'Helper', 1, 'UNSKILLED'],
    ['TEC', 'Technician', 2, 'SKILLED'], ['SGD', 'Security Guard', 1, 'UNSKILLED'], ['OFA', 'Office Assistant', 1, 'SEMI_SKILLED'],
    ['FLO', 'Forklift Operator', 2, 'SKILLED'], ['HRE', 'HR Executive', 0, 'SKILLED'], ['REC', 'Recruiter', 0, 'SKILLED'],
  ];
  desig.forEach(([code, name, ind, skill]) => add('designations', { code, name, industry_id: ind || null, skill_category: skill, is_internal: ind === 0, is_active: true }));
  [['AADHAAR', 'Aadhaar card', 'EMPLOYEE', true, false], ['PAN', 'PAN card', 'EMPLOYEE', true, false], ['BANK_PROOF', 'Bank passbook / cheque', 'EMPLOYEE', true, false],
   ['PHOTO', 'Passport photo', 'EMPLOYEE', true, false], ['EDU', 'Education certificate', 'EMPLOYEE', false, false], ['MEDICAL', 'Medical fitness certificate', 'EMPLOYEE', false, true],
   ['POLICE', 'Police verification', 'EMPLOYEE', false, true], ['RESUME', 'Resume', 'CANDIDATE', false, false], ['CONTRACT', 'Signed contract', 'CONTRACT', true, true], ['CLRA', 'CLRA licence copy', 'LICENSE', true, true]]
    .forEach(([code, name, applies_to, is_mandatory, has_expiry]) => add('document_types', { code, name, applies_to, is_mandatory, has_expiry, is_active: true }));
  const fyStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  add('financial_years', { code: `${fyStart}-${String(fyStart + 1).slice(2)}`, start_date: `${fyStart}-04-01`, end_date: `${fyStart + 1}-03-31`, is_current: true });
  const fyShort = `${String(fyStart).slice(2)}-${String(fyStart + 1).slice(2)}`;
  [['INVOICE', `YSK/${fyShort}/INV/`], ['CREDIT_NOTE', `YSK/${fyShort}/CN/`], ['RECEIPT', 'RCPT-'], ['EMPLOYEE', 'YSK'], ['CANDIDATE', 'CAN-'],
   ['REQUISITION', 'REQ-'], ['OFFER', 'OFR-'], ['PAYROLL_RUN', 'PR-'], ['EXPENSE', 'EXP-'], ['TICKET', 'TKT-']]
    .forEach(([doc_type, prefix]) => add('number_series', { doc_type, branch_id: 1, financial_year_id: 1, prefix, next_number: 1, padding: doc_type === 'CANDIDATE' ? 5 : 4 }));

  // ---------------- access ----------------
  const roles: [string, string][] = [['MD', 'Managing Director'], ['OPS_MANAGER', 'Operations Manager'], ['REC_MANAGER', 'Recruitment Manager'],
    ['RECRUITER', 'HR Recruiter'], ['HR_OPS', 'HR Operations Executive'], ['ACCOUNTS', 'Billing & Accounts Executive']];
  roles.forEach(([code, name]) => add('roles', { code, name, is_system: true, dashboard_key: code.toLowerCase() }));
  const perms = ['client.view', 'client.edit', 'requisition.view', 'requisition.edit', 'requisition.approve', 'candidate.view', 'candidate.edit', 'candidate.export',
    'employee.view', 'employee.edit', 'employee.view_sensitive', 'deployment.edit', 'attendance.edit', 'attendance.lock', 'payroll.run', 'payroll.approve',
    'compliance.edit', 'invoice.create', 'invoice.approve', 'receipt.edit', 'expense.approve', 'exit.edit', 'fnf.approve', 'user.manage', 'settings.manage', 'report.view'];
  perms.forEach((code) => add('permissions', { code, module: code.split('.')[0] }));
  const grant: Record<string, string[]> = {
    MD: perms,
    OPS_MANAGER: perms.filter((p) => !['user.manage', 'settings.manage', 'fnf.approve'].includes(p)),
    REC_MANAGER: ['client.view', 'requisition.view', 'requisition.edit', 'requisition.approve', 'candidate.view', 'candidate.edit', 'candidate.export', 'report.view'],
    RECRUITER: ['client.view', 'requisition.view', 'candidate.view', 'candidate.edit'],
    HR_OPS: ['client.view', 'requisition.view', 'candidate.view', 'employee.view', 'employee.edit', 'employee.view_sensitive', 'deployment.edit', 'attendance.edit', 'exit.edit', 'report.view'],
    ACCOUNTS: ['client.view', 'client.edit', 'invoice.create', 'receipt.edit', 'report.view'],
  };
  D.role_permissions = [];
  roles.forEach(([code], ri) => grant[code].forEach((p) => D.role_permissions.push({ id: D.role_permissions.length + 1, role_id: ri + 1, permission_id: perms.indexOf(p) + 1 })));

  const users: [string, string, string][] = [
    ['Siva Krishna', 'md@ysk.in', 'MD'], ['Karthik Reddy', 'ops@ysk.in', 'OPS_MANAGER'], ['Lakshmi Prasanna', 'recmgr@ysk.in', 'REC_MANAGER'],
    ['Ravi Kumar', 'recruiter@ysk.in', 'RECRUITER'], ['Swathi Rao', 'hrops@ysk.in', 'HR_OPS'], ['Mahesh Goud', 'accounts@ysk.in', 'ACCOUNTS'],
    ['Neha Sharma', 'neha@ysk.in', 'RECRUITER'], ['Amit Singh', 'amit@ysk.in', 'RECRUITER'], ['Pooja Patel', 'pooja@ysk.in', 'RECRUITER'], ['Vikram Das', 'vikram@ysk.in', 'RECRUITER'],
  ];
  users.forEach(([full_name, email, role], i) => add('users', { full_name, email, mobile: `98480${String(10000 + i * 137).slice(0, 5)}`, status: 'ACTIVE', roles: [role], branch_id: 1,
    password: 'demo123', must_change_password: false, last_login_at: ts(subDays(today, i % 3)) }));
  const recruiterIds = [4, 7, 8, 9, 10];

  // ---------------- clients ----------------
  const clients = [
    ['ABC', 'ABC Foods Pvt Ltd', 1, 1, 'Plot 12, IDA Pashamylaram, Sangareddy', 'COST_PLUS', 8],
    ['XYZ', 'XYZ Electronics Ltd', 2, 1, 'Survey 45, E-City, Maheshwaram, Hyderabad', 'FIXED_PER_HEAD', 0],
    ['FBF', 'Fresh Bites Foods', 1, 1, 'Food Park, Nandigama, Rangareddy', 'COST_PLUS', 9],
    ['PRM', 'Prime Manufacturing', 2, 1, 'IDA Cherlapally Phase II, Hyderabad', 'PER_DAY', 0],
    ['UTP', 'Urban Tastes Pvt Ltd', 1, 3, 'Bommasandra Industrial Area, Bengaluru', 'COST_PLUS', 10],
  ] as const;
  const siteNames: Record<string, string[]> = { ABC: ['Pashamylaram Plant', 'Warehouse Patancheru'], XYZ: ['E-City Unit 1'], FBF: ['Nandigama Plant'], PRM: ['Cherlapally Works', 'Uppal Unit'], UTP: ['Bommasandra Kitchen'] };
  const clientDesigs: Record<string, number[]> = { ABC: [1, 3, 5, 8], XYZ: [2, 4, 7, 10], FBF: [1, 3, 6], PRM: [2, 4, 7, 6], UTP: [3, 6, 1] };
  const billRate: Record<number, number> = { 1: 21500, 2: 21000, 3: 17500, 4: 25500, 5: 19800, 6: 17000, 7: 28500, 8: 18200, 9: 19000, 10: 27000 };
  const grossByDesig: Record<number, number> = { 1: 17200, 2: 16800, 3: 14200, 4: 20500, 5: 15800, 6: 13800, 7: 23000, 8: 14600, 9: 15500, 10: 21800 };

  // salary components & structures
  const comps: [string, string, string, Partial<Rec>][] = [
    ['BASIC', 'Basic + DA', 'EARNING', { is_pf_wage: true, is_esi_wage: true }], ['HRA', 'House Rent Allowance', 'EARNING', { is_esi_wage: true }],
    ['CONV', 'Conveyance', 'EARNING', { is_esi_wage: true }], ['SPL', 'Special Allowance', 'EARNING', { is_esi_wage: true }],
    ['OT', 'Overtime', 'EARNING', { is_esi_wage: true, is_prorated: false }], ['PF_EE', 'PF (Employee)', 'DEDUCTION', { is_statutory: true }],
    ['ESI_EE', 'ESI (Employee)', 'DEDUCTION', { is_statutory: true }], ['PT', 'Professional Tax', 'DEDUCTION', { is_statutory: true }],
    ['ADV', 'Advance Recovery', 'DEDUCTION', {}], ['PF_ER', 'PF (Employer)', 'EMPLOYER', { is_statutory: true }], ['ESI_ER', 'ESI (Employer)', 'EMPLOYER', { is_statutory: true }],
  ];
  comps.forEach(([code, name, component_type, f], i) => add('salary_components', { code, name, component_type, is_statutory: false, is_pf_wage: false, is_esi_wage: false,
    is_taxable: true, is_prorated: true, is_billable: true, show_on_payslip: true, sort_order: i + 1, is_active: true, ...f }));
  const structs = [['STD-UNSK', 'Standard - Unskilled'], ['STD-SEMI', 'Standard - Semi-skilled'], ['STD-SKL', 'Standard - Skilled']];
  structs.forEach(([code, name]) => {
    const s = add('salary_structures', { code, name, state_id: 1, pay_basis: 'MONTHLY', effective_from: `${fyStart}-04-01`, is_active: true });
    const rows = [[1, 'PERCENT', 50, null], [2, 'PERCENT', 20, 1], [3, 'FIXED', 1600, null], [4, 'BALANCING', null, null]];
    rows.forEach(([component_id, calc_type, v, base], i) => add('salary_structure_components', {
      structure_id: s.id, component_id, calc_type, amount: calc_type === 'FIXED' ? v : null, percent: calc_type === 'PERCENT' ? v : null,
      base_component_id: base, sort_order: i + 1 }));
  });
  const structFor = (d: number) => ({ UNSKILLED: 1, SEMI_SKILLED: 2, SKILLED: 3, HIGHLY_SKILLED: 3 } as any)[D.designations[d - 1].skill_category];

  add('minimum_wage_zones', { state_id: 1, code: 'Z1', name: 'Zone I (GHMC & adjoining)' });
  add('minimum_wage_zones', { state_id: 1, code: 'Z2', name: 'Zone II' });
  // Illustrative values only: load the current notified rates before go-live.
  ([['UNSKILLED', 11500, 1800], ['SEMI_SKILLED', 12400, 1800], ['SKILLED', 13600, 1800], ['HIGHLY_SKILLED', 15000, 1800]] as [string, number, number][])
    .forEach(([skill_category, basic, vda]) => add('minimum_wages', { state_id: 1, zone_id: 1, skill_category, basic_per_month: basic, vda_per_month: vda,
      total_per_month: Number(basic) + Number(vda), per_day: Math.round((Number(basic) + Number(vda)) / 26), effective_from: `${fyStart}-04-01`, notification_ref: 'Sample - replace with current G.O.' }));
  // Configurable statutory parameters (confirm current values with your compliance consultant).
  [['PF_WAGE_CEILING', 15000], ['PF_EE_RATE', 12], ['PF_ER_EPF_RATE', 3.67], ['PF_ER_EPS_RATE', 8.33], ['PF_ADMIN_RATE', 0.5], ['EDLI_RATE', 0.5],
   ['ESI_WAGE_LIMIT', 21000], ['ESI_EE_RATE', 0.75], ['ESI_ER_RATE', 3.25]]
    .forEach(([parameter, value]) => add('statutory_settings', { parameter, value, effective_from: `${fyStart}-04-01`, notes: 'Configurable' }));
  ([[0, 15000, 0], [15001, 20000, 150], [20001, null, 200]] as [number, number | null, number][]).forEach(([min_gross, max_gross, tax_amount]) =>
    add('professional_tax_slabs', { state_id: 1, gender: 'ANY', min_gross, max_gross, tax_amount, effective_from: `${fyStart}-04-01` }));
  add('lwf_rates', { state_id: 1, employee_amount: 2, employer_amount: 5, frequency: 'YEARLY', deduction_months: [12], effective_from: `${fyStart}-04-01` });

  add('leave_policies', { name: 'Factory standard', description: 'CL 7, SL 7, EL 1 per 20 days worked', is_active: true });
  add('leave_policies', { name: 'Minimal (short contracts)', description: 'CL 6 only', is_active: true });
  [['CL', 'Casual Leave', true, 'UPFRONT', null], ['SL', 'Sick Leave', true, 'UPFRONT', null], ['EL', 'Earned Leave', true, 'PER_DAYS_WORKED', 20], ['LOP', 'Loss of Pay', false, 'NONE', null]]
    .forEach(([code, name, is_paid, accrual_method, days]) => add('leave_types', { code, name, is_paid, accrual_method, days_worked_per_leave: days, is_encashable: code === 'EL', applicable_gender: 'ANY', is_active: true }));
  [[1, 1, 7], [1, 2, 7], [1, 3, 15], [2, 1, 6]].forEach(([policy_id, leave_type_id, annual_quota]) => add('leave_policy_items', { policy_id, leave_type_id, annual_quota, max_carry_forward: leave_type_id === 3 ? 30 : 0 }));

  const hc = add('holiday_calendars', { name: 'Telangana', state_id: 1, year: today.getFullYear() });
  const yr = today.getFullYear();
  [[`${yr}-01-01`, 'New Year', 'FESTIVAL'], [`${yr}-01-14`, 'Sankranti', 'FESTIVAL'], [`${yr}-01-26`, 'Republic Day', 'NATIONAL'], [`${yr}-03-30`, 'Ugadi', 'FESTIVAL'],
   [`${yr}-05-01`, 'May Day', 'FESTIVAL'], [`${yr}-06-02`, 'Telangana Formation Day', 'FESTIVAL'], [`${yr}-08-15`, 'Independence Day', 'NATIONAL'],
   [`${yr}-10-02`, 'Gandhi Jayanti', 'NATIONAL'], [`${yr}-10-20`, 'Diwali', 'FESTIVAL'], [`${yr}-12-25`, 'Christmas', 'FESTIVAL']]
    .forEach(([holiday_date, name, holiday_kind]) => add('holidays', { calendar_id: hc.id, holiday_date, name, holiday_kind }));
  const holidaySet = new Set(D.holidays.map((h) => h.holiday_date));

  [['GEN', 'General', '09:00', '18:00', false], ['MOR', 'Morning', '06:00', '14:00', false], ['EVE', 'Evening', '14:00', '22:00', false], ['NGT', 'Night', '22:00', '06:00', true]]
    .forEach(([code, name, start_time, end_time, night]) => add('shifts', { code, name, start_time, end_time, crosses_midnight: night, break_minutes: 30, grace_minutes: 10,
      half_day_min_minutes: 240, full_day_min_minutes: 480, is_night_shift: night, is_active: true }));

  clients.forEach(([code, legal_name, industry_id, stateId, address, model, sc], ci) => {
    const c = add('clients', { code, legal_name, trade_name: legal_name.replace(/ (Pvt )?Ltd$/, ''), industry_id, branch_id: 1,
      gstin: `${stateId === 3 ? '29' : '36'}AAC${code}${1000 + ci}F1Z${ci + 2}`, pan: `AAC${code}${1000 + ci}F`, tan: `HYD${code}0${ci}123E`.slice(0, 10),
      billing_address: address, billing_state_id: stateId, credit_days: [30, 45, 30, 60, 30][ci], account_manager_id: 2, status: 'ACTIVE',
      onboarded_on: iso(subMonths(today, 30 - ci * 4)) });
    siteNames[code].forEach((name, si) => add('client_sites', { client_id: c.id, site_code: `S${si + 1}`, name, address, city: stateId === 3 ? 'Bengaluru' : 'Hyderabad',
      state_id: stateId, minimum_wage_zone_id: stateId === 1 ? 1 : null, holiday_calendar_id: 1, site_incharge_name: pick(['Ramesh', 'Suresh', 'Prakash', 'Venkat']) + ' ' + pick(['Rao', 'Naidu', 'Reddy']),
      site_incharge_phone: `90000${String(ci * 11 + si).padStart(5, '0')}`, is_active: true }));
    add('client_contacts', { client_id: c.id, name: pick(['Anil', 'Sunita', 'Rajesh', 'Kavitha', 'Harish']) + ' ' + pick(['Menon', 'Iyer', 'Agarwal', 'Kulkarni']),
      designation: 'HR Manager', email: `hr@${code.toLowerCase()}client.in`, phone: `99890${String(ci * 1234).padStart(5, '0')}`, is_primary: true, receives_invoices: true, receives_mis: true, can_approve_attendance: true, is_active: true });
    add('client_contacts', { client_id: c.id, name: 'Accounts Team', designation: 'Accounts', email: `accounts@${code.toLowerCase()}client.in`, phone: '', is_primary: false, receives_invoices: true, receives_mis: false, can_approve_attendance: false, is_active: true });
    const k = add('contracts', { client_id: c.id, contract_no: `CTR-${code}-${fyStart}`, start_date: `${fyStart}-04-01`, end_date: `${fyStart + 1}-03-31`,
      billing_model: model, service_charge_percent: sc || null, statutory_billed_separately: true, ot_billing_multiplier: 2, payment_terms_days: c.credit_days,
      leave_policy_id: 1, renewal_reminder_days: 30, status: 'ACTIVE' });
    clientDesigs[code].forEach((d) => add('contract_rate_cards', { contract_id: k.id, designation_id: d, site_id: null, salary_structure_id: structFor(d),
      billing_rate: model === 'PER_DAY' ? Math.round(billRate[d] / 26) : billRate[d], rate_unit: model === 'PER_DAY' ? 'DAY' : 'MONTH',
      ot_rate_per_hour: Math.round(billRate[d] / 26 / 8 * 2), effective_from: `${fyStart}-04-01` }));
    D.client_sites.filter((s) => s.client_id === c.id).forEach((s, si) => add('client_licenses', { client_id: c.id, site_id: s.id, license_type: 'CLRA_LICENSE',
      license_no: `CLRA/TS/${2023 + si}/${1200 + ci * 7 + si}`, issued_by: 'Asst. Labour Commissioner', issue_date: iso(subMonths(today, 11)),
      expiry_date: iso(addDays(today, ci === 1 && si === 0 ? 18 : 40 + ci * 45)), max_workers: 60 + ci * 20, status: ci === 1 && si === 0 ? 'RENEWAL_DUE' : 'ACTIVE' }));
  });

  // ---------------- people ----------------
  const firstM = ['Ravi', 'Suresh', 'Ramesh', 'Mahesh', 'Srikanth', 'Naveen', 'Anil', 'Praveen', 'Venkatesh', 'Kiran', 'Rajesh', 'Arjun', 'Vikash', 'Sai', 'Manoj', 'Harish', 'Ganesh', 'Nagaraju', 'Shiva', 'Prakash'];
  const firstF = ['Anita', 'Pooja', 'Lakshmi', 'Swapna', 'Divya', 'Kavya', 'Neha', 'Sravani', 'Bhavani', 'Madhavi', 'Sunitha', 'Priyanka', 'Renuka', 'Jyothi'];
  const lasts = ['Kumar', 'Reddy', 'Yadav', 'Rao', 'Goud', 'Naidu', 'Singh', 'Sharma', 'Patel', 'Verma', 'Babu', 'Chary', 'Naik', 'Das', 'Mudiraj'];
  const person = () => { const g = r() < 0.72 ? 'MALE' : 'FEMALE'; return { g, f: pick(g === 'MALE' ? firstM : firstF), l: pick(lasts) }; };

  // Deployed employees
  const headcount: Record<string, number> = { ABC: 26, XYZ: 20, FBF: 14, PRM: 11, UTP: 9 };
  let empNo = 1;
  const mkEmployee = (status: string, doj: Date, category = 'DEPLOYED') => {
    const p = person();
    const e = add('employees', { employee_code: `YSK${String(empNo++).padStart(4, '0')}`, candidate_id: null, branch_id: 1, category, first_name: p.f, last_name: p.l,
      father_or_spouse_name: `${pick(firstM)} ${p.l}`, gender: p.g, date_of_birth: iso(new Date(int(1985, 2003), int(0, 11), int(1, 28))), marital_status: pick(['SINGLE', 'MARRIED']),
      mobile: `9${int(100000000, 999999999)}`, email: null, current_address: 'Hyderabad', permanent_address: pick(['Warangal', 'Nalgonda', 'Karimnagar', 'Khammam', 'Mahbubnagar', 'Srikakulam', 'Patna']),
      state_id: 1, aadhaar_last4: String(int(1000, 9999)), pan_last4: String(int(1000, 9999)), uan: status === 'ONBOARDING' ? null : `10${int(1000000000, 9999999999)}`,
      esic_ip_number: status === 'ONBOARDING' ? null : `52${int(10000000, 99999999)}`, pf_applicable: true, esi_applicable: true, pt_applicable: true,
      date_of_joining: iso(doj), date_of_exit: null, status, photo_url: null });
    return e;
  };
  let depNo = 1;
  clients.forEach(([code], ci) => {
    const cid = ci + 1;
    const sites = D.client_sites.filter((s) => s.client_id === cid);
    for (let i = 0; i < headcount[code]; i++) {
      const doj = i < 2 ? new Date(today.getFullYear(), today.getMonth(), int(1, Math.max(1, today.getDate() - 1))) : subDays(today, int(45, 700));
      const e = mkEmployee(i === 3 && ci < 2 ? 'NOTICE' : 'ACTIVE', doj);
      const d = pick(clientDesigs[code]);
      const rc = D.contract_rate_cards.find((x) => x.contract_id === cid && x.designation_id === d)!;
      const dep = add('deployments', { deployment_no: `DEP-${String(depNo++).padStart(5, '0')}`, employee_id: e.id, client_id: cid, site_id: pick(sites).id, contract_id: cid,
        rate_card_id: rc.id, designation_id: d, requisition_id: null, start_date: iso(doj), end_date: null, status: 'ACTIVE', supervisor_name: sites[0].site_incharge_name });
      const g = grossByDesig[d] + int(-4, 8) * 100;
      add('employee_salary_assignments', { employee_id: e.id, deployment_id: dep.id, salary_structure_id: structFor(d), gross_monthly: g, ctc_monthly: Math.round(g * 1.17), effective_from: iso(doj), revision_reason: 'JOINING' });
      add('shift_assignments', { deployment_id: dep.id, shift_id: pick([1, 2, 2, 3, 4]), effective_from: iso(doj), weekly_off_days: [0] });
      add('employee_bank_accounts', { employee_id: e.id, account_holder_name: `${e.first_name} ${e.last_name}`, bank_name: pick(['State Bank of India', 'HDFC Bank', 'Union Bank of India', 'ICICI Bank']),
        account_last4: String(int(1000, 9999)), ifsc: pick(['SBIN0020061', 'HDFC0001234', 'UBIN0812345', 'ICIC0000567']), is_primary: true, verified_by: 5, verified_at: ts(doj) });
    }
  });
  // Internal staff (YSK's own employees) linked to users
  users.slice(0, 10).forEach((u, i) => {
    const [f, ...l] = String(u[0]).split(' ');
    const e = add('employees', { employee_code: `YSK${String(empNo++).padStart(4, '0')}`, branch_id: 1, category: 'INTERNAL', first_name: f, last_name: l.join(' '), gender: ['Lakshmi Prasanna', 'Swathi Rao', 'Neha Sharma', 'Pooja Patel'].includes(u[0]) ? 'FEMALE' : 'MALE',
      date_of_birth: iso(new Date(1988 + i, i % 12, 10)), mobile: D.users[i].mobile, email: u[1], state_id: 1, uan: `10${int(1000000000, 9999999999)}`, esic_ip_number: null,
      pf_applicable: true, esi_applicable: false, pt_applicable: true, date_of_joining: iso(subMonths(today, 36 - i * 2)), status: 'ACTIVE' });
    D.users[i].employee_id = e.id;
  });

  // ---------------- attendance (last month + this month to yesterday) ----------------
  const activeDeps = D.deployments.filter((d) => d.status === 'ACTIVE');
  let aid = 1;
  D.attendance = [];
  const lastDay = subDays(today, 1);
  for (let day = new Date(lastMonth); day <= lastDay; day = addDays(day, 1)) {
    const ds = iso(day);
    const dow = getDay(day);
    for (const dep of activeDeps) {
      if (ds < dep.start_date) continue;
      let status = 'PRESENT';
      if (dow === 0) status = 'WEEKLY_OFF';
      else if (holidaySet.has(ds)) status = 'HOLIDAY';
      else { const x = r(); status = x < 0.06 ? 'ABSENT' : x < 0.09 ? 'LEAVE' : x < 0.11 ? 'HALF_DAY' : 'PRESENT'; }
      const ot = status === 'PRESENT' && r() < 0.08 ? pick([60, 120, 180]) : 0;
      D.attendance.push({ id: aid++, employee_id: dep.employee_id, deployment_id: dep.id, attendance_date: ds, shift_id: 1, status,
        check_in_at: null, check_out_at: null, worked_minutes: status === 'PRESENT' ? 480 + ot : status === 'HALF_DAY' ? 240 : 0, late_minutes: 0, ot_minutes: ot,
        source: dep.client_id === 2 ? 'BIOMETRIC' : 'CLIENT_EXCEL', created_at: now, updated_at: now });
    }
  }
  clients.forEach((_, ci) => {
    add('attendance_periods', { client_id: ci + 1, period_month: iso(lastMonth), status: 'LOCKED', submitted_by: 5, submitted_at: ts(addDays(thisMonth, 1)),
      client_approved_by: D.client_contacts[ci * 2].name, approved_at: ts(addDays(thisMonth, 2)), locked_by: 2, locked_at: ts(addDays(thisMonth, 3)) });
    add('attendance_periods', { client_id: ci + 1, period_month: iso(thisMonth), status: 'OPEN' });
  });
  add('attendance_import_batches', { client_id: 1, site_id: 1, period_month: iso(lastMonth), source: 'CLIENT_EXCEL', file_url: 'abc_attendance.csv', total_rows: 780, success_rows: 776, error_rows: 4, status: 'COMMITTED', created_by: 5 });

  // leave balances & requests
  D.employees.filter((e) => e.category === 'DEPLOYED').forEach((e) => {
    [[1, 7], [2, 7], [3, int(2, 9)]].forEach(([lt, q]) => {
      const used = int(0, Math.min(4, q));
      add('leave_balances', { employee_id: e.id, leave_type_id: lt, financial_year_id: 1, opening: 0, accrued: q, used, encashed: 0, lapsed: 0, closing: q - used });
    });
  });
  for (let i = 0; i < 9; i++) {
    const dep = pick(activeDeps);
    const from = addDays(today, int(-12, 10));
    const days = int(1, 3);
    const status = i < 4 ? 'PENDING' : pick(['APPROVED', 'APPROVED', 'REJECTED']);
    add('leave_requests', { employee_id: dep.employee_id, leave_type_id: pick([1, 1, 2, 3]), from_date: iso(from), to_date: iso(addDays(from, days - 1)), days, is_half_day: false,
      reason: pick(['Family function', 'Fever', 'Native place visit', 'Personal work']), status, created_by: 5 });
  }

  // ---------------- recruitment ----------------
  [['Naukri', 'JOB_PORTAL'], ['Sri Sai Manpower Consultants', 'CONSULTANT'], ['Govt ITI Placement Cell', 'TRAINING_INSTITUTE']]
    .forEach(([name, vendor_type], i) => add('vendors', { name, vendor_type, contact_person: pick(['Ramu', 'Sekhar', 'Latha']), email: `contact${i}@vendor.in`, phone: `98${int(10000000, 99999999)}`,
      commission_type: vendor_type === 'CONSULTANT' ? 'FIXED' : 'NONE', commission_value: vendor_type === 'CONSULTANT' ? 1500 : null, is_active: true }));
  let reqNo = 1;
  const reqStatuses = ['OPEN', 'IN_PROGRESS', 'IN_PROGRESS', 'OPEN', 'ON_HOLD', 'CLOSED', 'IN_PROGRESS', 'OPEN', 'CLOSED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'OPEN', 'IN_PROGRESS', 'CLOSED'];
  reqStatuses.forEach((status, i) => {
    const ci = i % 5; const code = clients[ci][0];
    const d = clientDesigs[code][i % clientDesigs[code].length];
    const req = add('requisitions', { req_no: `REQ-${String(reqNo++).padStart(4, '0')}`, client_id: ci + 1, site_id: D.client_sites.find((s) => s.client_id === ci + 1)!.id, contract_id: ci + 1,
      designation_id: d, shift_id: pick([1, 2, 3]), positions_required: pick([5, 8, 10, 12, 15, 20]), positions_filled: 0, min_experience_years: pick([0, 0, 1, 2]), max_experience_years: 5,
      qualification: pick(['SSC', 'Inter', 'ITI', 'Any']), gender_preference: pick(['ANY', 'ANY', 'MALE', 'FEMALE']), offered_gross_monthly: grossByDesig[d], job_description: `${D.designations[d - 1].name} for ${clients[ci][1]}`,
      required_by: iso(addDays(today, int(-5, 30))), priority: pick(['MEDIUM', 'HIGH', 'URGENT', 'LOW']), status, raised_on: iso(subDays(today, int(3, 50))),
      closed_on: status === 'CLOSED' ? iso(subDays(today, int(1, 10))) : null, created_by: 3 });
    const recs = [pick(recruiterIds), pick(recruiterIds)].filter((v, idx, a) => a.indexOf(v) === idx);
    recs.forEach((rid) => add('requisition_allocations', { requisition_id: req.id, recruiter_id: rid, allocated_positions: Math.ceil(req.positions_required / recs.length), target_date: req.required_by, allocated_by: 3, allocated_at: now }));
  });
  recruiterIds.forEach((rid) => add('recruiter_targets', { recruiter_id: rid, period_month: iso(thisMonth), sourcing_target: 150, interview_target: 40, joining_target: 20 }));
  add('hiring_drives', { name: 'Walk-in drive: Operators for ABC Foods', client_id: 1, venue: 'YSK office, Madhapur', drive_date: iso(addDays(today, 6)), target_count: 40, coordinator_id: 3, status: 'PLANNED' });
  add('hiring_drives', { name: 'ITI campus drive: Technicians', client_id: 2, venue: 'Govt ITI Mallepally', drive_date: iso(subDays(today, 12)), target_count: 25, coordinator_id: 7, status: 'COMPLETED' });

  let canNo = 1;
  const stages = ['SOURCED', 'SOURCED', 'SCREENED', 'SCREENED', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_SCHEDULED', 'INTERVIEWED', 'SELECTED', 'OFFERED', 'JOINED', 'JOINED', 'REJECTED', 'DROPPED'];
  const order = ['SOURCED', 'SCREENED', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'INTERVIEWED', 'SELECTED', 'OFFERED', 'JOINED'];
  const openReqs = D.requisitions.filter((q) => q.status !== 'PENDING_APPROVAL');
  for (let i = 0; i < 90; i++) {
    const p = person();
    const src = pick(['WALK_IN', 'JOB_PORTAL', 'REFERRAL', 'VENDOR', 'SOCIAL_MEDIA', 'HIRING_DRIVE']);
    const cand = add('candidates', { candidate_code: `CAN-${String(canNo++).padStart(5, '0')}`, full_name: `${p.f} ${p.l}`, mobile: `8${int(100000000, 999999999)}`, alt_mobile: null,
      email: r() < 0.5 ? `${p.f.toLowerCase()}.${p.l.toLowerCase()}${i}@gmail.com` : null, gender: p.g, date_of_birth: iso(new Date(int(1990, 2004), int(0, 11), int(1, 28))),
      current_city: pick(['Hyderabad', 'Secunderabad', 'Sangareddy', 'Medchal', 'Warangal']), state_id: 1, highest_qualification: pick(['SSC', 'Inter', 'ITI Fitter', 'ITI Electrician', 'Diploma', 'B.Com']),
      experience_years: pick([0, 0.5, 1, 2, 3, 4]), current_salary: pick([0, 11000, 13000, 15000]), expected_salary: pick([14000, 15000, 16000, 18000]),
      skills: [pick(['machine operation', 'packing', 'assembly', 'soldering', 'forklift', 'quality inspection', 'store keeping'])], languages: ['Telugu', pick(['Hindi', 'English'])],
      source: src, vendor_id: src === 'VENDOR' ? 2 : null, owner_recruiter_id: pick(recruiterIds), resume_url: null, status: 'ACTIVE', created_at: ts(subDays(today, int(0, 40))) });
    const req = pick(openReqs);
    const stage = pick(stages);
    // weight the demo recruiter (Ravi Kumar) so the recruiter portal has a meaningful workload
    const recr = r() < 0.4 ? 4 : (D.requisition_allocations.find((a) => a.requisition_id === req.id)?.recruiter_id ?? 4);
    const app = add('applications', { requisition_id: req.id, candidate_id: cand.id, recruiter_id: recr, drive_id: null, stage, stage_updated_at: ts(subDays(today, int(0, 12))),
      screening_notes: null, rejection_reason: stage === 'REJECTED' ? pick(['Failed practical test', 'Salary mismatch', 'Location issue']) : null, sourced_on: iso(subDays(today, int(2, 30))) });
    const reached = stage === 'REJECTED' || stage === 'DROPPED' ? int(1, 4) : order.indexOf(stage);
    for (let s = 1; s <= reached; s++) add('application_stage_history', { application_id: app.id, from_stage: order[s - 1], to_stage: order[s], changed_by: recr, changed_at: ts(subDays(today, reached - s + 1)) });
    if (order.indexOf(stage) >= 3) {
      const upcoming = stage === 'INTERVIEW_SCHEDULED';
      add('interviews', { application_id: app.id, round_no: 1, mode: pick(['IN_PERSON', 'IN_PERSON', 'TELEPHONIC']),
        scheduled_at: ts(upcoming ? addDays(today, int(0, 5)) : subDays(today, int(2, 15))), location: `${D.client_sites.find((s) => s.id === req.site_id)?.name}`,
        interviewer_type: 'CLIENT', interviewer_name: D.client_contacts[(req.client_id - 1) * 2].name, status: upcoming ? 'SCHEDULED' : 'COMPLETED',
        result: upcoming ? null : order.indexOf(stage) >= 5 ? 'SELECTED' : 'ON_HOLD', rating: upcoming ? null : int(3, 5), feedback: upcoming ? null : 'Good practical knowledge' });
    }
    if (stage === 'OFFERED' || stage === 'JOINED') {
      add('offers', { offer_no: `OFR-${String(app.id).padStart(4, '0')}`, application_id: app.id, designation_id: req.designation_id, salary_structure_id: structFor(req.designation_id),
        gross_monthly: req.offered_gross_monthly, ctc_monthly: Math.round(req.offered_gross_monthly * 1.17), joining_date: iso(addDays(today, stage === 'JOINED' ? -int(1, 20) : int(1, 10))),
        status: stage === 'JOINED' ? 'ACCEPTED' : pick(['RELEASED', 'ACCEPTED']), released_at: ts(subDays(today, 5)), responded_at: stage === 'JOINED' ? ts(subDays(today, 3)) : null });
    }
    if (stage === 'JOINED') { req.positions_filled += 1; cand.status = 'JOINED'; }
    if (['SOURCED', 'SCREENED', 'SELECTED', 'OFFERED', 'INTERVIEWED'].includes(stage) && r() < 0.55) {
      add('follow_ups', { candidate_id: cand.id, application_id: app.id, follow_up_type: stage === 'OFFERED' ? 'JOINING' : stage === 'INTERVIEWED' ? 'FEEDBACK' : stage === 'SELECTED' ? 'OFFER' : 'CANDIDATE',
        assigned_to: recr, due_at: ts(addDays(today, int(-2, 3))), status: 'PENDING', outcome_notes: null });
    }
  }

  // Upcoming joinees (accepted offers -> onboarding employees with planned deployment)
  const accepted = D.offers.filter((o) => o.status === 'ACCEPTED').slice(0, 5);
  accepted.forEach((o, i) => {
    const app = D.applications.find((a) => a.id === o.application_id)!;
    const req = D.requisitions.find((q) => q.id === app.requisition_id)!;
    const cand = D.candidates.find((c) => c.id === app.candidate_id)!;
    const joining = addDays(today, i + 1);
    const [f, ...l] = cand.full_name.split(' ');
    const e = add('employees', { employee_code: `YSK${String(empNo++).padStart(4, '0')}`, candidate_id: cand.id, branch_id: 1, category: 'DEPLOYED', first_name: f, last_name: l.join(' '),
      father_or_spouse_name: null, gender: cand.gender, date_of_birth: cand.date_of_birth, mobile: cand.mobile, email: cand.email, state_id: 1, uan: null, esic_ip_number: null,
      pf_applicable: true, esi_applicable: true, pt_applicable: true, date_of_joining: iso(joining), status: 'ONBOARDING' });
    o.joining_date = iso(joining);
    const tasks: any[] = D.document_types.filter((d) => d.applies_to === 'EMPLOYEE').slice(0, 6).map((d, ti) => ({ id: ti + 1, title: `Collect & verify ${d.name}`, document_type_id: d.id,
      is_mandatory: d.is_mandatory, status: ti < i + 1 ? 'DONE' : 'PENDING' }));
    tasks.push({ id: 7, title: 'UAN generation / linking', document_type_id: null, is_mandatory: true, status: 'PENDING' });
    tasks.push({ id: 8, title: 'ESIC registration', document_type_id: null, is_mandatory: true, status: 'PENDING' });
    add('employee_onboardings', { employee_id: e.id, offer_id: o.id, template_id: 1, assigned_to: 5, status: i === 4 ? 'BLOCKED' : 'IN_PROGRESS', started_at: now, tasks });
    add('deployments', { deployment_no: `DEP-${String(depNo++).padStart(5, '0')}`, employee_id: e.id, client_id: req.client_id, site_id: req.site_id, contract_id: req.contract_id,
      rate_card_id: D.contract_rate_cards.find((x) => x.contract_id === req.contract_id && x.designation_id === req.designation_id)?.id ?? null,
      designation_id: req.designation_id, requisition_id: req.id, start_date: iso(joining), status: 'PLANNED' });
    add('employee_salary_assignments', { employee_id: e.id, salary_structure_id: o.salary_structure_id, gross_monthly: o.gross_monthly, ctc_monthly: o.ctc_monthly, effective_from: iso(joining), revision_reason: 'JOINING' });
  });
  add('onboarding_templates', { name: 'Standard factory onboarding', industry_id: null, is_active: true });

  // documents for a few employees
  D.employees.slice(0, 30).forEach((e, i) => ['AADHAAR', 'PAN', 'BANK_PROOF', 'PHOTO'].forEach((code, di) => add('documents', {
    document_type_id: D.document_types.find((d) => d.code === code)!.id, entity_type: 'EMPLOYEE', entity_id: e.id, file_url: `employees/${e.employee_code}/${code.toLowerCase()}.pdf`,
    file_name: `${code.toLowerCase()}.pdf`, mime_type: 'application/pdf', size_bytes: 180000, verification_status: i % 9 === 0 && di === 2 ? 'PENDING' : 'VERIFIED', verified_by: 5, verified_at: now })));
  D.employees.filter((e) => e.category === 'DEPLOYED').slice(0, 40).forEach((e) => {
    add('employee_assets', { employee_id: e.id, asset_type: 'UNIFORM', description: '2 sets', quantity: 2, issued_on: e.date_of_joining, recoverable_amount: 900, status: 'ISSUED' });
    add('employee_assets', { employee_id: e.id, asset_type: 'SAFETY_SHOES', description: 'Size ' + int(6, 10), quantity: 1, issued_on: e.date_of_joining, recoverable_amount: 650, status: 'ISSUED' });
  });

  // overtime & advances
  for (let i = 0; i < 6; i++) {
    const dep = pick(activeDeps.filter((d) => d.client_id <= 3));
    add('overtime_requests', { employee_id: dep.employee_id, deployment_id: dep.id, ot_date: iso(subDays(today, int(1, 6))), ot_minutes: pick([120, 180, 240]),
      reason: 'Production target / shift cover', is_billable: true, status: i < 3 ? 'PENDING' : 'APPROVED', created_by: 5 });
  }
  [[3, 6000, 2000], [15, 4000, 2000], [40, 10000, 2500]].forEach(([eid, amount, inst]) => add('salary_advances', { employee_id: eid, advance_type: 'ADVANCE', amount, issued_on: iso(subMonths(today, 1)),
    instalment_amount: inst, recovered_amount: 0, status: 'ACTIVE' }));

  // exits
  const exitEmps = D.employees.filter((e) => e.status === 'NOTICE');
  exitEmps.forEach((e, i) => {
    const dep = D.deployments.find((d) => d.employee_id === e.id)!;
    const x = add('employee_exits', { employee_id: e.id, deployment_id: dep.id, exit_type: 'RESIGNATION', notice_date: iso(subDays(today, 10 + i * 5)),
      last_working_date: iso(addDays(today, 5 + i * 7)), notice_period_days: 15, notice_shortfall_days: 0, reason: pick(['Better opportunity', 'Relocating to native place']), rehire_eligible: true,
      status: i === 0 ? 'CLEARANCE' : 'INITIATED' });
    ['HR', 'OPERATIONS', 'ACCOUNTS', 'CLIENT_SITE', 'ASSETS'].forEach((department, di) => add('exit_clearances', { exit_id: x.id, department, status: i === 0 && di < 2 ? 'CLEARED' : 'PENDING', dues_amount: 0 }));
  });
  // one completed exit
  {
    const e = mkEmployee('EXITED', subDays(today, 400));
    e.date_of_exit = iso(subDays(today, 20));
    const dep = add('deployments', { deployment_no: `DEP-${String(depNo++).padStart(5, '0')}`, employee_id: e.id, client_id: 3, site_id: D.client_sites.find((s) => s.client_id === 3)!.id,
      contract_id: 3, designation_id: 1, start_date: iso(subDays(today, 400)), end_date: e.date_of_exit, status: 'ENDED', end_reason: 'EXIT' });
    const x = add('employee_exits', { employee_id: e.id, deployment_id: dep.id, exit_type: 'RESIGNATION', notice_date: iso(subDays(today, 35)), last_working_date: e.date_of_exit,
      notice_period_days: 15, notice_shortfall_days: 0, reason: 'Higher studies', rehire_eligible: true, status: 'COMPLETED' });
    ['HR', 'OPERATIONS', 'ACCOUNTS', 'CLIENT_SITE', 'ASSETS'].forEach((department) => add('exit_clearances', { exit_id: x.id, department, status: 'CLEARED', dues_amount: 0, cleared_by: 5, cleared_at: now }));
    add('fnf_settlements', { exit_id: x.id, employee_id: e.id, pending_salary: 11480, leave_encashment: 3120, bonus: 0, gratuity: 0, other_earnings: 0, notice_recovery: 0, advance_recovery: 0,
      asset_recovery: 650, other_deductions: 0, net_payable: 13950, status: 'PAID', paid_on: iso(subDays(today, 8)), payment_ref: 'UTR' + int(100000000, 999999999) });
  }

  // expenses & misc accounts
  add('expense_categories', { name: 'Recruitment advertising', is_active: true });
  add('expense_categories', { name: 'Uniforms & safety gear', is_active: true });
  add('expense_categories', { name: 'Travel & conveyance', is_active: true });
  add('expense_categories', { name: 'Office & admin', is_active: true });
  for (let i = 0; i < 10; i++) add('expenses', { expense_no: `EXP-${String(i + 1).padStart(4, '0')}`, category_id: int(1, 4), branch_id: 1, client_id: r() < 0.4 ? int(1, 5) : null,
    vendor_name: pick(['Naukri.com', 'Sri Durga Uniforms', 'Ola Corporate', 'Staples Office']), expense_date: iso(subDays(today, int(1, 60))), amount: int(15, 250) * 100,
    gst_amount: 0, tds_amount: 0, payment_mode: pick(['NEFT', 'UPI', 'CARD']), is_billable: r() < 0.3, status: i < 2 ? 'SUBMITTED' : pick(['APPROVED', 'PAID']), created_by: 6 });
  add('company_bank_accounts', { branch_id: 1, bank_name: 'HDFC Bank', account_last4: '4417', ifsc: 'HDFC0000521', purpose: 'SALARY', is_active: true });
  add('company_bank_accounts', { branch_id: 1, bank_name: 'ICICI Bank', account_last4: '9082', ifsc: 'ICIC0000031', purpose: 'COLLECTION', is_active: true });

  // compliance calendar & licences
  const due = (m: Date, d: number) => iso(new Date(m.getFullYear(), m.getMonth(), d));
  [['PF', `PF ECR & payment for ${format(lastMonth, 'MMM yyyy')}`, due(thisMonth, 15), 'DUE'], ['ESI', `ESI contribution for ${format(lastMonth, 'MMM yyyy')}`, due(thisMonth, 15), 'DUE'],
   ['PT', `Professional tax for ${format(lastMonth, 'MMM yyyy')}`, due(thisMonth, 10), today.getDate() > 10 ? 'COMPLETED' : 'UPCOMING'], ['GST', `GSTR-1 for ${format(lastMonth, 'MMM yyyy')}`, due(thisMonth, 11), 'UPCOMING'],
   ['GST', `GSTR-3B for ${format(lastMonth, 'MMM yyyy')}`, due(thisMonth, 20), 'UPCOMING'], ['LICENSE_RENEWAL', 'CLRA licence renewal - XYZ Electronics E-City Unit 1', iso(addDays(today, 18)), 'UPCOMING'],
   ['CONTRACT_RENEWAL', 'Contract renewals for next financial year', `${fyStart + 1}-03-01`, 'UPCOMING'], ['MIN_WAGE_REVISION', 'Check VDA revision notification', `${fyStart}-10-01`, 'UPCOMING']]
    .forEach(([compliance_type, title, due_date, status]) => add('compliance_tasks', { compliance_type, title, branch_id: 1, due_date, status, owner_id: compliance_type === 'GST' ? 6 : 2 }));

  // announcements, templates, tickets, settings
  add('announcements', { title: 'PF UAN KYC drive', body: 'All new joinees must complete Aadhaar-UAN seeding within their first week.', publish_at: now, created_by: 2 });
  add('announcements', { title: 'Diwali bonus timeline', body: 'Bonus computation will be processed with the October payroll.', publish_at: now, created_by: 1 });
  [['INTERVIEW_CALL', 'SMS', null, 'Dear {name}, your interview for {position} at {client} is on {date} at {venue}. - YSK Infotech'],
   ['OFFER_LETTER', 'EMAIL', 'Offer of employment - {position}', 'Dear {name},\nWe are pleased to offer you the position of {position}...'],
   ['JOINING_REMINDER', 'WHATSAPP', null, 'Hi {name}, reminder: please report at {site} on {date} at 9 AM with original documents.'],
   ['PAYMENT_REMINDER', 'EMAIL', 'Payment reminder: Invoice {invoice_no}', 'Dear {client},\nInvoice {invoice_no} for {amount} is due on {due_date}.']]
    .forEach(([code, channel, subject, body]) => add('message_templates', { code, channel, subject, body, variables: [], is_active: true }));
  add('support_tickets', { ticket_no: 'TKT-0001', raised_by: 4, category: 'ACCESS', subject: 'Cannot see Prime Manufacturing requisitions', description: 'Please give access.', priority: 'NORMAL', status: 'OPEN' });
  add('support_tickets', { ticket_no: 'TKT-0002', raised_by: 5, category: 'DATA_CORRECTION', subject: 'Wrong DOJ for YSK0012', description: 'DOJ should be 3rd of the month.', priority: 'HIGH', status: 'IN_PROGRESS', assigned_to: 1 });
  [['company_name', 'YSK Infotech Pvt Ltd'], ['company_tagline', 'Your Strategic Knowledge'], ['working_days_rule', 'CALENDAR_DAYS'], ['attendance_lock_day', 5], ['invoice_footer', 'Subject to Hyderabad jurisdiction.']]
    .forEach(([setting_key, setting_value]) => add('system_settings', { setting_key, setting_value }));
  add('report_schedules', { report_code: 'RECRUITMENT_MIS', frequency: 'WEEKLY', recipients: ['md@ysk.in'], format: 'XLSX', is_active: true });
  add('report_schedules', { report_code: 'ATTENDANCE_SUMMARY', client_id: 1, frequency: 'MONTHLY', recipients: ['hr@abcclient.in'], format: 'PDF', is_active: true });
  add('approval_workflows', { entity_type: 'PAYROLL_RUN', level: 1, approver_role_id: 2, is_active: true });
  add('approval_workflows', { entity_type: 'INVOICE', level: 1, approver_role_id: 2, is_active: true });
  add('approval_workflows', { entity_type: 'LEAVE', level: 1, approver_role_id: 2, is_active: true });
  add('approval_workflows', { entity_type: 'OVERTIME', level: 1, approver_role_id: 2, is_active: true });
  add('approval_workflows', { entity_type: 'EXPENSE', level: 1, approver_role_id: 1, min_amount: 0, is_active: true });
  add('approval_workflows', { entity_type: 'FNF', level: 1, approver_role_id: 1, is_active: true });
  add('approval_workflows', { entity_type: 'REQUISITION', level: 1, approver_role_id: 3, is_active: true });

  // empty collections that the UI writes to
  ['receipts', 'receipt_allocations', 'invoices', 'invoice_lines', 'credit_notes', 'payroll_runs', 'payslips', 'payslip_lines', 'pf_returns', 'pf_return_lines', 'esi_returns', 'esi_return_lines',
   'statutory_payments', 'approval_requests', 'approval_steps', 'notifications', 'activity_log', 'tds_certificates', 'gst_returns', 'communication_logs', 'advance_recoveries', 'salary_payment_batches',
   'user_client_access', 'refresh_tokens', 'employee_family_members', 'audit_log', 'payment_reminders', 'invoice_payroll_runs', 'hiring_drive_requisitions', 'attendance_import_errors']
    .forEach((c) => (D[c] ??= []));

  return D;
}

export const SEED_HELPERS = { iso, ts };
export { getDaysInMonth };

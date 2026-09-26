import { Link } from 'react-router-dom';
import type { ResourceConfig } from '@/components/ResourcePage';
import { StatusBadge, Badge, ProgressBar } from '@/components/ui';
import { formatDate, formatDateTime, formatINR, formatNum, titleCase } from '@/lib/utils';

const clientFilter = { name: 'client_id', label: 'clients', ref: { collection: 'clients', label: 'legal_name' } };
const link = (to: (r: any) => string, key: string) => (r: any) => <Link to={to(r)} className="font-medium text-brand-600 hover:underline" onClick={(e) => e.stopPropagation()}>{r[key]}</Link>;
const status = { key: 'status', header: 'Status', render: (r: any) => <StatusBadge value={r.status} /> };
const money = (key: string, header: string) => ({ key, header, align: 'right' as const, render: (r: any) => formatINR(r[key]) });
const date = (key: string, header: string) => ({ key, header, render: (r: any) => formatDate(r[key]) });

// ------------------------------------------------------------------ clients
export const clientsConfig: ResourceConfig = {
  collection: 'clients', title: 'Clients', singular: 'Client', searchPlaceholder: 'Search by name, code or GSTIN', editRoles: ['MD', 'OPS_MANAGER', 'ACCOUNTS'],
  rowLink: (r) => `/clients/${r.id}`,
  filters: [{ name: 'status', label: 'status', options: ['PROSPECT', 'ACTIVE', 'ON_HOLD', 'INACTIVE'] }, { name: 'industry_id', label: 'industries', ref: { collection: 'industries', label: 'name' } }],
  columns: [
    { key: 'code', header: 'Code', sortable: true }, { key: 'legal_name', header: 'Client', render: link((r) => `/clients/${r.id}`, 'legal_name'), sortable: true },
    { key: 'industry_name', header: 'Industry' }, { key: 'gstin', header: 'GSTIN' }, { key: 'billing_state_name', header: 'State' },
    { key: 'credit_days', header: 'Credit days', align: 'right' }, status,
  ],
  fields: [
    { name: 'code', label: 'Client code', required: true, placeholder: 'ABC' }, { name: 'legal_name', label: 'Legal name', required: true },
    { name: 'trade_name', label: 'Trade name' }, { name: 'industry_id', label: 'Industry', type: 'ref', ref: { collection: 'industries', label: 'name' }, required: true },
    { name: 'gstin', label: 'GSTIN', pattern: { value: /^[0-9A-Z]{15}$/, message: '15 characters, digits and capitals' } }, { name: 'pan', label: 'PAN' }, { name: 'tan', label: 'TAN (for TDS)' },
    { name: 'billing_state_id', label: 'Place of supply', type: 'ref', ref: { collection: 'states', label: 'name' }, required: true, hint: 'Decides CGST+SGST vs IGST' },
    { name: 'credit_days', label: 'Credit days', type: 'number', required: true, defaultValue: 30 },
    { name: 'account_manager_id', label: 'Account manager', type: 'ref', ref: { collection: 'users', label: 'full_name' } },
    { name: 'status', label: 'Status', type: 'select', options: ['PROSPECT', 'ACTIVE', 'ON_HOLD', 'INACTIVE'], defaultValue: 'ACTIVE', required: true },
    { name: 'billing_address', label: 'Billing address', type: 'textarea', span: 2, required: true },
    { name: 'branch_id', label: 'YSK branch', type: 'ref', ref: { collection: 'branches', label: 'name' }, required: true, defaultValue: 1 },
  ],
};

export const sitesConfig: ResourceConfig = {
  collection: 'client_sites', title: 'Sites', singular: 'Site', editRoles: ['MD', 'OPS_MANAGER'],
  columns: [{ key: 'site_code', header: 'Code' }, { key: 'name', header: 'Site' }, { key: 'client_name', header: 'Client' }, { key: 'city', header: 'City' },
    { key: 'site_incharge_name', header: 'Site in-charge' }, { key: 'site_incharge_phone', header: 'Phone' }],
  fields: [{ name: 'client_id', label: 'Client', type: 'ref', ref: { collection: 'clients', label: 'legal_name' }, required: true }, { name: 'site_code', label: 'Site code', required: true },
    { name: 'name', label: 'Site name', required: true }, { name: 'city', label: 'City' }, { name: 'state_id', label: 'State', type: 'ref', ref: { collection: 'states', label: 'name' }, required: true },
    { name: 'pincode', label: 'PIN code' }, { name: 'minimum_wage_zone_id', label: 'Minimum wage zone', type: 'ref', ref: { collection: 'minimum_wage_zones', label: 'name' } },
    { name: 'holiday_calendar_id', label: 'Holiday calendar', type: 'ref', ref: { collection: 'holiday_calendars', label: 'name' } },
    { name: 'site_incharge_name', label: 'Site in-charge' }, { name: 'site_incharge_phone', label: 'In-charge phone' }, { name: 'address', label: 'Address', type: 'textarea', span: 2 }],
};

export const contactsConfig: ResourceConfig = {
  collection: 'client_contacts', title: 'Contacts', singular: 'Contact', editRoles: ['MD', 'OPS_MANAGER', 'ACCOUNTS'], canDelete: true,
  columns: [{ key: 'name', header: 'Name' }, { key: 'designation', header: 'Designation' }, { key: 'client_name', header: 'Client' }, { key: 'email', header: 'Email' }, { key: 'phone', header: 'Phone' },
    { key: 'receives_invoices', header: 'Invoices', render: (r) => (r.receives_invoices ? <Badge color="green">Yes</Badge> : '—') },
    { key: 'can_approve_attendance', header: 'Approves attendance', render: (r) => (r.can_approve_attendance ? <Badge color="blue">Yes</Badge> : '—') }],
  fields: [{ name: 'client_id', label: 'Client', type: 'ref', ref: { collection: 'clients', label: 'legal_name' }, required: true },
    { name: 'site_id', label: 'Site', type: 'ref', ref: { collection: 'client_sites', label: 'name', params: (v: any) => ({ client_id: v.client_id }) } },
    { name: 'name', label: 'Name', required: true }, { name: 'designation', label: 'Designation' }, { name: 'email', label: 'Email', type: 'email' }, { name: 'phone', label: 'Phone', type: 'tel' },
    { name: 'is_primary', label: 'Primary contact', type: 'checkbox' }, { name: 'receives_invoices', label: 'Receives invoices', type: 'checkbox' },
    { name: 'receives_mis', label: 'Receives MIS reports', type: 'checkbox' }, { name: 'can_approve_attendance', label: 'Can approve attendance', type: 'checkbox' }],
};

export const contractsConfig: ResourceConfig = {
  collection: 'contracts', title: 'Contracts', singular: 'Contract', editRoles: ['MD', 'OPS_MANAGER', 'ACCOUNTS'],
  filters: [clientFilter, { name: 'status', label: 'status', options: ['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'] }],
  columns: [{ key: 'contract_no', header: 'Contract' }, { key: 'client_name', header: 'Client' }, { key: 'billing_model', header: 'Billing model', render: (r) => titleCase(r.billing_model) },
    { key: 'service_charge_percent', header: 'Service charge', align: 'right', render: (r) => (r.service_charge_percent ? `${r.service_charge_percent}%` : '—') },
    { key: 'payment_terms_days', header: 'Credit days', align: 'right' }, date('start_date', 'Start'), date('end_date', 'End'), status],
  fields: [{ name: 'client_id', label: 'Client', type: 'ref', ref: { collection: 'clients', label: 'legal_name' }, required: true }, { name: 'contract_no', label: 'Contract number', required: true },
    { name: 'start_date', label: 'Start date', type: 'date', required: true }, { name: 'end_date', label: 'End date', type: 'date' },
    { name: 'billing_model', label: 'Billing model', type: 'select', options: ['COST_PLUS', 'FIXED_PER_HEAD', 'PER_DAY', 'PER_HOUR'], required: true },
    { name: 'service_charge_percent', label: 'Service charge %', type: 'number', showIf: (v) => v.billing_model === 'COST_PLUS' },
    { name: 'statutory_billed_separately', label: 'Bill employer PF/ESI at actuals', type: 'checkbox', defaultValue: true },
    { name: 'ot_billing_multiplier', label: 'OT multiplier', type: 'number', defaultValue: 2 }, { name: 'payment_terms_days', label: 'Payment terms (days)', type: 'number', defaultValue: 30, required: true },
    { name: 'leave_policy_id', label: 'Leave policy', type: 'ref', ref: { collection: 'leave_policies', label: 'name' } },
    { name: 'renewal_reminder_days', label: 'Renewal reminder (days)', type: 'number', defaultValue: 30 },
    { name: 'status', label: 'Status', type: 'select', options: ['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'], defaultValue: 'DRAFT', required: true },
    { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 }],
};

export const rateCardsConfig: ResourceConfig = {
  collection: 'contract_rate_cards', title: 'Rate cards', singular: 'Rate card', editRoles: ['MD', 'OPS_MANAGER'], canDelete: true,
  columns: [{ key: 'designation_name', header: 'Designation' }, { key: 'contract_name', header: 'Contract' }, money('billing_rate', 'Billing rate'), { key: 'rate_unit', header: 'Per', render: (r) => titleCase(r.rate_unit) },
    money('ot_rate_per_hour', 'OT / hour'), { key: 'salary_structure_name', header: 'Salary structure' }, date('effective_from', 'Effective from')],
  fields: [{ name: 'contract_id', label: 'Contract', type: 'ref', ref: { collection: 'contracts', label: 'contract_no' }, required: true },
    { name: 'designation_id', label: 'Designation', type: 'ref', ref: { collection: 'designations', label: 'name' }, required: true },
    { name: 'site_id', label: 'Site (optional)', type: 'ref', ref: { collection: 'client_sites', label: 'name' } },
    { name: 'billing_rate', label: 'Billing rate', type: 'money', required: true }, { name: 'rate_unit', label: 'Rate unit', type: 'select', options: ['MONTH', 'DAY', 'HOUR'], defaultValue: 'MONTH', required: true },
    { name: 'ot_rate_per_hour', label: 'OT rate per hour', type: 'money' },
    { name: 'salary_structure_id', label: 'Salary structure', type: 'ref', ref: { collection: 'salary_structures', label: 'name' } },
    { name: 'effective_from', label: 'Effective from', type: 'date', required: true }, { name: 'effective_to', label: 'Effective to', type: 'date' }],
};

export const licensesConfig: ResourceConfig = {
  collection: 'client_licenses', title: 'Contract labour licences', singular: 'Licence', editRoles: ['MD', 'OPS_MANAGER'],
  filters: [clientFilter, { name: 'status', label: 'status', options: ['ACTIVE', 'RENEWAL_DUE', 'EXPIRED', 'CANCELLED'] }],
  columns: [{ key: 'license_no', header: 'Licence no.' }, { key: 'license_type', header: 'Type', render: (r) => titleCase(r.license_type) }, { key: 'client_name', header: 'Client' },
    { key: 'site_name', header: 'Site' }, date('expiry_date', 'Expiry'), { key: 'max_workers', header: 'Max workers', align: 'right' }, status],
  fields: [{ name: 'client_id', label: 'Client', type: 'ref', ref: { collection: 'clients', label: 'legal_name' }, required: true },
    { name: 'site_id', label: 'Site', type: 'ref', ref: { collection: 'client_sites', label: 'name', params: (v: any) => ({ client_id: v.client_id }) } },
    { name: 'license_type', label: 'Licence type', type: 'select', options: ['CLRA_LICENSE', 'FORM_V', 'PRINCIPAL_EMPLOYER_REG', 'SHOPS_ESTABLISHMENT', 'OTHER'], required: true },
    { name: 'license_no', label: 'Licence number', required: true }, { name: 'issued_by', label: 'Issued by' }, { name: 'issue_date', label: 'Issue date', type: 'date' },
    { name: 'expiry_date', label: 'Expiry date', type: 'date', required: true }, { name: 'max_workers', label: 'Maximum workers', type: 'number' },
    { name: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'RENEWAL_DUE', 'EXPIRED', 'CANCELLED'], defaultValue: 'ACTIVE' }],
};

// ------------------------------------------------------------------ recruitment
export const requisitionsConfig: ResourceConfig = {
  collection: 'requisitions', title: 'Manpower requisitions', singular: 'Requisition', searchPlaceholder: 'Search requisition number',
  editRoles: ['MD', 'REC_MANAGER'], rowLink: (r) => `/requisitions/${r.id}`,
  filters: [clientFilter, { name: 'status', label: 'status', options: ['DRAFT', 'PENDING_APPROVAL', 'OPEN', 'IN_PROGRESS', 'ON_HOLD', 'CLOSED', 'CANCELLED'] }, { name: 'priority', label: 'priority', options: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] }],
  columns: [{ key: 'req_no', header: 'Req no.', render: link((r) => `/requisitions/${r.id}`, 'req_no'), sortable: true }, { key: 'client_name', header: 'Client' },
    { key: 'designation_name', header: 'Position' }, { key: 'positions_required', header: 'Required', align: 'right' },
    { key: 'positions_filled', header: 'Filled', align: 'right', render: (r) => <span className="flex items-center justify-end gap-2">{r.positions_filled}<ProgressBar className="w-14" value={(r.positions_filled / r.positions_required) * 100} /></span> },
    date('required_by', 'Required by'), { key: 'priority', header: 'Priority', render: (r) => <StatusBadge value={r.priority} /> }, status],
  fields: [{ name: 'client_id', label: 'Client', type: 'ref', ref: { collection: 'clients', label: 'legal_name' }, required: true },
    { name: 'site_id', label: 'Site', type: 'ref', ref: { collection: 'client_sites', label: 'name', params: (v: any) => ({ client_id: v.client_id }) }, required: true },
    { name: 'contract_id', label: 'Contract', type: 'ref', ref: { collection: 'contracts', label: 'contract_no', params: (v: any) => ({ client_id: v.client_id }) } },
    { name: 'designation_id', label: 'Designation', type: 'ref', ref: { collection: 'designations', label: 'name' }, required: true },
    { name: 'positions_required', label: 'Positions required', type: 'number', required: true, min: 1 },
    { name: 'shift_id', label: 'Shift', type: 'ref', ref: { collection: 'shifts', label: 'name' } },
    { name: 'offered_gross_monthly', label: 'Offered gross (monthly)', type: 'money' }, { name: 'qualification', label: 'Qualification' },
    { name: 'min_experience_years', label: 'Min experience (years)', type: 'number' }, { name: 'max_experience_years', label: 'Max experience (years)', type: 'number' },
    { name: 'gender_preference', label: 'Gender preference', type: 'select', options: ['ANY', 'MALE', 'FEMALE'], defaultValue: 'ANY' },
    { name: 'required_by', label: 'Required by', type: 'date' }, { name: 'priority', label: 'Priority', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], defaultValue: 'MEDIUM' },
    { name: 'status', label: 'Status', type: 'select', options: ['DRAFT', 'PENDING_APPROVAL', 'OPEN', 'IN_PROGRESS', 'ON_HOLD', 'CLOSED', 'CANCELLED'], defaultValue: 'OPEN' },
    { name: 'job_description', label: 'Job description', type: 'textarea', span: 2 }],
};

export const candidatesConfig: ResourceConfig = {
  collection: 'candidates', title: 'Candidates', singular: 'Candidate', searchPlaceholder: 'Search name, mobile or code', editRoles: ['MD', 'REC_MANAGER', 'RECRUITER'],
  rowLink: (r) => `/candidates/${r.id}`,
  filters: [{ name: 'status', label: 'status', options: ['ACTIVE', 'JOINED', 'INACTIVE', 'BLACKLISTED'] }, { name: 'source', label: 'source', options: ['WALK_IN', 'JOB_PORTAL', 'REFERRAL', 'VENDOR', 'SOCIAL_MEDIA', 'HIRING_DRIVE', 'DATABASE'] },
    { name: 'owner_recruiter_id', label: 'recruiters', ref: { collection: 'users', label: 'full_name', params: { role: 'RECRUITER' } } }],
  columns: [{ key: 'candidate_code', header: 'Code' }, { key: 'full_name', header: 'Candidate', render: link((r) => `/candidates/${r.id}`, 'full_name'), sortable: true },
    { key: 'mobile', header: 'Mobile' }, { key: 'current_city', header: 'City' }, { key: 'highest_qualification', header: 'Qualification' },
    { key: 'experience_years', header: 'Exp (yrs)', align: 'right' }, { key: 'source', header: 'Source', render: (r) => titleCase(r.source) },
    { key: 'owner_recruiter_name', header: 'Recruiter' }, status],
  fields: [{ name: 'full_name', label: 'Full name', required: true }, { name: 'mobile', label: 'Mobile', type: 'tel', required: true, pattern: { value: /^[6-9]\d{9}$/, message: '10-digit Indian mobile number' } },
    { name: 'alt_mobile', label: 'Alternate mobile', type: 'tel' }, { name: 'email', label: 'Email', type: 'email' },
    { name: 'gender', label: 'Gender', type: 'select', options: ['MALE', 'FEMALE', 'OTHER'] }, { name: 'date_of_birth', label: 'Date of birth', type: 'date' },
    { name: 'current_city', label: 'Current city' }, { name: 'state_id', label: 'State', type: 'ref', ref: { collection: 'states', label: 'name' } },
    { name: 'highest_qualification', label: 'Qualification' }, { name: 'experience_years', label: 'Experience (years)', type: 'number' },
    { name: 'current_salary', label: 'Current salary', type: 'money' }, { name: 'expected_salary', label: 'Expected salary', type: 'money' },
    { name: 'source', label: 'Source', type: 'select', options: ['WALK_IN', 'JOB_PORTAL', 'REFERRAL', 'VENDOR', 'SOCIAL_MEDIA', 'HIRING_DRIVE', 'DATABASE'], required: true },
    { name: 'vendor_id', label: 'Vendor', type: 'ref', ref: { collection: 'vendors', label: 'name' }, showIf: (v) => v.source === 'VENDOR' },
    { name: 'owner_recruiter_id', label: 'Owner recruiter', type: 'ref', ref: { collection: 'users', label: 'full_name', params: { role: 'RECRUITER' } } },
    { name: 'skills', label: 'Skills', type: 'tags', span: 2, placeholder: 'machine operation, packing' },
    { name: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'JOINED', 'INACTIVE', 'BLACKLISTED'], defaultValue: 'ACTIVE' }],
};

export const interviewsConfig: ResourceConfig = {
  collection: 'interviews', title: 'Interviews', singular: 'Interview', editRoles: ['REC_MANAGER', 'RECRUITER'],
  filters: [{ name: 'status', label: 'status', options: ['SCHEDULED', 'COMPLETED', 'RESCHEDULED', 'CANCELLED', 'NO_SHOW'] }, { name: 'mode', label: 'mode', options: ['TELEPHONIC', 'IN_PERSON', 'VIDEO'] }],
  defaultSort: '-scheduled_at',
  columns: [{ key: 'scheduled_at', header: 'Date & time', render: (r) => formatDateTime(r.scheduled_at), sortable: true }, { key: 'candidate_name', header: 'Candidate' },
    { key: 'client_name', header: 'Client' }, { key: 'position_name', header: 'Position' }, { key: 'mode', header: 'Mode', render: (r) => titleCase(r.mode) },
    { key: 'interviewer_name', header: 'Interviewer' }, status, { key: 'result', header: 'Result', render: (r) => <StatusBadge value={r.result} /> }],
  fields: [{ name: 'application_id', label: 'Application', type: 'ref', required: true, ref: { collection: 'applications', label: (r: any) => `${r.candidate_name} · ${r.designation_name} (${r.client_name})` } },
    { name: 'round_no', label: 'Round', type: 'number', defaultValue: 1 }, { name: 'mode', label: 'Mode', type: 'select', options: ['TELEPHONIC', 'IN_PERSON', 'VIDEO'], required: true },
    { name: 'scheduled_at', label: 'Scheduled at', type: 'datetime', required: true }, { name: 'location', label: 'Location / link' },
    { name: 'interviewer_type', label: 'Interviewer type', type: 'select', options: ['CLIENT', 'INTERNAL'], defaultValue: 'CLIENT' }, { name: 'interviewer_name', label: 'Interviewer name' },
    { name: 'status', label: 'Status', type: 'select', options: ['SCHEDULED', 'COMPLETED', 'RESCHEDULED', 'CANCELLED', 'NO_SHOW'], defaultValue: 'SCHEDULED' },
    { name: 'result', label: 'Result', type: 'select', options: ['SELECTED', 'REJECTED', 'ON_HOLD'] }, { name: 'rating', label: 'Rating (1-5)', type: 'number', min: 1, max: 5 },
    { name: 'feedback', label: 'Feedback', type: 'textarea', span: 2 }],
};

export const offersConfig: ResourceConfig = {
  collection: 'offers', title: 'Offers', singular: 'Offer', editRoles: ['REC_MANAGER', 'RECRUITER'], rowLink: (r) => `/offers/${r.id}`,
  filters: [{ name: 'status', label: 'status', options: ['DRAFT', 'RELEASED', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED'] }],
  columns: [{ key: 'offer_no', header: 'Offer', render: link((r) => `/offers/${r.id}`, 'offer_no') }, { key: 'candidate_name', header: 'Candidate' }, { key: 'client_name', header: 'Client' },
    { key: 'position_name', header: 'Position' }, money('gross_monthly', 'Gross / month'), date('joining_date', 'Joining date'), status],
  fields: [{ name: 'application_id', label: 'Application', type: 'ref', required: true, ref: { collection: 'applications', label: (r: any) => `${r.candidate_name} · ${r.designation_name}`, params: { stage: 'SELECTED' } } },
    { name: 'designation_id', label: 'Designation', type: 'ref', ref: { collection: 'designations', label: 'name' }, required: true },
    { name: 'salary_structure_id', label: 'Salary structure', type: 'ref', ref: { collection: 'salary_structures', label: 'name' } },
    { name: 'gross_monthly', label: 'Gross monthly', type: 'money', required: true }, { name: 'ctc_monthly', label: 'CTC monthly', type: 'money' },
    { name: 'joining_date', label: 'Joining date', type: 'date', required: true },
    { name: 'status', label: 'Status', type: 'select', options: ['DRAFT', 'RELEASED', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED'], defaultValue: 'DRAFT' }],
};

export const followUpsConfig: ResourceConfig = {
  collection: 'follow_ups', title: 'Follow-ups', singular: 'Follow-up', editRoles: ['REC_MANAGER', 'RECRUITER'], defaultSort: 'due_at',
  filters: [{ name: 'status', label: 'status', options: ['PENDING', 'DONE', 'SKIPPED'] }, { name: 'follow_up_type', label: 'type', options: ['CANDIDATE', 'FEEDBACK', 'OFFER', 'JOINING', 'DOCUMENTS'] }],
  columns: [{ key: 'due_at', header: 'Due', render: (r) => formatDateTime(r.due_at), sortable: true }, { key: 'candidate_name', header: 'Candidate' },
    { key: 'follow_up_type', header: 'Type', render: (r) => <Badge color="violet">{titleCase(r.follow_up_type)}</Badge> }, { key: 'assigned_to_name', header: 'Assigned to' }, status, { key: 'outcome_notes', header: 'Notes' }],
  fields: [{ name: 'candidate_id', label: 'Candidate', type: 'ref', ref: { collection: 'candidates', label: 'full_name' }, required: true },
    { name: 'follow_up_type', label: 'Type', type: 'select', options: ['CANDIDATE', 'FEEDBACK', 'OFFER', 'JOINING', 'DOCUMENTS'], required: true },
    { name: 'assigned_to', label: 'Assigned to', type: 'ref', ref: { collection: 'users', label: 'full_name' }, required: true },
    { name: 'due_at', label: 'Due at', type: 'datetime', required: true }, { name: 'status', label: 'Status', type: 'select', options: ['PENDING', 'DONE', 'SKIPPED'], defaultValue: 'PENDING' },
    { name: 'outcome_notes', label: 'Notes', type: 'textarea', span: 2 }],
};

export const drivesConfig: ResourceConfig = {
  collection: 'hiring_drives', title: 'Hiring drives', singular: 'Drive', editRoles: ['REC_MANAGER'],
  columns: [{ key: 'name', header: 'Drive' }, { key: 'client_name', header: 'Client' }, date('drive_date', 'Date'), { key: 'venue', header: 'Venue' },
    { key: 'target_count', header: 'Target', align: 'right' }, { key: 'coordinator_name', header: 'Coordinator' }, status],
  fields: [{ name: 'name', label: 'Drive name', required: true, span: 2 }, { name: 'client_id', label: 'Client', type: 'ref', ref: { collection: 'clients', label: 'legal_name' } },
    { name: 'drive_date', label: 'Date', type: 'date', required: true }, { name: 'target_count', label: 'Target candidates', type: 'number' },
    { name: 'coordinator_id', label: 'Coordinator', type: 'ref', ref: { collection: 'users', label: 'full_name' } },
    { name: 'status', label: 'Status', type: 'select', options: ['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED'], defaultValue: 'PLANNED' }, { name: 'venue', label: 'Venue', type: 'textarea', span: 2 }],
};

export const vendorsConfig: ResourceConfig = {
  collection: 'vendors', title: 'Sourcing vendors', singular: 'Vendor', editRoles: ['REC_MANAGER'],
  columns: [{ key: 'name', header: 'Vendor' }, { key: 'vendor_type', header: 'Type', render: (r) => titleCase(r.vendor_type) }, { key: 'contact_person', header: 'Contact' },
    { key: 'phone', header: 'Phone' }, { key: 'email', header: 'Email' }, { key: 'commission_value', header: 'Commission', align: 'right', render: (r) => (r.commission_type === 'PERCENT' ? `${r.commission_value}%` : r.commission_value ? formatINR(r.commission_value) : '—') }],
  fields: [{ name: 'name', label: 'Vendor name', required: true }, { name: 'vendor_type', label: 'Type', type: 'select', options: ['CONSULTANT', 'JOB_PORTAL', 'REFERRAL_AGENT', 'TRAINING_INSTITUTE', 'OTHER'], required: true },
    { name: 'contact_person', label: 'Contact person' }, { name: 'phone', label: 'Phone', type: 'tel' }, { name: 'email', label: 'Email', type: 'email' },
    { name: 'commission_type', label: 'Commission type', type: 'select', options: ['NONE', 'FIXED', 'PERCENT'], defaultValue: 'NONE' }, { name: 'commission_value', label: 'Commission value', type: 'number' }],
};

export const targetsConfig: ResourceConfig = {
  collection: 'recruiter_targets', title: 'Recruiter targets', singular: 'Target', editRoles: ['REC_MANAGER'],
  columns: [{ key: 'recruiter_name', header: 'Recruiter' }, { key: 'period_month', header: 'Month', render: (r) => formatDate(r.period_month, 'MMM yyyy') },
    { key: 'sourcing_target', header: 'Sourcing', align: 'right' }, { key: 'interview_target', header: 'Interviews', align: 'right' }, { key: 'joining_target', header: 'Joinings', align: 'right' }],
  fields: [{ name: 'recruiter_id', label: 'Recruiter', type: 'ref', ref: { collection: 'users', label: 'full_name', params: { role: 'RECRUITER' } }, required: true },
    { name: 'period_month', label: 'Month', type: 'date', required: true, hint: 'Use the first day of the month' },
    { name: 'sourcing_target', label: 'Sourcing target', type: 'number' }, { name: 'interview_target', label: 'Interview target', type: 'number' }, { name: 'joining_target', label: 'Joining target', type: 'number' }],
};

// ------------------------------------------------------------------ workforce
export const employeesConfig: ResourceConfig = {
  collection: 'employees', title: 'Employees', singular: 'Employee', searchPlaceholder: 'Search name, code, mobile or UAN',
  editRoles: ['MD', 'OPS_MANAGER', 'HR_OPS'], rowLink: (r) => `/employees/${r.id}`,
  filters: [{ name: 'status', label: 'status', options: ['ONBOARDING', 'ACTIVE', 'ON_HOLD', 'NOTICE', 'EXITED'] }, { name: 'category', label: 'category', options: ['DEPLOYED', 'INTERNAL'] }],
  columns: [{ key: 'employee_code', header: 'Code', render: link((r) => `/employees/${r.id}`, 'employee_code'), sortable: true },
    { key: 'full_name', header: 'Name' }, { key: 'current_designation_name', header: 'Designation' }, { key: 'current_client_name', header: 'Client' },
    { key: 'mobile', header: 'Mobile' }, date('date_of_joining', 'DOJ'), { key: 'uan', header: 'UAN', render: (r) => r.uan ?? <Badge color="amber">Pending</Badge> }, status],
  fields: [{ name: 'first_name', label: 'First name', required: true }, { name: 'last_name', label: 'Last name' },
    { name: 'father_or_spouse_name', label: 'Father / spouse name', hint: 'Needed for UAN and ESIC' },
    { name: 'gender', label: 'Gender', type: 'select', options: ['MALE', 'FEMALE', 'OTHER'], required: true }, { name: 'date_of_birth', label: 'Date of birth', type: 'date', required: true },
    { name: 'marital_status', label: 'Marital status', type: 'select', options: ['SINGLE', 'MARRIED', 'WIDOWED', 'DIVORCED'] },
    { name: 'mobile', label: 'Mobile', type: 'tel', required: true }, { name: 'email', label: 'Email', type: 'email' },
    { name: 'category', label: 'Category', type: 'select', options: ['DEPLOYED', 'INTERNAL'], defaultValue: 'DEPLOYED', required: true },
    { name: 'date_of_joining', label: 'Date of joining', type: 'date', required: true },
    { name: 'status', label: 'Status', type: 'select', options: ['ONBOARDING', 'ACTIVE', 'ON_HOLD', 'NOTICE', 'EXITED'], defaultValue: 'ONBOARDING' },
    { name: 'uan', label: 'UAN' }, { name: 'esic_ip_number', label: 'ESIC IP number' },
    { name: 'pf_applicable', label: 'PF applicable', type: 'checkbox', defaultValue: true }, { name: 'esi_applicable', label: 'ESI applicable', type: 'checkbox', defaultValue: true },
    { name: 'pt_applicable', label: 'PT applicable', type: 'checkbox', defaultValue: true },
    { name: 'state_id', label: 'Home state', type: 'ref', ref: { collection: 'states', label: 'name' } }, { name: 'branch_id', label: 'Branch', type: 'ref', ref: { collection: 'branches', label: 'name' }, defaultValue: 1, required: true },
    { name: 'current_address', label: 'Current address', type: 'textarea', span: 2 }, { name: 'permanent_address', label: 'Permanent address', type: 'textarea', span: 2 }],
};

export const deploymentsConfig: ResourceConfig = {
  collection: 'deployments', title: 'Deployments', singular: 'Deployment', editRoles: ['MD', 'OPS_MANAGER', 'HR_OPS'],
  filters: [clientFilter, { name: 'status', label: 'status', options: ['PLANNED', 'ACTIVE', 'ENDED', 'CANCELLED'] }],
  columns: [{ key: 'deployment_no', header: 'Deployment' }, { key: 'employee_name', header: 'Employee', render: link((r) => `/employees/${r.employee_id}`, 'employee_name') },
    { key: 'client_name', header: 'Client' }, { key: 'site_name', header: 'Site' }, { key: 'designation_name', header: 'Designation' },
    date('start_date', 'From'), date('end_date', 'To'), status],
  fields: [{ name: 'employee_id', label: 'Employee', type: 'ref', ref: { collection: 'employees', label: (r: any) => `${r.full_name} (${r.employee_code})` }, required: true },
    { name: 'client_id', label: 'Client', type: 'ref', ref: { collection: 'clients', label: 'legal_name' }, required: true },
    { name: 'site_id', label: 'Site', type: 'ref', ref: { collection: 'client_sites', label: 'name', params: (v: any) => ({ client_id: v.client_id }) }, required: true },
    { name: 'contract_id', label: 'Contract', type: 'ref', ref: { collection: 'contracts', label: 'contract_no', params: (v: any) => ({ client_id: v.client_id }) }, required: true },
    { name: 'designation_id', label: 'Designation', type: 'ref', ref: { collection: 'designations', label: 'name' }, required: true },
    { name: 'rate_card_id', label: 'Rate card', type: 'ref', ref: { collection: 'contract_rate_cards', label: (r: any) => `${r.designation_name} · ${formatINR(r.billing_rate)} / ${titleCase(r.rate_unit)}`, params: (v: any) => ({ contract_id: v.contract_id }) } },
    { name: 'start_date', label: 'Start date', type: 'date', required: true }, { name: 'end_date', label: 'End date', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', options: ['PLANNED', 'ACTIVE', 'ENDED', 'CANCELLED'], defaultValue: 'PLANNED' },
    { name: 'supervisor_name', label: 'Supervisor at site' }],
};

export const shiftsConfig: ResourceConfig = {
  collection: 'shifts', title: 'Shifts', singular: 'Shift', editRoles: ['OPS_MANAGER'],
  columns: [{ key: 'code', header: 'Code' }, { key: 'name', header: 'Shift' }, { key: 'start_time', header: 'Start' }, { key: 'end_time', header: 'End' },
    { key: 'client_name', header: 'Client', render: (r) => r.client_name ?? 'All clients' }, { key: 'break_minutes', header: 'Break (min)', align: 'right' },
    { key: 'is_night_shift', header: 'Night', render: (r) => (r.is_night_shift ? <Badge color="violet">Night</Badge> : '—') }],
  fields: [{ name: 'code', label: 'Code', required: true }, { name: 'name', label: 'Shift name', required: true },
    { name: 'client_id', label: 'Client (optional)', type: 'ref', ref: { collection: 'clients', label: 'legal_name' } },
    { name: 'start_time', label: 'Start time', type: 'time', required: true }, { name: 'end_time', label: 'End time', type: 'time', required: true },
    { name: 'crosses_midnight', label: 'Crosses midnight', type: 'checkbox' }, { name: 'is_night_shift', label: 'Night shift', type: 'checkbox' },
    { name: 'break_minutes', label: 'Break (minutes)', type: 'number', defaultValue: 30 }, { name: 'grace_minutes', label: 'Grace (minutes)', type: 'number', defaultValue: 10 }],
};

export const leaveConfig: ResourceConfig = {
  collection: 'leave_requests', title: 'Leave requests', singular: 'Leave request', editRoles: ['OPS_MANAGER', 'HR_OPS'],
  filters: [{ name: 'status', label: 'status', options: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] }],
  columns: [{ key: 'employee_name', header: 'Employee' }, { key: 'leave_type_name', header: 'Type' }, date('from_date', 'From'), date('to_date', 'To'),
    { key: 'days', header: 'Days', align: 'right' }, { key: 'reason', header: 'Reason' }, status],
  fields: [{ name: 'employee_id', label: 'Employee', type: 'ref', ref: { collection: 'employees', label: (r: any) => `${r.full_name} (${r.employee_code})` }, required: true },
    { name: 'leave_type_id', label: 'Leave type', type: 'ref', ref: { collection: 'leave_types', label: 'name' }, required: true },
    { name: 'from_date', label: 'From', type: 'date', required: true }, { name: 'to_date', label: 'To', type: 'date', required: true },
    { name: 'days', label: 'Days', type: 'number', required: true }, { name: 'reason', label: 'Reason', type: 'textarea', span: 2 }],
};

export const overtimeConfig: ResourceConfig = {
  collection: 'overtime_requests', title: 'Overtime requests', singular: 'Overtime request', editRoles: ['OPS_MANAGER', 'HR_OPS'],
  filters: [{ name: 'status', label: 'status', options: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] }],
  columns: [{ key: 'employee_name', header: 'Employee' }, date('ot_date', 'Date'), { key: 'ot_minutes', header: 'Hours', align: 'right', render: (r) => (r.ot_minutes / 60).toFixed(1) },
    { key: 'reason', header: 'Reason' }, { key: 'is_billable', header: 'Billable', render: (r) => (r.is_billable ? <Badge color="green">Billable</Badge> : <Badge>Absorbed</Badge>) }, status],
  fields: [{ name: 'employee_id', label: 'Employee', type: 'ref', ref: { collection: 'employees', label: (r: any) => `${r.full_name} (${r.employee_code})` }, required: true },
    { name: 'deployment_id', label: 'Deployment', type: 'ref', ref: { collection: 'deployments', label: 'deployment_no', params: (v: any) => ({ employee_id: v.employee_id }) }, required: true },
    { name: 'ot_date', label: 'Date', type: 'date', required: true }, { name: 'ot_minutes', label: 'Minutes', type: 'number', required: true },
    { name: 'is_billable', label: 'Billable to client', type: 'checkbox', defaultValue: true }, { name: 'reason', label: 'Reason', type: 'textarea', span: 2 }],
};

export const advancesConfig: ResourceConfig = {
  collection: 'salary_advances', title: 'Advances & loans', singular: 'Advance', editRoles: ['MD', 'OPS_MANAGER'],
  columns: [{ key: 'employee_name', header: 'Employee' }, { key: 'advance_type', header: 'Type', render: (r) => titleCase(r.advance_type) }, money('amount', 'Amount'),
    money('instalment_amount', 'Instalment'), money('recovered_amount', 'Recovered'), date('issued_on', 'Issued'), status],
  fields: [{ name: 'employee_id', label: 'Employee', type: 'ref', ref: { collection: 'employees', label: (r: any) => `${r.full_name} (${r.employee_code})` }, required: true },
    { name: 'advance_type', label: 'Type', type: 'select', options: ['ADVANCE', 'LOAN'], defaultValue: 'ADVANCE', required: true },
    { name: 'amount', label: 'Amount', type: 'money', required: true }, { name: 'instalment_amount', label: 'Monthly instalment', type: 'money', required: true },
    { name: 'issued_on', label: 'Issued on', type: 'date', required: true }, { name: 'status', label: 'Status', type: 'select', options: ['PENDING', 'ACTIVE', 'CLOSED', 'WRITTEN_OFF'], defaultValue: 'ACTIVE' }],
};

export const exitsConfig: ResourceConfig = {
  collection: 'employee_exits', title: 'Exits & full-and-final', singular: 'Exit', editRoles: ['MD', 'OPS_MANAGER', 'HR_OPS'], rowLink: (r) => `/exits/${r.id}`,
  filters: [{ name: 'status', label: 'status', options: ['INITIATED', 'CLEARANCE', 'FNF_PENDING', 'COMPLETED', 'WITHDRAWN'] }],
  columns: [{ key: 'employee_code', header: 'Code' }, { key: 'employee_name', header: 'Employee', render: link((r) => `/exits/${r.id}`, 'employee_name') },
    { key: 'exit_type', header: 'Type', render: (r) => titleCase(r.exit_type) }, date('notice_date', 'Notice'), date('last_working_date', 'Last working day'), status],
  fields: [{ name: 'employee_id', label: 'Employee', type: 'ref', ref: { collection: 'employees', label: (r: any) => `${r.full_name} (${r.employee_code})` }, required: true },
    { name: 'deployment_id', label: 'Deployment', type: 'ref', ref: { collection: 'deployments', label: 'deployment_no', params: (v: any) => ({ employee_id: v.employee_id }) } },
    { name: 'exit_type', label: 'Exit type', type: 'select', options: ['RESIGNATION', 'TERMINATION', 'ABSCONDING', 'END_OF_CONTRACT', 'CLIENT_RELEASE', 'DEATH', 'RETIREMENT'], required: true },
    { name: 'notice_date', label: 'Notice date', type: 'date' }, { name: 'last_working_date', label: 'Last working day', type: 'date', required: true },
    { name: 'notice_period_days', label: 'Notice period (days)', type: 'number', defaultValue: 15 }, { name: 'notice_shortfall_days', label: 'Shortfall days', type: 'number', defaultValue: 0 },
    { name: 'rehire_eligible', label: 'Eligible for rehire', type: 'checkbox', defaultValue: true }, { name: 'reason', label: 'Reason', type: 'textarea', span: 2 }],
};

// ------------------------------------------------------------------ payroll & compliance
export const salaryStructuresConfig: ResourceConfig = {
  collection: 'salary_structures', title: 'Salary structures', singular: 'Structure', editRoles: ['MD', 'OPS_MANAGER'],
  columns: [{ key: 'code', header: 'Code' }, { key: 'name', header: 'Structure' }, { key: 'client_name', header: 'Client', render: (r) => r.client_name ?? 'All clients' },
    { key: 'designation_name', header: 'Designation', render: (r) => r.designation_name ?? 'Any' }, { key: 'pay_basis', header: 'Pay basis', render: (r) => titleCase(r.pay_basis) }, date('effective_from', 'Effective from')],
  fields: [{ name: 'code', label: 'Code', required: true }, { name: 'name', label: 'Name', required: true },
    { name: 'client_id', label: 'Client', type: 'ref', ref: { collection: 'clients', label: 'legal_name' } },
    { name: 'designation_id', label: 'Designation', type: 'ref', ref: { collection: 'designations', label: 'name' } },
    { name: 'state_id', label: 'State', type: 'ref', ref: { collection: 'states', label: 'name' } },
    { name: 'pay_basis', label: 'Pay basis', type: 'select', options: ['MONTHLY', 'DAILY', 'HOURLY'], defaultValue: 'MONTHLY' },
    { name: 'effective_from', label: 'Effective from', type: 'date', required: true }, { name: 'effective_to', label: 'Effective to', type: 'date' }],
};

export const minimumWagesConfig: ResourceConfig = {
  collection: 'minimum_wages', title: 'Minimum wages', singular: 'Minimum wage', editRoles: ['MD', 'OPS_MANAGER'],
  subtitle: 'Seeded with sample values. Replace with the current notified rates before go-live.',
  columns: [{ key: 'state_name', header: 'State' }, { key: 'skill_category', header: 'Skill', render: (r) => titleCase(r.skill_category) }, money('basic_per_month', 'Basic'),
    money('vda_per_month', 'VDA'), money('total_per_month', 'Total / month'), money('per_day', 'Per day'), date('effective_from', 'Effective from'), { key: 'notification_ref', header: 'Notification' }],
  fields: [{ name: 'state_id', label: 'State', type: 'ref', ref: { collection: 'states', label: 'name' }, required: true },
    { name: 'zone_id', label: 'Zone', type: 'ref', ref: { collection: 'minimum_wage_zones', label: 'name' } },
    { name: 'skill_category', label: 'Skill category', type: 'select', options: ['UNSKILLED', 'SEMI_SKILLED', 'SKILLED', 'HIGHLY_SKILLED'], required: true },
    { name: 'basic_per_month', label: 'Basic per month', type: 'money', required: true }, { name: 'vda_per_month', label: 'VDA per month', type: 'money', defaultValue: 0 },
    { name: 'per_day', label: 'Per day', type: 'money' }, { name: 'effective_from', label: 'Effective from', type: 'date', required: true }, { name: 'notification_ref', label: 'Notification reference' }],
};

export const complianceConfig: ResourceConfig = {
  collection: 'compliance_tasks', title: 'Compliance calendar', singular: 'Compliance task', editRoles: ['MD', 'OPS_MANAGER', 'ACCOUNTS'], defaultSort: 'due_date',
  filters: [{ name: 'status', label: 'status', options: ['UPCOMING', 'DUE', 'OVERDUE', 'COMPLETED'] }, { name: 'compliance_type', label: 'type', options: ['PF', 'ESI', 'PT', 'LWF', 'TDS', 'GST', 'CLRA_RETURN', 'LICENSE_RENEWAL', 'CONTRACT_RENEWAL', 'MIN_WAGE_REVISION', 'OTHER'] }],
  columns: [date('due_date', 'Due date'), { key: 'compliance_type', header: 'Type', render: (r) => <Badge color="blue">{titleCase(r.compliance_type)}</Badge> },
    { key: 'title', header: 'Task' }, { key: 'client_name', header: 'Client' }, { key: 'owner_name', header: 'Owner' }, status],
  fields: [{ name: 'compliance_type', label: 'Type', type: 'select', options: ['PF', 'ESI', 'PT', 'LWF', 'TDS', 'GST', 'CLRA_RETURN', 'LICENSE_RENEWAL', 'CONTRACT_RENEWAL', 'MIN_WAGE_REVISION', 'OTHER'], required: true },
    { name: 'title', label: 'Title', required: true, span: 2 }, { name: 'due_date', label: 'Due date', type: 'date', required: true },
    { name: 'client_id', label: 'Client', type: 'ref', ref: { collection: 'clients', label: 'legal_name' } },
    { name: 'owner_id', label: 'Owner', type: 'ref', ref: { collection: 'users', label: 'full_name' } },
    { name: 'status', label: 'Status', type: 'select', options: ['UPCOMING', 'DUE', 'OVERDUE', 'COMPLETED'], defaultValue: 'UPCOMING' },
    { name: 'completed_on', label: 'Completed on', type: 'date' }],
};

// ------------------------------------------------------------------ billing
export const invoicesConfig: ResourceConfig = {
  collection: 'invoices', title: 'Invoices', singular: 'Invoice', searchPlaceholder: 'Search invoice number', rowLink: (r) => `/invoices/${r.id}`, defaultSort: '-invoice_date',
  filters: [clientFilter, { name: 'status', label: 'status', options: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'] }],
  columns: [{ key: 'invoice_no', header: 'Invoice', render: link((r) => `/invoices/${r.id}`, 'invoice_no'), sortable: true }, date('invoice_date', 'Date'),
    { key: 'client_name', header: 'Client' }, { key: 'period_from', header: 'Period', render: (r) => formatDate(r.period_from, 'MMM yyyy') },
    money('taxable_amount', 'Taxable'), money('total_amount', 'Total'), money('balance_due', 'Balance'), date('due_date', 'Due date'), status],
};

export const receiptsConfig: ResourceConfig = {
  collection: 'receipts', title: 'Receipts', singular: 'Receipt', defaultSort: '-receipt_date',
  filters: [clientFilter, { name: 'payment_mode', label: 'mode', options: ['NEFT', 'RTGS', 'IMPS', 'CHEQUE', 'UPI', 'CASH'] }],
  columns: [{ key: 'receipt_no', header: 'Receipt' }, date('receipt_date', 'Date'), { key: 'client_name', header: 'Client' }, money('amount_received', 'Amount'),
    money('tds_amount', 'TDS'), { key: 'payment_mode', header: 'Mode' }, { key: 'reference_no', header: 'Reference' }, money('unallocated_amount', 'Unallocated'), status],
};

export const creditNotesConfig: ResourceConfig = {
  collection: 'credit_notes', title: 'Credit notes', singular: 'Credit note', editRoles: ['MD', 'ACCOUNTS'],
  columns: [{ key: 'credit_note_no', header: 'Credit note' }, date('note_date', 'Date'), { key: 'client_name', header: 'Client' }, { key: 'invoice_name', header: 'Against invoice' },
    money('taxable_amount', 'Taxable'), money('total_amount', 'Total'), { key: 'reason', header: 'Reason' }, status],
  fields: [{ name: 'invoice_id', label: 'Invoice', type: 'ref', ref: { collection: 'invoices', label: 'invoice_no' }, required: true },
    { name: 'client_id', label: 'Client', type: 'ref', ref: { collection: 'clients', label: 'legal_name' }, required: true },
    { name: 'note_date', label: 'Date', type: 'date', required: true }, { name: 'taxable_amount', label: 'Taxable amount', type: 'money', required: true },
    { name: 'cgst_amount', label: 'CGST', type: 'money', defaultValue: 0 }, { name: 'sgst_amount', label: 'SGST', type: 'money', defaultValue: 0 }, { name: 'igst_amount', label: 'IGST', type: 'money', defaultValue: 0 },
    { name: 'total_amount', label: 'Total', type: 'money', required: true }, { name: 'status', label: 'Status', type: 'select', options: ['DRAFT', 'APPROVED', 'ISSUED', 'CANCELLED'], defaultValue: 'DRAFT' },
    { name: 'reason', label: 'Reason', type: 'textarea', span: 2, required: true }],
};

export const expensesConfig: ResourceConfig = {
  collection: 'expenses', title: 'Expenses', singular: 'Expense', editRoles: ['MD', 'ACCOUNTS'],
  filters: [{ name: 'status', label: 'status', options: ['SUBMITTED', 'APPROVED', 'REJECTED', 'PAID'] }, { name: 'category_id', label: 'categories', ref: { collection: 'expense_categories', label: 'name' } }],
  columns: [{ key: 'expense_no', header: 'Expense' }, date('expense_date', 'Date'), { key: 'category_name', header: 'Category' }, { key: 'vendor_name', header: 'Paid to' },
    { key: 'client_name', header: 'Client' }, money('amount', 'Amount'), { key: 'is_billable', header: 'Billable', render: (r) => (r.is_billable ? <Badge color="green">Billable</Badge> : '—') }, status],
  fields: [{ name: 'category_id', label: 'Category', type: 'ref', ref: { collection: 'expense_categories', label: 'name' }, required: true },
    { name: 'expense_date', label: 'Date', type: 'date', required: true }, { name: 'vendor_name', label: 'Paid to' }, { name: 'amount', label: 'Amount', type: 'money', required: true },
    { name: 'gst_amount', label: 'GST', type: 'money', defaultValue: 0 }, { name: 'tds_amount', label: 'TDS', type: 'money', defaultValue: 0 },
    { name: 'payment_mode', label: 'Payment mode', type: 'select', options: ['NEFT', 'RTGS', 'IMPS', 'CHEQUE', 'UPI', 'CASH', 'CARD'] },
    { name: 'client_id', label: 'Client (if billable)', type: 'ref', ref: { collection: 'clients', label: 'legal_name' } },
    { name: 'is_billable', label: 'Billable to client', type: 'checkbox' }, { name: 'branch_id', label: 'Branch', type: 'ref', ref: { collection: 'branches', label: 'name' }, defaultValue: 1, required: true }],
};

export const announcementsConfig: ResourceConfig = {
  collection: 'announcements', title: 'Announcements', singular: 'Announcement', editRoles: ['MD', 'OPS_MANAGER'], canDelete: true,
  columns: [{ key: 'title', header: 'Title' }, { key: 'body', header: 'Message' }, { key: 'audience_role_name', header: 'Audience', render: (r) => r.audience_role_name ?? 'Everyone' },
    { key: 'publish_at', header: 'Published', render: (r) => formatDateTime(r.publish_at) }],
  fields: [{ name: 'title', label: 'Title', required: true, span: 2 }, { name: 'body', label: 'Message', type: 'textarea', required: true, span: 2 },
    { name: 'audience_role_id', label: 'Audience role', type: 'ref', ref: { collection: 'roles', label: 'name' } },
    { name: 'client_id', label: 'Client', type: 'ref', ref: { collection: 'clients', label: 'legal_name' } },
    { name: 'publish_at', label: 'Publish at', type: 'datetime' }, { name: 'expires_at', label: 'Expires at', type: 'datetime' }],
};

export const ticketsConfig: ResourceConfig = {
  collection: 'support_tickets', title: 'Support tickets', singular: 'Ticket',
  filters: [{ name: 'status', label: 'status', options: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] }],
  columns: [{ key: 'ticket_no', header: 'Ticket' }, { key: 'subject', header: 'Subject' }, { key: 'category', header: 'Category', render: (r) => titleCase(r.category) },
    { key: 'raised_by_name', header: 'Raised by' }, { key: 'priority', header: 'Priority', render: (r) => <StatusBadge value={r.priority} /> }, { key: 'assigned_to_name', header: 'Assigned to' }, status],
  fields: [{ name: 'subject', label: 'Subject', required: true, span: 2 }, { name: 'category', label: 'Category', type: 'select', options: ['BUG', 'ACCESS', 'DATA_CORRECTION', 'PAYROLL', 'OTHER'], required: true },
    { name: 'priority', label: 'Priority', type: 'select', options: ['LOW', 'NORMAL', 'HIGH'], defaultValue: 'NORMAL' },
    { name: 'assigned_to', label: 'Assign to', type: 'ref', ref: { collection: 'users', label: 'full_name' } },
    { name: 'status', label: 'Status', type: 'select', options: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], defaultValue: 'OPEN' },
    { name: 'description', label: 'Description', type: 'textarea', span: 2 }],
  transform: (p, isEdit) => (isEdit ? p : { ...p, raised_by: undefined }),
};

export const usersConfig: ResourceConfig = {
  collection: 'users', title: 'Users', singular: 'User', editRoles: ['MD'], searchPlaceholder: 'Search name or email',
  filters: [{ name: 'status', label: 'status', options: ['ACTIVE', 'LOCKED', 'DISABLED'] }],
  columns: [{ key: 'full_name', header: 'Name' }, { key: 'email', header: 'Email' }, { key: 'mobile', header: 'Mobile' }, { key: 'role_names', header: 'Roles' },
    { key: 'last_login_at', header: 'Last login', render: (r) => formatDateTime(r.last_login_at) }, status],
  fields: [{ name: 'full_name', label: 'Full name', required: true }, { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'mobile', label: 'Mobile', type: 'tel' }, { name: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'LOCKED', 'DISABLED'], defaultValue: 'ACTIVE' },
    { name: 'roles', label: 'Roles', type: 'tags', span: 2, hint: 'MD, OPS_MANAGER, REC_MANAGER, RECRUITER, HR_OPS, ACCOUNTS' },
    { name: 'employee_id', label: 'Linked employee', type: 'ref', ref: { collection: 'employees', label: (r: any) => `${r.full_name} (${r.employee_code})`, params: { category: 'INTERNAL' } } },
    { name: 'branch_id', label: 'Branch', type: 'ref', ref: { collection: 'branches', label: 'name' }, defaultValue: 1 }],
};

export const MASTERS: Record<string, ResourceConfig> = {
  designations: {
    collection: 'designations', title: 'Designations', singular: 'Designation', editRoles: ['MD', 'OPS_MANAGER'],
    columns: [{ key: 'code', header: 'Code' }, { key: 'name', header: 'Designation' }, { key: 'skill_category', header: 'Skill', render: (r) => titleCase(r.skill_category) },
      { key: 'industry_name', header: 'Industry' }, { key: 'is_internal', header: 'Internal', render: (r) => (r.is_internal ? <Badge>Internal</Badge> : '—') }],
    fields: [{ name: 'code', label: 'Code', required: true }, { name: 'name', label: 'Name', required: true },
      { name: 'skill_category', label: 'Skill category', type: 'select', options: ['UNSKILLED', 'SEMI_SKILLED', 'SKILLED', 'HIGHLY_SKILLED'], required: true },
      { name: 'industry_id', label: 'Industry', type: 'ref', ref: { collection: 'industries', label: 'name' } }, { name: 'is_internal', label: 'Internal role', type: 'checkbox' }],
  },
  leave_types: {
    collection: 'leave_types', title: 'Leave types', singular: 'Leave type', editRoles: ['MD', 'OPS_MANAGER'],
    columns: [{ key: 'code', header: 'Code' }, { key: 'name', header: 'Name' }, { key: 'is_paid', header: 'Paid', render: (r) => (r.is_paid ? 'Yes' : 'No') },
      { key: 'accrual_method', header: 'Accrual', render: (r) => titleCase(r.accrual_method) }, { key: 'days_worked_per_leave', header: 'Days worked per leave', align: 'right' }],
    fields: [{ name: 'code', label: 'Code', required: true }, { name: 'name', label: 'Name', required: true }, { name: 'is_paid', label: 'Paid leave', type: 'checkbox', defaultValue: true },
      { name: 'accrual_method', label: 'Accrual method', type: 'select', options: ['UPFRONT', 'MONTHLY', 'PER_DAYS_WORKED', 'NONE'], required: true },
      { name: 'days_worked_per_leave', label: 'Days worked per leave', type: 'number' }, { name: 'is_encashable', label: 'Encashable', type: 'checkbox' }],
  },
  holidays: {
    collection: 'holidays', title: 'Holidays', singular: 'Holiday', editRoles: ['MD', 'OPS_MANAGER'], canDelete: true, defaultSort: 'holiday_date',
    columns: [date('holiday_date', 'Date'), { key: 'name', header: 'Holiday' }, { key: 'calendar_name', header: 'Calendar' }, { key: 'holiday_kind', header: 'Type', render: (r) => titleCase(r.holiday_kind) }],
    fields: [{ name: 'calendar_id', label: 'Calendar', type: 'ref', ref: { collection: 'holiday_calendars', label: 'name' }, required: true },
      { name: 'holiday_date', label: 'Date', type: 'date', required: true }, { name: 'name', label: 'Holiday name', required: true },
      { name: 'holiday_kind', label: 'Type', type: 'select', options: ['NATIONAL', 'FESTIVAL', 'OPTIONAL'], defaultValue: 'FESTIVAL' }],
  },
  salary_components: {
    collection: 'salary_components', title: 'Salary components', singular: 'Component', editRoles: ['MD', 'OPS_MANAGER'],
    columns: [{ key: 'code', header: 'Code' }, { key: 'name', header: 'Component' }, { key: 'component_type', header: 'Type', render: (r) => titleCase(r.component_type) },
      { key: 'is_pf_wage', header: 'PF wage', render: (r) => (r.is_pf_wage ? 'Yes' : '—') }, { key: 'is_esi_wage', header: 'ESI wage', render: (r) => (r.is_esi_wage ? 'Yes' : '—') },
      { key: 'is_statutory', header: 'Statutory', render: (r) => (r.is_statutory ? 'Yes' : '—') }],
    fields: [{ name: 'code', label: 'Code', required: true }, { name: 'name', label: 'Name', required: true },
      { name: 'component_type', label: 'Type', type: 'select', options: ['EARNING', 'DEDUCTION', 'EMPLOYER'], required: true },
      { name: 'is_pf_wage', label: 'Counts as PF wage', type: 'checkbox' }, { name: 'is_esi_wage', label: 'Counts as ESI wage', type: 'checkbox' },
      { name: 'is_statutory', label: 'Statutory (computed)', type: 'checkbox' }, { name: 'is_prorated', label: 'Prorated by paid days', type: 'checkbox', defaultValue: true }],
  },
  statutory_settings: {
    collection: 'statutory_settings', title: 'Statutory settings', singular: 'Setting', editRoles: ['MD', 'OPS_MANAGER'],
    subtitle: 'PF, ESI and other rates used by the payroll engine. Confirm current values with your compliance consultant.',
    columns: [{ key: 'parameter', header: 'Parameter' }, { key: 'value', header: 'Value', align: 'right' }, date('effective_from', 'Effective from'), { key: 'notes', header: 'Notes' }],
    fields: [{ name: 'parameter', label: 'Parameter', required: true }, { name: 'value', label: 'Value', type: 'number', required: true },
      { name: 'effective_from', label: 'Effective from', type: 'date', required: true }, { name: 'notes', label: 'Notes' }],
  },
  professional_tax_slabs: {
    collection: 'professional_tax_slabs', title: 'Professional tax slabs', singular: 'PT slab', editRoles: ['MD', 'OPS_MANAGER'],
    columns: [{ key: 'state_name', header: 'State' }, money('min_gross', 'From'), money('max_gross', 'To'), money('tax_amount', 'PT amount'), date('effective_from', 'Effective from')],
    fields: [{ name: 'state_id', label: 'State', type: 'ref', ref: { collection: 'states', label: 'name' }, required: true },
      { name: 'min_gross', label: 'Gross from', type: 'money', required: true }, { name: 'max_gross', label: 'Gross to', type: 'money' },
      { name: 'tax_amount', label: 'PT amount', type: 'money', required: true }, { name: 'effective_from', label: 'Effective from', type: 'date', required: true }],
  },
  expense_categories: {
    collection: 'expense_categories', title: 'Expense categories', singular: 'Category', editRoles: ['MD', 'OPS_MANAGER'],
    columns: [{ key: 'name', header: 'Category' }], fields: [{ name: 'name', label: 'Category name', required: true }],
  },
  message_templates: {
    collection: 'message_templates', title: 'Message templates', singular: 'Template', editRoles: ['MD', 'OPS_MANAGER'],
    columns: [{ key: 'code', header: 'Code' }, { key: 'channel', header: 'Channel' }, { key: 'subject', header: 'Subject' }, { key: 'body', header: 'Body', render: (r) => <span className="block max-w-md truncate">{r.body}</span> }],
    fields: [{ name: 'code', label: 'Code', required: true }, { name: 'channel', label: 'Channel', type: 'select', options: ['EMAIL', 'SMS', 'WHATSAPP'], required: true },
      { name: 'subject', label: 'Subject' }, { name: 'dlt_template_id', label: 'DLT template id (SMS)' }, { name: 'body', label: 'Body', type: 'textarea', span: 2, required: true }],
  },
  number_series: {
    collection: 'number_series', title: 'Document numbering', singular: 'Series', editRoles: ['MD'],
    columns: [{ key: 'doc_type', header: 'Document' }, { key: 'prefix', header: 'Prefix' }, { key: 'next_number', header: 'Next number', align: 'right' }, { key: 'padding', header: 'Padding', align: 'right' }],
    fields: [{ name: 'doc_type', label: 'Document type', required: true }, { name: 'prefix', label: 'Prefix', required: true },
      { name: 'next_number', label: 'Next number', type: 'number', required: true }, { name: 'padding', label: 'Padding', type: 'number', defaultValue: 4 }],
  },
};
export const employeeAssetsConfig: ResourceConfig = {
  collection: 'employee_assets', title: 'Issued assets', singular: 'Asset', editRoles: ['MD', 'OPS_MANAGER', 'HR_OPS'],
  columns: [{ key: 'asset_type', header: 'Asset', render: (r) => titleCase(r.asset_type) }, { key: 'description', header: 'Details' }, { key: 'quantity', header: 'Qty', align: 'right' },
    date('issued_on', 'Issued'), date('returned_on', 'Returned'), money('recoverable_amount', 'Recoverable'), status],
  fields: [{ name: 'employee_id', label: 'Employee', type: 'ref', ref: { collection: 'employees', label: (r: any) => `${r.full_name} (${r.employee_code})` }, required: true },
    { name: 'asset_type', label: 'Asset type', type: 'select', options: ['UNIFORM', 'ID_CARD', 'SAFETY_SHOES', 'HELMET', 'GLOVES', 'TOOLS', 'OTHER'], required: true },
    { name: 'description', label: 'Description' }, { name: 'quantity', label: 'Quantity', type: 'number', defaultValue: 1 },
    { name: 'issued_on', label: 'Issued on', type: 'date', required: true }, { name: 'returned_on', label: 'Returned on', type: 'date' },
    { name: 'recoverable_amount', label: 'Recoverable amount', type: 'money', defaultValue: 0 },
    { name: 'status', label: 'Status', type: 'select', options: ['ISSUED', 'RETURNED', 'LOST', 'RECOVERED'], defaultValue: 'ISSUED' }],
};
export const documentsConfig: ResourceConfig = {
  collection: 'documents', title: 'Documents', singular: 'Document', editRoles: ['MD', 'OPS_MANAGER', 'HR_OPS'],
  columns: [{ key: 'document_type_name', header: 'Document' }, { key: 'file_name', header: 'File' }, { key: 'verification_status', header: 'Verification', render: (r) => <StatusBadge value={r.verification_status} /> },
    { key: 'document_number', header: 'Number' }, date('expiry_date', 'Expiry')],
  fields: [{ name: 'document_type_id', label: 'Document type', type: 'ref', ref: { collection: 'document_types', label: 'name' }, required: true },
    { name: 'file_name', label: 'File name', required: true, hint: 'Upload wiring: POST the file to object storage, then save the key here' },
    { name: 'file_url', label: 'File key / URL', required: true }, { name: 'document_number', label: 'Document number' },
    { name: 'issue_date', label: 'Issue date', type: 'date' }, { name: 'expiry_date', label: 'Expiry date', type: 'date' },
    { name: 'verification_status', label: 'Verification', type: 'select', options: ['PENDING', 'VERIFIED', 'REJECTED'], defaultValue: 'PENDING' }],
};
export const salaryAssignmentsConfig: ResourceConfig = {
  collection: 'employee_salary_assignments', title: 'Salary history', singular: 'Salary assignment', editRoles: ['MD', 'OPS_MANAGER'],
  columns: [money('gross_monthly', 'Gross / month'), money('ctc_monthly', 'CTC / month'), { key: 'salary_structure_name', header: 'Structure' },
    date('effective_from', 'From'), date('effective_to', 'To'), { key: 'revision_reason', header: 'Reason', render: (r) => titleCase(r.revision_reason ?? '') }],
  fields: [{ name: 'employee_id', label: 'Employee', type: 'ref', ref: { collection: 'employees', label: (r: any) => `${r.full_name} (${r.employee_code})` }, required: true },
    { name: 'salary_structure_id', label: 'Structure', type: 'ref', ref: { collection: 'salary_structures', label: 'name' }, required: true },
    { name: 'gross_monthly', label: 'Gross monthly', type: 'money', required: true }, { name: 'ctc_monthly', label: 'CTC monthly', type: 'money' },
    { name: 'effective_from', label: 'Effective from', type: 'date', required: true },
    { name: 'revision_reason', label: 'Reason', type: 'select', options: ['JOINING', 'INCREMENT', 'MIN_WAGE_REVISION', 'TRANSFER', 'CORRECTION'] }],
};

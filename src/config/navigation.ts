import {
  LayoutDashboard, Building2, ClipboardList, Users, UserSearch, KanbanSquare, CalendarClock, FileSignature, BellRing, Megaphone, Store, UserCheck,
  IdCard, MapPin, CalendarCheck, Clock, CalendarDays, Timer, Wallet, Layers, ShieldCheck, Receipt, FileText, HandCoins, FileMinus, CreditCard,
  LineChart, BarChart3, CheckSquare, LogOut as ExitIcon, Settings, UserCog, Database, LifeBuoy, FileBadge, Landmark, PieChart, Target,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { RoleCode } from '@/lib/types';

export interface NavItem { label: string; path: string; icon: LucideIcon; roles: RoleCode[] }
export interface NavSection { title?: string; items: NavItem[] }

const ALL: RoleCode[] = ['MD', 'OPS_MANAGER', 'REC_MANAGER', 'RECRUITER', 'HR_OPS', 'ACCOUNTS'];
const MGMT: RoleCode[] = ['MD', 'OPS_MANAGER'];

export const ROLE_LABEL: Record<RoleCode, string> = {
  MD: 'Managing Director', OPS_MANAGER: 'Operations Manager', REC_MANAGER: 'Recruitment Manager', RECRUITER: 'HR Recruiter', HR_OPS: 'HR Operations Executive', ACCOUNTS: 'Billing & Accounts Executive',
};

export const NAV: NavSection[] = [
  { items: [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ALL },
    { label: 'Approvals', path: '/approvals', icon: CheckSquare, roles: ['MD', 'OPS_MANAGER', 'REC_MANAGER'] },
  ] },
  { title: 'Clients', items: [
    { label: 'Clients', path: '/clients', icon: Building2, roles: ['MD', 'OPS_MANAGER', 'ACCOUNTS'] },
    { label: 'Contracts', path: '/contracts', icon: FileSignature, roles: ['MD', 'OPS_MANAGER', 'ACCOUNTS'] },
    { label: 'Licences', path: '/licenses', icon: FileBadge, roles: MGMT },
  ] },
  { title: 'Recruitment', items: [
    { label: 'Requisitions', path: '/requisitions', icon: ClipboardList, roles: ['MD', 'OPS_MANAGER', 'REC_MANAGER', 'RECRUITER', 'HR_OPS'] },
    { label: 'Candidates', path: '/candidates', icon: UserSearch, roles: ['MD', 'REC_MANAGER', 'RECRUITER', 'HR_OPS'] },
    { label: 'Pipeline', path: '/pipeline', icon: KanbanSquare, roles: ['MD', 'REC_MANAGER', 'RECRUITER'] },
    { label: 'Interviews', path: '/interviews', icon: CalendarClock, roles: ['REC_MANAGER', 'RECRUITER'] },
    { label: 'Offers', path: '/offers', icon: FileSignature, roles: ['MD', 'REC_MANAGER', 'RECRUITER', 'HR_OPS'] },
    { label: 'Follow-ups', path: '/follow-ups', icon: BellRing, roles: ['REC_MANAGER', 'RECRUITER'] },
    { label: 'Hiring drives', path: '/drives', icon: Megaphone, roles: ['REC_MANAGER'] },
    { label: 'Vendors', path: '/vendors', icon: Store, roles: ['REC_MANAGER'] },
    { label: 'Recruiter targets', path: '/recruiter-targets', icon: Target, roles: ['REC_MANAGER'] },
  ] },
  { title: 'Workforce', items: [
    { label: 'Onboarding', path: '/onboarding', icon: UserCheck, roles: ['MD', 'OPS_MANAGER', 'HR_OPS'] },
    { label: 'Employees', path: '/employees', icon: IdCard, roles: ['MD', 'OPS_MANAGER', 'HR_OPS'] },
    { label: 'Deployments', path: '/deployments', icon: MapPin, roles: ['MD', 'OPS_MANAGER', 'HR_OPS'] },
    { label: 'Attendance', path: '/attendance', icon: CalendarCheck, roles: ['MD', 'OPS_MANAGER', 'HR_OPS'] },
    { label: 'Shifts', path: '/shifts', icon: Clock, roles: ['OPS_MANAGER', 'HR_OPS'] },
    { label: 'Leave', path: '/leave', icon: CalendarDays, roles: ['OPS_MANAGER', 'HR_OPS'] },
    { label: 'Overtime', path: '/overtime', icon: Timer, roles: ['OPS_MANAGER', 'HR_OPS'] },
    { label: 'Exits & F&F', path: '/exits', icon: ExitIcon, roles: ['MD', 'OPS_MANAGER', 'HR_OPS'] },
  ] },
  { title: 'Payroll & compliance', items: [
    { label: 'Payroll runs', path: '/payroll', icon: Wallet, roles: MGMT },
    { label: 'Salary structures', path: '/salary-structures', icon: Layers, roles: MGMT },
    { label: 'Advances', path: '/advances', icon: HandCoins, roles: MGMT },
    { label: 'PF & ESI returns', path: '/compliance/returns', icon: ShieldCheck, roles: MGMT },
    { label: 'Compliance calendar', path: '/compliance', icon: CalendarCheck, roles: ['MD', 'OPS_MANAGER', 'ACCOUNTS'] },
  ] },
  { title: 'Billing & accounts', items: [
    { label: 'Invoices', path: '/invoices', icon: FileText, roles: ['MD', 'OPS_MANAGER', 'ACCOUNTS'] },
    { label: 'Receipts', path: '/receipts', icon: Receipt, roles: ['MD', 'ACCOUNTS'] },
    { label: 'Receivables', path: '/receivables', icon: PieChart, roles: ['MD', 'OPS_MANAGER', 'ACCOUNTS'] },
    { label: 'Credit notes', path: '/credit-notes', icon: FileMinus, roles: ['MD', 'ACCOUNTS'] },
    { label: 'Expenses', path: '/expenses', icon: CreditCard, roles: ['MD', 'ACCOUNTS'] },
    { label: 'TDS & GST', path: '/tax', icon: Landmark, roles: ['MD', 'ACCOUNTS'] },
  ] },
  { title: 'Insights', items: [
    { label: 'Reports & MIS', path: '/reports', icon: BarChart3, roles: ALL },
    { label: 'Announcements', path: '/announcements', icon: Megaphone, roles: MGMT },
  ] },
  { title: 'Administration', items: [
    { label: 'Users & roles', path: '/admin/users', icon: UserCog, roles: ['MD'] },
    { label: 'Master data', path: '/admin/masters', icon: Database, roles: ['MD', 'OPS_MANAGER'] },
    { label: 'Support tickets', path: '/tickets', icon: LifeBuoy, roles: ALL },
    { label: 'Settings', path: '/settings', icon: Settings, roles: ALL },
  ] },
];

export const navFor = (role: RoleCode | null) =>
  NAV.map((s) => ({ ...s, items: s.items.filter((i) => role && i.roles.includes(role)) })).filter((s) => s.items.length);

export const QUICK: Record<RoleCode, { label: string; path: string; icon: LucideIcon }[]> = {
  MD: [{ label: 'Add client', path: '/clients?new=1', icon: Building2 }, { label: 'Add requirement', path: '/requisitions?new=1', icon: ClipboardList }, { label: 'Employees', path: '/employees', icon: Users }, { label: 'Generate invoice', path: '/invoices/new', icon: FileText }],
  OPS_MANAGER: [{ label: 'Mark attendance', path: '/attendance', icon: CalendarCheck }, { label: 'Run payroll', path: '/payroll', icon: Wallet }, { label: 'Approvals', path: '/approvals', icon: CheckSquare }, { label: 'Compliance', path: '/compliance', icon: ShieldCheck }],
  REC_MANAGER: [{ label: 'New requirement', path: '/requisitions?new=1', icon: ClipboardList }, { label: 'Pipeline', path: '/pipeline', icon: KanbanSquare }, { label: 'Interviews', path: '/interviews', icon: CalendarClock }],
  RECRUITER: [{ label: 'Add candidate', path: '/candidates?new=1', icon: UserSearch }, { label: 'Pipeline', path: '/pipeline', icon: KanbanSquare }, { label: 'Follow-ups', path: '/follow-ups', icon: BellRing }],
  HR_OPS: [{ label: 'Onboarding', path: '/onboarding', icon: UserCheck }, { label: 'Deployment entry', path: '/deployments?new=1', icon: MapPin }, { label: 'Attendance review', path: '/attendance', icon: CalendarCheck }],
  ACCOUNTS: [{ label: 'Create invoice', path: '/invoices/new', icon: FileText }, { label: 'Record receipt', path: '/receipts?new=1', icon: Receipt }, { label: 'Receivables', path: '/receivables', icon: LineChart }],
};

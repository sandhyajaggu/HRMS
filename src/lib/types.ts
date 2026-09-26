// Types mirror the PostgreSQL schema (snake_case, as FastAPI returns them).
// List endpoints add *_name convenience fields for display (e.g. client_name).

export type ID = number;
export type RoleCode = 'MD' | 'OPS_MANAGER' | 'REC_MANAGER' | 'RECRUITER' | 'HR_OPS' | 'ACCOUNTS';

export interface Paginated<T> { items: T[]; total: number; page: number; page_size: number }
export type Row = Record<string, any> & { id: ID };

export interface User {
  id: ID; full_name: string; email: string; mobile?: string; status: string;
  roles: RoleCode[]; branch_id?: ID; employee_id?: ID; client_ids?: ID[];
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'WEEKLY_OFF' | 'HOLIDAY' | 'LEAVE' | 'ON_DUTY' | 'COMP_OFF';

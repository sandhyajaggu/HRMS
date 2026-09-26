# YSK Infotech HRMS — Frontend

React + TypeScript + Vite + Tailwind front end for the multi-client staffing HRMS: client requirement → recruitment →
onboarding → deployment → attendance → payroll (PF/ESI) → GST billing → collections → exit.

It ships with a **built-in mock backend**, so the whole application runs and can be demonstrated without any server.
Switch one environment variable to point it at the FastAPI backend instead.

---

## Quick start

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5173
```

**Demo logins** (password `demo123` for all):

| Portal | Email |
|---|---|
| Managing Director | md@ysk.in |
| Operations Manager | ops@ysk.in |
| Recruitment Manager | recmgr@ysk.in |
| HR Recruiter | recruiter@ysk.in |
| HR Operations Executive | hrops@ysk.in |
| Billing & Accounts Executive | accounts@ysk.in |

Other commands:

```bash
npm run build        # typecheck + production build  -> dist/
npm run build:demo   # ONE self-contained index.html -> dist-demo/ (mock data, hash routing)
npm run preview      # preview the production build
```

`dist-demo/index.html` can be emailed, opened from a pen drive or dropped on any static host: no server, no build step.

---

## Demo data

The mock backend seeds a realistic staffing operation and keeps it in `localStorage`:

- 5 clients (ABC Foods, XYZ Electronics, Fresh Bites Foods, Prime Manufacturing, Urban Tastes) with sites, contacts,
  contracts (cost-plus, fixed per head, per day), rate cards and CLRA licences
- ~85 employees with deployments, salary assignments, shifts, bank accounts and assets
- Two months of daily attendance, last month locked per client
- Computed payroll runs with payslips, PF/ESI returns and a compliance calendar
- Eight months of invoices, receipts with TDS, a credit note and receivables aging
- 90 candidates across requisitions with interviews, offers, follow-ups and pending approvals

Everything you change stays in your browser. **Settings → Reset demo data** restores the seed.

---

## Project structure

```
src/
├── api/
│   ├── http.ts            axios instance, JWT access/refresh, error normalisation
│   ├── resources.ts       generic REST client (/{collection}, /{collection}/{id})
│   ├── hooks.ts           React Query hooks: useList/useOne/useAll/useSave/useAction
│   └── mock/              the bundled demo backend
│       ├── db.ts          seed data + localStorage persistence
│       ├── engine.ts      payroll, invoicing, approvals, dashboards, reports
│       └── adapter.ts     axios adapter: routes every endpoint to the engine
├── auth/                  AuthContext (login, portal switching), route guards
├── components/            ui.tsx, DataTable, charts, KpiCard, form.tsx, ResourcePage
├── config/navigation.ts   menu + quick actions per role
├── layouts/AppLayout.tsx  sidebar, global search, notifications, profile menu
├── features/
│   ├── auth/              login
│   ├── dashboards/        the six role dashboards
│   ├── configs.tsx        column + field definitions for every CRUD screen
│   └── pages/             detail and workflow screens
└── App.tsx                routes with role guards
```

**Config-driven screens.** Most list screens are a `ResourceConfig` (columns, form fields, filters) rendered by
`ResourcePage`, which handles search, filters, pagination, CSV export and the create/edit drawer. Adding a new master
screen is ~20 lines in `features/configs.tsx`.

**Workflow screens** are written by hand: pipeline kanban, attendance grid with CSV import and month locking, payroll
run and payslip, invoice generation and the GST invoice, receipts with allocation, onboarding checklist, exit and F&F,
approvals inbox, reports hub, role-permission matrix.

---

## Connecting the FastAPI backend

```bash
# .env
VITE_USE_MOCK=false
VITE_API_BASE_URL=/api/v1     # dev server proxies /api to http://localhost:8000
```

The mock adapter is then bypassed and every call goes to your API. Implement these endpoints (the mock is the contract —
read `src/api/mock/adapter.ts`):

### Auth
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | `{email, password}` → `{access_token, refresh_token}` |
| POST | `/auth/refresh` | `{refresh_token}` → new tokens |
| GET | `/auth/me` | current user with `roles: []` |
| POST | `/auth/change-password` | |

### Generic CRUD (one router per table)
| Method | Path | Notes |
|---|---|---|
| GET | `/{collection}` | `?page&page_size&search&sort&<field>=value`, also `field__in`, `field__gte`, `field__lte` → `{items,total,page,page_size}` |
| GET | `/{collection}/{id}` | |
| POST | `/{collection}` | |
| PATCH | `/{collection}/{id}` | |
| DELETE | `/{collection}/{id}` | |

List responses should include display names alongside foreign keys (`client_name`, `employee_name`, `designation_name`…)
so the tables don't need extra round trips.

### Workflow endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/dashboard/{role}` | all widgets for one dashboard |
| GET | `/reports/{code}` | `{columns, rows}` for the reports hub |
| GET | `/attendance/grid` | `?client_id&site_id&month` → month grid + period status |
| POST | `/attendance/bulk` | upsert rows, returns `{success, errors[]}` |
| POST | `/attendance_periods/{id}/{submit\|approve\|lock\|reopen}` | month lock flow |
| POST | `/applications/{id}/move` | pipeline stage change |
| POST | `/offers/{id}/convert` | accepted offer → employee + onboarding + planned deployment |
| POST | `/employee_onboardings/{id}/complete` | activate employee, deployment goes ACTIVE |
| POST | `/payroll_runs/{id}/compute\|submit\|mark-paid` | payroll lifecycle |
| GET | `/payslips/{id}/detail` | payslip with component lines |
| POST | `/invoices/preview` \| `/invoices/generate` | build invoice from attendance + rate cards |
| POST | `/invoices/{id}/submit\|send\|cancel` | invoice lifecycle |
| GET | `/invoices/{id}/detail` | invoice with lines and receipts |
| POST | `/receipts` | receipt + allocations to invoices |
| POST | `/approval_requests/{id}/decide` | `{action, comments}` |
| GET | `/employee_exits/{id}/fnf-draft`, POST `/employee_exits/{id}/complete` | exit flow |
| GET | `/roles/matrix`, POST `/roles/{id}/permissions` | permission matrix |
| GET | `/search?q=` | global search |

---

## Business rules implemented in the mock (mirror these in the backend)

- **Payroll**: paid days = present + weekly offs + holidays + paid leave (half day = 0.5). Earnings are prorated by
  paid days / month days. Basic 50%, HRA 20%, conveyance capped, special allowance balancing. PF on
  `min(basic, PF_WAGE_CEILING)`; ESI only when gross ≤ `ESI_WAGE_LIMIT`; PT from the state slab; advances recovered by
  instalment. **All rates come from the `statutory_settings` and `professional_tax_slabs` tables, not from code** —
  confirm the current values with your compliance consultant before go-live.
- **Attendance lock**: payroll and invoicing refuse to run until the client's month is `LOCKED`.
- **Billing**: cost-plus = payroll cost + employer PF/ESI at actuals + service charge %. Fixed-per-head and per-day bill
  from man-days × rate card, plus overtime at the OT rate. GST is CGST+SGST when the client's state matches the branch,
  otherwise IGST. Invoice numbers come from `number_series` per financial year.
- **Receipts**: TDS deducted by the client is recorded separately so invoices close to zero balance.
- **Deployments**: a new deployment is rejected if it overlaps an existing one for the same employee (the database has
  the same rule as an exclusion constraint).

---

## Access control

`config/navigation.ts` defines the menu per role and `App.tsx` guards each route. A user with more than one role can
switch portals from the profile menu. Server-side permission checks are still required — the UI only hides what a role
should not use.

## Notes for production

- Replace the demo file inputs with real uploads (S3 pre-signed URLs); `documents` stores only the key.
- Sensitive identifiers (Aadhaar, PAN, bank account) are shown masked; the API should return only last-4 unless the
  caller has `employee.view_sensitive`.
- Add an employee self-service portal (payslips, leave, documents) as a later phase — the roles and API already allow it.

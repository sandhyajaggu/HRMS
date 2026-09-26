/** Thin wrappers so the router stays readable: each is a ResourcePage with its config. */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ResourcePage, ResourceForm, type ResourceConfig } from '@/components/ResourcePage';
import * as C from '../configs';

function Page({ config }: { config: ResourceConfig }) {
  // supports the ?new=1 deep link used by dashboard quick actions
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  useEffect(() => { if (params.get('new')) { setCreating(true); params.delete('new'); setParams(params, { replace: true }); } }, [params, setParams]);
  return (
    <>
      <ResourcePage config={config} />
      {creating && config.fields && <ResourceForm config={config} record={null} onClose={() => setCreating(false)} />}
    </>
  );
}

export const Clients = () => <Page config={C.clientsConfig} />;
export const Contracts = () => <Page config={C.contractsConfig} />;
export const Licenses = () => <Page config={C.licensesConfig} />;
export const Requisitions = () => <Page config={C.requisitionsConfig} />;
export const Candidates = () => <Page config={C.candidatesConfig} />;
export const Interviews = () => <Page config={C.interviewsConfig} />;
export const Offers = () => <Page config={C.offersConfig} />;
export const FollowUps = () => <Page config={C.followUpsConfig} />;
export const Drives = () => <Page config={C.drivesConfig} />;
export const Vendors = () => <Page config={C.vendorsConfig} />;
export const RecruiterTargets = () => <Page config={C.targetsConfig} />;
export const Employees = () => <Page config={C.employeesConfig} />;
export const Deployments = () => <Page config={C.deploymentsConfig} />;
export const Shifts = () => <Page config={C.shiftsConfig} />;
export const Leave = () => <Page config={C.leaveConfig} />;
export const Overtime = () => <Page config={C.overtimeConfig} />;
export const Advances = () => <Page config={C.advancesConfig} />;
export const Exits = () => <Page config={C.exitsConfig} />;
export const SalaryStructures = () => <Page config={C.salaryStructuresConfig} />;
export const Compliance = () => <Page config={C.complianceConfig} />;
export const Invoices = () => <Page config={C.invoicesConfig} />;
export const CreditNotes = () => <Page config={C.creditNotesConfig} />;
export const Expenses = () => <Page config={C.expensesConfig} />;
export const Announcements = () => <Page config={C.announcementsConfig} />;
export const Tickets = () => <Page config={C.ticketsConfig} />;

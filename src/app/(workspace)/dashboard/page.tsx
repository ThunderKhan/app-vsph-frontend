import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DashboardSummary } from '@/features/workspace/DashboardSummary';
import { loadAuthorizedApps, loadProductAccess, loadWorkspaceCount } from '@/features/workspace/server-data';
import {portalApi} from '@/features/workspace/server-api';
import {portalIdentity} from '@/features/workspace/contracts';
import {parseOwnerOperations} from '@/features/workspace/OwnerOperationsContract';
import {parseFinanceOverview} from '@/features/operations/FinanceOverviewContract';
import {LiveOwnerOverview} from '@/features/workspace/LiveOwnerOverview';
import '../owner-overview-live.css';

export const metadata: Metadata = {
  title: 'Overview | VSPH Control Center',
};

async function DashboardData() {
  const identity = await portalApi('/api/auth/me');
  const current = identity.kind==='ok'?portalIdentity(identity.value):null;
  if(current?.platformRole === 'super_admin'){
    const [operations,finance] = await Promise.all([
      portalApi('/api/admin-management/dashboard'),portalApi('/api/finance/overview')
    ]);
    return <LiveOwnerOverview operations={operations.kind==='ok'?parseOwnerOperations(operations.value):null}
      finance={finance.kind==='ok'?parseFinanceOverview(finance.value):null}/>;
  }
  const apps = await loadAuthorizedApps();
  if (!apps) {
    return <p id="errorMessage" className="feedback-state error-state" role="alert">
      The workspace could not be loaded. Please refresh and try again.
    </p>;
  }
  const [workspaces, access] = await Promise.all([
    loadWorkspaceCount(),
    loadProductAccess(apps),
  ]);

  return <DashboardSummary appCount={apps.length} workspaces={workspaces} access={access} />;
}

export default function DashboardPage() {
  return (
    <main className="workspace-content" id="mainContent" tabIndex={-1}>
      <section className="page-intro" id="overview" aria-labelledby="pageTitle">
        <h1 id="pageTitle">Your workspace<span className="title-period">.</span></h1>
        <p className="page-lead">Applications and access, all in one place.</p>
      </section>
      <Suspense fallback={<p className="loading-state" role="status">
        Checking your access…
      </p>}>
        <DashboardData />
      </Suspense>
    </main>
  );
}

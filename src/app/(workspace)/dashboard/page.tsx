import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DashboardSummary } from '@/features/workspace/DashboardSummary';
import { loadAuthorizedApps, loadProductAccess, loadWorkspaceCount } from '@/features/workspace/server-data';

export const metadata: Metadata = {
  title: 'Overview | VSPH Control Center',
};

async function DashboardData() {
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

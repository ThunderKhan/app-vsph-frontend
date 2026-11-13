import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AccessOverview } from '@/features/workspace/ApplicationsLibrary';
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

  return (
    <>
      <section className="bento-grid" aria-label="Workspace summary">
        <article className="feature-panel" id="spotlightPanel">
          <div className="feature-content">
            <p className="feature-kicker">YOUR ACCESS</p>
            <h2>Your tools, organized.</h2>
            <p>Open the products assigned to your account. Every application has its own
              secure sign-in and permissions.</p>
            <Link className="feature-link" href="/applications">View applications</Link>
          </div>
          <div className="feature-summary" aria-label="Products available to you">
            <span id="featureAppCount">{apps.length}</span>
            <small>available applications</small>
          </div>
        </article>
        <div className="summary-panels">
          <article className="metric-panel" aria-labelledby="appMetricTitle">
            <span className="metric-caption" id="appMetricTitle">Applications</span>
            <strong id="appCount" className="metric-value">{apps.length}</strong>
            <span className="metric-detail">Products available to you</span>
          </article>
          <article className="metric-panel" aria-labelledby="workspaceMetricTitle">
            <span className="metric-caption" id="workspaceMetricTitle">Organizations</span>
            <strong id="workspaceCount" className="metric-value">{workspaces ?? '—'}</strong>
            <span className="metric-detail">Your accessible workspaces</span>
          </article>
        </div>
      </section>
      <AccessOverview entries={access} />
    </>
  );
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

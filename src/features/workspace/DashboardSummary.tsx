'use client';

import Link from 'next/link';
import { AccessOverview } from './ApplicationsLibrary';
import type { ProductAccess } from './contracts';

/** The same read-only dashboard presentation in real workspace and local preview. */
export function DashboardSummary({ appCount, workspaces, access, previewMode = false }: {
  appCount: number;
  workspaces: number | null;
  access: ProductAccess[];
  previewMode?: boolean;
}) {
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
            <span id="featureAppCount">{appCount}</span>
            <small>available applications</small>
          </div>
        </article>
        <div className="summary-panels">
          <article className="metric-panel" aria-labelledby="appMetricTitle">
            <span className="metric-caption" id="appMetricTitle">Applications</span>
            <strong id="appCount" className="metric-value">{appCount}</strong>
            <span className="metric-detail">Products available to you</span>
          </article>
          <article className="metric-panel" aria-labelledby="workspaceMetricTitle">
            <span className="metric-caption" id="workspaceMetricTitle">Organizations</span>
            <strong id="workspaceCount" className="metric-value">{workspaces ?? '—'}</strong>
            <span className="metric-detail">Your accessible workspaces</span>
          </article>
        </div>
      </section>
      <AccessOverview entries={access} previewMode={previewMode} />
    </>
  );
}

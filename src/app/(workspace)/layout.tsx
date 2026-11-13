/* eslint-disable @next/next/no-css-tags -- the original Inter stylesheet is a reviewed public asset. */
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { portalApi } from '@/features/workspace/server-api';
import { portalIdentity, hrPermissions } from '@/features/workspace/contracts';
import { WorkspaceHeader } from '@/features/workspace/WorkspaceHeader';
import './dashboard.css';
import './portal-navigation.css';
import './crm-workspace.css';

export const metadata: Metadata = {
  title: 'Workspace | VSPH Control Center',
  robots: { index: false, follow: false },
};

async function AuthorizedWorkspace({ children }: Readonly<{ children: ReactNode }>) {
  const session = await portalApi('/api/auth/me');
  if (session.kind === 'unauthorized') redirect('/login');
  const user = session.kind === 'ok' ? portalIdentity(session.value) : null;
  if (!user) {
    return (
      <main className="workspace-content" id="mainContent">
        <h1>Workspace unavailable</h1>
        <p role="alert">Your account session could not be verified. Contact the administrator
          if the application backend has not been connected.</p>
      </main>
    );
  }
  const permissions = await portalApi('/api/hrms/access');
  if (permissions.kind === 'unauthorized') redirect('/login');
  const flags = permissions.kind === 'ok' ? hrPermissions(permissions.value) : null;
  return (
    <div className="workspace-shell">
      <div className="workspace-main">
        <a className="skip-link" href="#mainContent">Skip to content</a>
        <WorkspaceHeader user={user} flags={flags} accessFailed={!flags}/>
        {children}
      </div>
    </div>
  );
}

export default function WorkspaceLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head><link rel="stylesheet" href="/fonts.css" /></head>
      <body className="workspace-body" data-portal-shell="true">
        <Suspense fallback={
          <main className="workspace-content" id="mainContent">
            <p role="status">Checking your session…</p>
          </main>
        }>
          <AuthorizedWorkspace>{children}</AuthorizedWorkspace>
        </Suspense>
      </body>
    </html>
  );
}

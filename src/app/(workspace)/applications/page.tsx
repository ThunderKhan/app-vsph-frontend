import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ApplicationsLibrary } from '@/features/workspace/ApplicationsLibrary';
import { loadAuthorizedApps } from '@/features/workspace/server-data';

export const metadata: Metadata = {
  title: 'Applications | VSPH Control Center',
};

async function ApplicationsData() {
  const apps = await loadAuthorizedApps();
  if (!apps) return <main className="workspace-content" id="mainContent">
    <p className="feedback-state error-state" role="alert">
      The application library could not be loaded. Please refresh and try again.
    </p>
  </main>;
  return <ApplicationsLibrary apps={apps}/>;
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<main className="workspace-content" id="mainContent">
      <p className="loading-state" role="status">Checking your applications…</p>
    </main>}>
      <ApplicationsData />
    </Suspense>
  );
}

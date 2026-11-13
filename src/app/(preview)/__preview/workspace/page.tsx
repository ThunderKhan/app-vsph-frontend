import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { WorkspacePreview } from '@/features/workspace/WorkspacePreview';

export const metadata: Metadata = {
  title: 'LOCAL PREVIEW ONLY | VSPH Control Center',
  robots: { index: false, follow: false },
};

export default function PreviewWorkspacePage() {
  // The preview is NOT part of portal auth and must never be served from
  // staging or production. Only synthetic UI is rendered in Next dev mode.
  if (process.env.NODE_ENV !== 'development') notFound();
  return <WorkspacePreview />;
}

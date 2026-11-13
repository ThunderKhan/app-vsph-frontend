/* eslint-disable @next/next/no-css-tags -- loads the unchanged original Inter public asset. */
import type { ReactNode } from 'react';
import '../(workspace)/dashboard.css';
import '../(workspace)/portal-navigation.css';
import '../(workspace)/crm-workspace.css';
import '../(workspace)/workspace-overrides.css';
import './preview.css';

export default function PreviewRootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head><link rel="stylesheet" href="/fonts.css" /></head>
      <body className="workspace-body" data-portal-shell="true">{children}</body>
    </html>
  );
}

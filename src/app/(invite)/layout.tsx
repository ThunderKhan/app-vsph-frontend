/* eslint-disable @next/next/no-css-tags -- original Inter public stylesheet is served verbatim by the VSPH portal. */
import type { ReactNode } from 'react';
import './invite.css';

/**
 * Standalone root: the original invitation CSS targets header, body,
 * labels and buttons globally. It must not leak into (auth)/(site).
 */
export default function InvitationLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head><link rel="stylesheet" href="/fonts.css" /></head>
      <body>{children}</body>
    </html>
  );
}

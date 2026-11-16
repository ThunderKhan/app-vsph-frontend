import type { Metadata } from 'next';
import { AcceptInvitePage } from '@/features/invitations/AcceptInvitePage';

export const metadata: Metadata = {
  title: 'Accept invitation | VSPH Control Center',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

export default function CustomerInvitationPage() {
  return <AcceptInvitePage />;
}

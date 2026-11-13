'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';

type Stage = 'checking' | 'instructions' | 'new-account' | 'existing-account' | 'unavailable' | 'accepted';
type Proof = { invitationId: string; token: string };
type InvitationResponse = { message?: unknown; newIdentity?: unknown };

async function invitationRequest(
  action: 'inspect' | 'accept',
  proof: Proof,
  extra: { password?: string } = {},
): Promise<InvitationResponse> {
  const response = await fetch('/api/invitations/' + action, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...proof, ...extra }),
  });
  const data = (await response.json().catch(() => ({}))) as InvitationResponse;
  if (!response.ok) {
    throw new Error(
      typeof data.message === 'string' ? data.message : 'Invitation unavailable.',
    );
  }
  return data;
}

/**
 * Port of frozen views/accept-invite.html and public/invite.js.
 * A capability is accepted ONLY through a URL fragment, immediately
 * stripped from the address bar. No localStorage, query parameters,
 * mock activation, or client-side privilege change is permitted.
 */
export function AcceptInvitePage() {
  const proofRef = useRef<Proof | null>(null);
  const [stage, setStage] = useState<Stage>('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const fields = new URLSearchParams(window.location.hash.slice(1));
    const invitationId = fields.get('invitation_id');
    const token = fields.get('invitation_token');

    // Remove sensitive URL fragments before any network request. A token
    // MUST NOT enter page request paths, referrers, history or analytics.
    window.history.replaceState(null, '', window.location.pathname);
    const proof: Proof | null = invitationId && token
      ? { invitationId, token } : null;
    proofRef.current = proof;

    const inspect = async () => {
      // Wait for hydration; do not synchronously set React state in effects.
      await Promise.resolve();
      if (!active) return;
      if (!proof) {
        setStage('instructions');
        return;
      }
      try {
        const info = await invitationRequest('inspect', proof);
        if (!active) return;
        if (typeof info.newIdentity !== 'boolean') {
          throw new Error('Invitation unavailable.');
        }
        setStage(info.newIdentity ? 'new-account' : 'existing-account');
      } catch (error) {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : 'Invitation unavailable.');
        setStage('unavailable');
      }
    };
    void inspect();
    return () => { active = false; proofRef.current = null; };
  }, []);

  const canSubmit = stage === 'new-account' || stage === 'existing-account';

  async function accept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const proof = proofRef.current;
    if (!proof || !canSubmit || busy) return;

    const needsPassword = stage === 'new-account';
    if (needsPassword && (password.length < 12 || password.length > 128 || password !== confirmation)) {
      setErrorMessage('Use matching passwords of at least 12 characters.');
      return;
    }

    setErrorMessage('');
    setBusy(true);
    try {
      const result = await invitationRequest('accept', proof, needsPassword ? { password } : {});
      // Never show success from a local check or merely an HTTP 200
      // lacking the actual provisioning success response.
      if (typeof result.message !== 'string' ||
          result.message !== 'Invitation accepted for this customer workspace. Sign in to continue.') {
        throw new Error('Invitation acceptance could not be verified.');
      }
      proofRef.current = null;
      setPassword('');
      setConfirmation('');
      setStage('accepted');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Invitation unavailable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header>
        <Link className="brand" href="/login">VSPH<span>.</span></Link>
        <span>CONTROL CENTER</span>
      </header>
      <main className="invite-layout">
        <section className="invite-card">
          <p className="kicker">YOUR VSPH WORKSPACE</p>
          <h1>Accept your invitation<span>.</span></h1>
          <p className="lead">
            Create a password to activate your customer administrator account and access the
            products assigned to your organization.
          </p>

          <section id="inviteInstructions" className="invite-instructions"
            hidden={stage !== 'instructions'} aria-labelledby="inviteInstructionsTitle">
            <h2 id="inviteInstructionsTitle">Check your invitation email</h2>
            <p id="inviteInstructionsText">
              Request a current invitation from your administrator. Legacy account-wide invitation
              links are not accepted.
            </p>
            <p>The link contains a private, time-limited activation token. Opening this page
              directly cannot activate your account.</p>
            <Link href="/login" className="invite-return">Back to sign in</Link>
          </section>

          {stage === 'checking' && <p role="status">Checking your private invitation…</p>}
          <form id="inviteForm" hidden={!canSubmit} onSubmit={(event) => void accept(event)}>
            {stage === 'existing-account' && (
              <>
                <a href="/login" target="_blank" rel="noopener noreferrer">
                  Sign in to your existing account
                </a>
                <p role="status">
                  Existing account: sign into the portal in another tab, then accept here.
                  Your password will not be changed.
                </p>
              </>
            )}
            <div hidden={stage !== 'new-account'}>
              <label htmlFor="password">New password</label>
              <input id="password" type="password" autoComplete="new-password"
                required={stage === 'new-account'} minLength={12} maxLength={128}
                placeholder="At least 12 characters" value={password}
                onChange={(e) => setPassword(e.target.value)} />
              <label htmlFor="confirmPassword">Confirm password</label>
              <input id="confirmPassword" type="password" autoComplete="new-password"
                required={stage === 'new-account'} minLength={12} maxLength={128}
                placeholder="Repeat your password" value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)} />
            </div>
            <button id="acceptButton" type="submit" disabled={!canSubmit || busy}>
              Activate my account
            </button>
          </form>

          <p id="inviteError" className="error" role="alert" hidden={!errorMessage}>
            {errorMessage}
          </p>
          <div id="inviteSuccess" hidden={stage !== 'accepted'} className="success">
            <strong>Account activated.</strong>
            <p>Your invitation has been accepted. You can now sign in to VSPH Control Center
              using your email and new password.</p>
            <Link href="/login">Go to sign in</Link>
          </div>
          <p className="footer-note">
            If this link has expired, contact your VSPH administrator to request a new invitation.
            Do not forward invitation links to others.
          </p>
        </section>
      </main>
    </>
  );
}

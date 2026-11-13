# Customer invitation landing — staged frontend port

Based on frozen original `ThunderKhan/vsph-control-center` commit
`3b3a1535873aa0517aea41da32a407f3d9680547`.

Frontend route: `/accept-invite`, implemented in the fork branch
`migration/invitation-entry` (based on `migration/control-center-login`).
This is a **stacked branch**: merge the sign-in PR first before targeting
the invitation PR against the organization's `main`.

## Original contract
- Customer invitation URL uses only its **fragment**:
  `/accept-invite#invitation_id=<id>&invitation_token=<token>`.
- Client immediately removes the fragment and never puts it into query
  strings, referrers, browser storage, logs or route paths.
- No fragment means instructions, not a form accepting an arbitrary password.
- `POST /api/invitations/inspect` validates the link before activation.
- New identity: 12–128-character password and matching confirmation.
- Existing identity: no password replacement; user signs in in another tab,
  then accepts via the existing portal session.
- `POST /api/invitations/accept` must succeed on the **real backend** before
  the UI says the account was activated.
- The original form, copy, brand layout, CSS and Inter public font are retained.
  Frozen CSS/HTML are under `docs/reference/accept-invite/`; only the original
  `@import url('/fonts.css')` is omitted from active CSS because of Turbopack,
  with the unchanged static stylesheet linked from the invite root layout.

## Deployment blockers
There is **no connected invitation backend** in the organization frontend.
A request to `/api/invitations/inspect` will fail in a frontend-only dev
environment and must never appear to activate an account. The original
Express implementation uses `provisioning_command`, authorization checks
for existing identities, expiry/nonce enforcement, state reservation and
administrative password changes for genuinely new identities.

Before production: implement/reuse reviewed routes under same-origin
`/api/invitations/*` with rate limiting, exact Origin enforcement, no token
logging, SQL reservation/replay checks, owner/tenant boundary and a real
Supabase Auth Admin integration. Do not use a mock API or return a success
response merely to satisfy an E2E test.

## Check locally
```powershell
git pull --ff-only
npm run check
npm run dev
```
Open `http://localhost:3000/accept-invite` for missing-link instructions.
The link will not activate an account until the backend has been deployed.
Customer invitation and employee enrollment are distinct flows.
`/employee-enrollment` and `/employee-password` remain to be ported.

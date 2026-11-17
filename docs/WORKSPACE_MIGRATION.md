# Workspace shell and applications — phase 2 frontend migration

Source: frozen VSPH Control Center commit
`3b3a1535873aa0517aea41da32a407f3d9680547`.

Branch `migration/workspace-shell-applications` is based on the verified
`migration/control-center-login` branch. This is deliberately **independent**
of the customer invitation and employee password branches, which have
separate review sequences.

## Migrated
- `/dashboard`: general access overview. Authorized application count,
  organization count and product context rows are requested from the
  original API contracts. No fabricated KPI values.
- `/applications`: authorized product list, original category copy,
  client-side search and validated same-origin app launch destinations.
- Original CRM-style horizontal top navigation with native disclosures,
  an account menu and mobile menu. The supported links are Overview and
  Applications. Links to as-yet-unported modules are noninteractive,
  preventing broken links from being mistaken for completed features.
- Frozen original dashboard HTML and script, top navigation, icon sprite,
  and three CSS sources, SHA-verified. The compiled CSS removes only
  `@import url('/fonts.css');`, since Next/Turbopack cannot resolve that
  root-absolute import. The unchanged static Inter file is loaded from
  the new workspace root layout.
- Original `/api/auth/me`, `/api/hrms/access`, `/api/apps`,
  `/api/workspaces` and `/api/apps/:code/contexts` read contracts.

## Critical auth boundary

The original Express server enforced `portalSession` before serving
`/dashboard` or `/applications`. The new Next root layout therefore
reads the incoming **httpOnly** `vsph.portal.sid` cookie server-side
and verifies it against an explicit, operator-approved internal API origin.
It will not serve the authenticated workspace shell without an active,
validated `/api/auth/me` response.

No internal origin is configured by default. The application fails closed:
without an authenticated session it redirects to `/login`; when backend
session verification is unavailable it displays an unavailable message
with **no navigation or private data**.

`VSPH_INTERNAL_API_ORIGIN` must be a bare absolute origin,
such as `http://127.0.0.1:3001` for an isolated local backend or a
reviewed HTTPS internal target. It is **server-only**, not
`NEXT_PUBLIC_*`. The implementation rejects arbitrary paths,
untrusted Host-based targets, and remote HTTP. It forwards only the
original portal session cookie for read-only GET requests, with
`cache: 'no-store'` and no automatic redirects. Merely setting this
variable does **not** constitute backend deployment or session review.

Employee/HR navigation is populated only from the existing server
`/api/hrms/access` flags, and owner-only labels require the verified
session's `platformRole === 'super_admin'`. A failed HR permission
lookup hides restricted entries and shows a message.

### Not yet implemented

- **Owner dashboard:** real finance, projects and workforce owner snapshot
  RPCs; no mock executive data is used here.
- **Employee dashboard:** task, attendance, leave, activity heatmap and
  calendar modules must be migrated with their backend gates.
- Full project, HRMS, customer, notifications, search, people, admin and
  profile pages are not available in this PR. Pending menu entries are
  intentionally disabled.
- A same-origin **browser-facing** reverse proxy for `/api/auth/logout`
  and `/apps/:code/launch` must be reviewed and connected; these
  actions cannot be considered functional yet.
- CSRF/Origin policy, RLS, cross-tenant authorization, MFA and employee
  account validation require end-to-end staging acceptance.
- Automated browser visual parity and live login tests are not complete.

## Verification commands

Stop a running Next dev instance before building:

```powershell
git fetch origin
git switch --track origin/migration/workspace-shell-applications
npm run check
npm run dev
```

With **no backend**, visiting `/dashboard` redirects to `/login`
and must not render private data; this is intentional. To inspect
the live workspace, connect an *authorized local/staging backend only*
and verify a real session, HTTP cookie, proxy routing and permissions.
Never mock authentication into a production route.

The root login `/` and `/login` remain unchanged. No existing
org deployment, DNS, Supabase database or original source was modified.

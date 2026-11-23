# Frontend acceptance checkpoint — 23 November 2026

**Repository:** `ThunderKhan/app-vsph-frontend`  
**Implementation branch:** `migration/remaining-frontend-parity`  
**Frozen legacy reference:** `ThunderKhan/vsph-control-center@3b3a1535873aa0517aea41da32a407f3d9680547`  
**Prerequisite organization PR:** https://github.com/vsph-global/app-vsph-frontend/pull/11

## In scope

This checkpoint concerns only Next.js UI, frontend route handlers, client forms, navigation, source compatibility, and tests against an isolated backend. It does **not** migrate Express to Fastify/Prisma, make Supabase changes, install a GitHub App, activate Music/Outreach providers, or deploy a server.

## Completed source and isolated checks

| Frontend surface | Implemented review / acceptance evidence | Evidence limitation |
| --- | --- | --- |
| Workspace routes and navigation | All 40 private workspace page routes enumerated in anonymous production redirect verification; navigation highlights nested project, customer, employee and finance paths without globally selecting /admin | Live role grants and browser navigation still require staging |
| Skip navigation and focus | Every JSX main element in the 40 workspace page sources has `id="mainContent"` and `tabIndex={-1}`; source test covers page branches and delegated app/search components | Source/DOM focus semantics are not a complete WCAG audit |
| Visual/mobile preview | Chromium synthetic-role preview across 320px, 390px, 768px and 1440px with horizontal overflow checks; public entry pages also checked at 320px | No frozen screenshot images are committed; real legacy-vs-target pixel comparison is **not** certified |
| Portal and product login | Fixed, credential-scoped Next backend proxy; password/MFA error states; challenge invalidated whenever email, password or tenant changes; factor change clears TOTP; six-digit submit guard | Mocked identity and browser challenge tests are not a real Supabase MFA session |
| Customer invitation | Fragment-only, memory-held proof; server-only inspection/acceptance; exactly confirmed activation; accessible success announcement | No live one-use invitation or email-delivery run |
| Employee enrollment / first sign-in | Backend-confirmed invitation/status/accept and first-password replacement; validation and Chromium entry-state/first-password browser tests | Real temporary credential and provider expiry must be staged |
| Owner / HR / employee / customer | SSR role matrix checks privileged navigation and denial of archived employee/finance data to ineligible users | Isolated Express-shaped backend fixture, not live role membership |
| Cross-tenant organization | Forged customer-organization deep link is reauthorized against the isolated backend and fails without tenant data rendering | Actual backend must enforce organization membership on every read and mutation |
| Product record creation | Client waits for records load and rechecks customer/role before writes | Legacy Express does not atomically bind writes to displayed tenant or durably deduplicate retries; backend fix required |
| Source quality | Frontend migration checks, TypeScript, lint, build and disposable PostgreSQL project acceptance run in GitHub Actions | Exact final head must have all workflows green |

## Frontend release criteria still requiring external evidence

1. **Real visual parity:** approved screenshots from the frozen legacy app for each role at desktop/tablet/mobile, matching fixture data, timing, fonts and error states, followed by reviewed comparisons against the migrated UI. The repository currently has no immutable PNG/WebP/JPEG visual baselines.
2. **Keyboard and assistive-technology acceptance:** browser checks for tab order, focus visibility, modal/disclosure handling, screen-reader announcements, zoom and high-contrast behavior across all live forms; source and a subset of Chromium tests do not prove full accessibility.
3. **Authenticated staging acceptance:** owner, HR, employee and customer paths with actual migrated sessions, revoked role changes, expired logins, cross-tenant identifiers, MFA challenges, invitation expiration/replay and stale versions. Cannot be proven by frontend fixture responses alone.
4. **Integrated browser journeys:** finance corrections, destructive project/customer/employee actions, GitHub delivery, Music/Outreach SSO, owner transfer and application-record tenant switching with the trusted authority connected.
5. **Upstream reconciliation:** after organization PR #11 merges, compare this branch to updated organization `dev`, resolve divergence, and rerun on the intended integration head.

## Explicit boundary

The presence of a link or a client-side permission flag never confers authorization. The backend remains responsible for identity, tenant isolation, SQL policies, audited mutations and idempotency. The UI must fail closed when a response cannot be verified. Do not merge/deploy on the basis of synthetic-role screenshots or green mock HTTP tests alone.

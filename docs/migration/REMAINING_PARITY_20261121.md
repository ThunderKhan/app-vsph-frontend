# VSPH Control Center frontend parity — continuation checkpoint
Date: 2026-11-21
Contributor repository: `ThunderKhan/app-vsph-frontend`
Long-lived implementation branch: `migration/remaining-frontend-parity`
Target organization repository: `vsph-global/app-vsph-frontend` (`dev`)
Existing integration PR: https://github.com/vsph-global/app-vsph-frontend/pull/11

## Scope boundaries

This branch is built on the existing live Operations integration branch. It does not merge PR #11, replace the Express backend, migrate Supabase/PostgreSQL schemas, connect production provider credentials, or deploy UAT/dev/prod environments. Review and reconcile with `dev` after the prerequisite integration is merged; do not skip the comparison.

The backend remains the authority for authentication, active membership, tenant/project access, HR permissions, owner governance, identity assurance, financial audit and GitHub App operations. Next server-side reads use the exact allowlisted backend path and an authenticated portal session; mutations use fixed same-origin gateways with verified origin/session and narrow payloads.

## Migrated live frontend slices

| Area | New live route or capability | Boundary |
| --- | --- | --- |
| Project search | `/search`, `GET /api/search` | Literal authorized project/task/milestone matches, 25/page; no private descriptions |
| Employee self-service | `/my-work` | Assigned task statuses, leave requests and attendance, versioned and idempotent where applicable |
| HRMS calendar | `/calendar` | Authorized date-range reads, event create/update/delete and role enforcement |
| Organization administration | `/organizations` | Scoped organizations, members, product roles, invitations and audit activity, plus version-locked ownership review, password/TOTP step-up and server-only single-use transfer proof |
| Project manager governance | `/admin/project-managers` | Backend-authorized project leadership directory |
| Employee identity and HR access | `/employment`, account linking, `/hr/access` | Consent-bound identities and owner-governed HR rights |
| Employee lifecycle | `/employees/archived`, roster removal | Audited removal and owner-only restoration to onboarding; no automatic access restoration |
| Finance | `/admin/finance/manage` | Reviewed manual invoice, receipt, void and reverse actions; do not infer bank settlement |
| Customer lifecycle | `/admin/customers/[id]/lifecycle` | Versioned status and product entitlement changes, previewed impact |
| Project lifecycle | `/projects/[id]/lifecycle` | Owner-verified archive and conditional empty archived project deletion |
| Project delivery V2 | `/projects/[id]/workspace` | Milestone checklists, risks, resource links and weekly updates |
| Engineering delivery | `/projects/[id]/engineering` | Live server-owned GitHub observations, installation governance, repository discovery, sync and explicit work linking |
| Music | `/apps/music/launch` | Approved SSO configuration and current authorized customer organization chooser |
| Outreach | `/apps/outreach/launch` | Server-approved SSO start, active employee and integration checks; no arbitrary redirects |
| Role dashboards | `/dashboard` | Owner operating and finance snapshots; employee assigned work plus recorded activity heatmap; no preview fixture in real dashboard |

New routes are implemented in code and must still pass authenticated, tenant-specific acceptance against an approved configured backend. A passing source/type/build workflow is not evidence of hosted or provider acceptance.

## Test gates

- `npm ci && npm run check`: source tests, TypeScript, ESLint, production Next build and production preview guard.
- `.github/workflows/frontend-verification.yml`: protected unauthenticated route redirects, production-HTTP smoke for guarded employee/finance/customer/project/GitHub workflows plus the owner-transfer two-hop password/TOTP ceremony, authenticated owner/employee SSR isolation, development-only preview Chromium validation.
- `.github/workflows/projects-native-postgres-acceptance.yml`: existing real project acceptance with disposable PostgreSQL 17 + pinned legacy backend. Enabled on this branch. It does not test all newly migrated modules or a hosted Supabase instance.
- Extend tests with real approved database/role fixtures for every mutation. Include owner, HR, employee, customer, revoked users, stale versions, cross-tenant identifiers, no-Origin writes, session expiration, duplicate idempotency retries, locked records, and keyboard/mobile flows.

## Remaining work, explicitly not complete

1. **Organization ownership transfer — implemented but not live-accepted**: new owner-only organization panel and strict request/response contracts invoke the existing Express preview, password/TOTP reauthentication and atomic transfer with a single-use proof kept only server-side. Production credential-provider/Supabase staging acceptance remains outstanding. No real ownership transfer was executed.
2. **Authenticated end-to-end parity**: fresh approved backend + Next browser acceptance across every migrated module and role, especially finance, customer first grants, organization ownership transfer, project deletion, GitHub and SSO. Local mocked HTTP/native disposable PostgreSQL tests are not enough to call production ready.
3. **Provider and deployment acceptance**: real GitHub App, Music and Outreach receivers, approved environment secrets, rollout routes and rollback. These are deferred, not enabled.
4. **Integration and upstream rebase**: compare the long-lived branch to the latest organization `dev` after PR #11. Resolve conflicting files and rerun all checks before proposing the next organization PR.
5. **Separate architecture migration**: Fastify 5 + Prisma 7 backend remains an independent project; do not claim the frontend work replaced Express.

## Safety / audit requirements

Never insert preview fixtures or synthetic owner/employee metrics in authenticated pages. Do not invent customer receipts or interpret manual records as bank settlement. Keep production database, migrations, credentials, DNS, GitHub installation approvals and deployment untouched until specifically approved. No work in this branch constitutes operator approval or proof of hosted production readiness.

## Review cleanup (2026-11-21)

Four major CodeRabbit issues were repaired on this branch: streamed byte-bounded request bodies, durable invoice/receipt idempotency keys across equivalent edits, registered-product grants for customers with no prior grant, and membership/name drafts tied to original versions. The reported smaller correctness issues were reviewed and addressed across calendar editing, request/field limits, response projections, datetime validation, session 401 redirects, file/work selectors and accessibility-related messaging. Regression tests were added. Do not treat this declaration as CodeRabbit approval: rerun review on a stable head and verify accepted findings individually. Staging with actual user credentials/SSO receivers remains required before production release.

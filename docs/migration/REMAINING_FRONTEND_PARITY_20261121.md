# Remaining frontend parity — working branch ledger (21 Nov 2026)

**Repository:** ThunderKhan/app-vsph-frontend
**Branch:** migration/remaining-frontend-parity
**Base:** integration/ops-live-on-projects-20261119; organization PR #11 was open when work began
**Source baseline:** ThunderKhan/vsph-control-center at frozen commit `3b3a1535873aa0517aea41da32a407f3d9680547`

## Implemented in this branch (source committed; integration acceptance separate)

- Work search: `/search`, typed authenticated read, filters, pagination, workspace navigation.
- Employee self-service: `/my-work`, task statuses, leave submissions/cancellation, check-in/out and profile-scoped records.
- Project manager governance directory: `/admin/project-managers`, owner-scoped read-only overview.
- HRMS calendar: `/calendar`, month/week/day/list, create/edit/delete, versioned mutations, guarded backend paths.
- Organization administration: `/organizations`, scoped summary, member/product role governance, invitations and receipt handling.
- HR authority review: `/hr/access`, owner-only directory and revocation (grant is exposed only from approved identity-readiness flow).
- Employee identity: `/employment` and `/employees/[id]/account-link`, consent, MFA continuation, manager request/renew/cancel/revoke and eligibility-based HR grant.
- Outreach grant governance: `/admin/outreach-access`, owner-only grants and revocation against the original protected API.

Each slice has a dedicated source test, and `tests/remaining-contracts.test.mjs` exercises type/permission boundaries. The branch triggers both frontend CI workflows. A green code build is not a hosted identity, DB schema, provider, usability or cross-tenant acceptance.

## Incomplete — do not claim full frontend migration

- Employee roster archive, restore, removal, temporary credentials and new-account enrollment management (the initial invitation entry pages already exist).
- Finance invoice/payment/reversal/void frontend mutations; owner journal remains read-only.
- Customer/organization owner transfer with password/MFA step-up, advanced customer lifecycle, subscription governance.
- Advanced Projects lifecycle, cross-project delivery/repository integrations beyond the merged baseline.
- Music launch chooser and cross-product SSO; Outreach launch/exchange/introspection require the real receiver and verified backend.
- Final route/role/source screenshot comparison including narrow screens, keyboard/accessibility, error states, and backend integration.
- Hosted Supabase Auth/PostgREST acceptance, existing database upgrade readiness and production release.
- Replacement Fastify/Prisma backend belongs to a **different repository/workstream**; this branch does not replace Express.

## Safety and merge constraints

- Original Express service remains authoritative for existing sessions, tenant permissions, Supabase and transaction semantics.
- No production database migration, staged provider connection, DNS or domain changes were made.
- All browser mutations must go through same-origin protected Next.js server routes with bounded schemas and backend reauthorization.
- Do not merge this branch upstream until organization PR #11 is reconciled, final diffs are inspected, CI passes on the final head and reviewers approve the remaining work.
- Preserve original HTML/CSS/JS snapshots as reference; no fake production role switching.

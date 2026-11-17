# Live Projects migration — integration and acceptance

This branch moves Projects off the dev-only previews onto the existing VSPH
Control Center backend. It intentionally changes **only the frontend fork**.
It does not migrate databases, deploy services, or alter the organization repo.

## Branch and routing

- Branch: `migration/projects-member-selection`, based on
  `migration/projects-ui-preview`.
- `/projects`: authenticated, backend-authorized portfolio; create link requires
  backend `canCreate`.
- `/projects/new`: owner-only project creation; customer orgs come from the
  authorized backend directory, not static fixture lists.
- `/projects/<UUID>` and `/projects/<KEY>`: server-loaded project detail,
  team membership, task assignments/statuses, milestones, and comments.
- The original synthetic `/_preview` surfaces remain development-only.

## Environment / dependencies

Set these trusted server environment variables (never expose them to browsers):

- `VSPH_INTERNAL_API_ORIGIN`: exact HTTPS backend origin (local HTTP loopback
  permitted for development).
- `VSPH_PUBLIC_ORIGIN`: exact HTTPS frontend origin (local HTTP loopback
  permitted for development). Write proxies require a matching browser Origin.

The backend must recognize the same `vsph.portal.sid` opaque session cookie.
Its project RPCs and reviewed internal workforce migrations, including
`20261109143000_project_workforce_governance.sql`, must already be installed and
verified in a **nonproduction environment**. This branch does not install them.

## Reviewed API integration

Frontend server-only reads:

- `GET /api/projects?q=&status=`
- `GET /api/projects/directory`
- `GET /api/projects/<UUID>`
- `GET /api/projects/by-key/<KEY>`
- `GET /api/projects/<UUID>/workforce`
- `GET /api/auth/me`

The browser sends writes only to same-origin Next.js routes. The server maps
validated, bounded payloads to these backend commands:

- `POST /api/projects` — create project (owner is the authenticated actor)
- `PATCH /api/projects/<UUID>` — edit project
- `POST /api/projects/<UUID>/workforce/assign`
- `POST /api/projects/<UUID>/workforce/remove`
- `POST /api/projects/<UUID>/workforce/manager-revoke`
- `POST /api/projects/<UUID>/milestones`
- `PATCH /api/projects/<UUID>/milestones/<milestone>`
- `POST /api/projects/<UUID>/tasks`
- `PATCH /api/projects/<UUID>/tasks/<task>`
- `POST /api/projects/<UUID>/comments`

`manager-grant` is also permitted in the server adapter but not surfaced as
a separate button: owner-authorized manager promotion uses workforce assignment.

All existing-project mutations include the latest project `version`.
Backend project commands must lock and recheck authorization, enforce task/
milestone transitions, and return a 409 conflict for stale versions. The
frontend never claims permission based only on a displayed role.

The UI always reloads server-authorized records after confirmed writes. On
failed writes it retains the form and displays a failure message. Access removal
and manager demotion require an explicit in-app confirmation.

## Verification

On a fresh checkout:

```sh
npm ci
npm run check
```

A branch-scoped GitHub Action is registered in
`.github/workflows/projects-migration.yml`; **do not claim CI success without
checking the actual run**.

Before merging or enabling production traffic, exercise these in a disposable
staging environment:

1. Owner creates internal and customer projects; invalid customer org IDs,
   duplicate keys, bad dates, and non-owner creation are rejected.
2. Manager loads project members and eligible internal staff. Inactive/unlinked
   staff, customer-only identities, and forged manager grants are denied by SQL.
3. Manager adds, changes, and removes members. Open assigned tasks block removal
   or role downgrade; accountable owner cannot be removed.
4. Owner can grant/demote manager role. Ordinary manager cannot manage other
   managers. Check cross-project and revoked-access requests.
5. Manager creates tasks, assigns/reassigns work, and updates task status.
   Contributor updates only their assigned status. Viewer/client writes fail.
6. Manager creates milestones and follows permitted status transitions. Finishing
   milestones with open linked work is denied.
7. Contributors and managers can post task-linked or project-level internal
   comments; viewer and client writes fail. Client visibility remains filtered.
8. Two concurrent sessions edit the same version: second write receives 409,
   no silent overwrite, and reload restores the authoritative data.
9. Expired/malformed session, missing or mismatched Origin, malformed payload,
   and unavailable backend all fail closed.
10. Test responsive layouts and keyboard navigation on mobile and desktop.

## Deferred / not claimed complete

- Automated acceptance has not been observed passing in this environment.
- Repository/deployment integrations, project custom applications, deliverables,
  full activity history, and milestone dependencies remain outside this slice.
- Operations modules (People/HR, Customers, Finance, Reports, Administration)
  still require a separate live integration pass.
- No organization PR is opened by this branch; honor the existing PR queue.

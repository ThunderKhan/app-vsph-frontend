# Projects write integration — staging milestone

Branch: integration/projects-live-details; this is NOT merged into the organization.

## Implemented
- Existing read-only, backend-authorized Projects portfolio and detail pages remain isolated from the synthetic dev preview.
- Owner-only **internal** project creation affordance on /projects/new. Server GET list's canCreate controls visibility; backend POST /api/projects makes the actual access decision.
- Manager-only editing of name, description, priority and due date. Every request includes the currently displayed project version. Backend checks membership, status constraints and optimistic version (conflicts yield 409). The UI never asks for an owner, subscription, entitlement, team grant or customer organization on this path.
- Same-origin Next.js POST /api/projects and PATCH /api/projects/[id] route handlers forward narrowly validated JSON to a trusted internal API origin, using only the portal session cookie. Bounded request size, exact public Origin requirement, no-store, manual redirect rejection, timeout, sanitized errors and no arbitrary URL/path forwarding.
- On failed/ambiguous creation, the UI asks the user to inspect their portfolio before retrying so it does not encourage accidental duplicates.

## Required environment
- VSPH_INTERNAL_API_ORIGIN: exact approved backend origin (HTTPS, or loopback HTTP in development)
- VSPH_PUBLIC_ORIGIN: exact browser-facing Next.js origin, e.g. https://control.example.invalid
- Legacy Express **PUBLIC_ORIGIN** must match VSPH_PUBLIC_ORIGIN for forwarded writes. Do not weaken the backend Origin validation to accommodate a deployment mismatch.
- Real portal cookie vsph.portal.sid, and backend endpoint availability.

## Deliberately not complete
- Customer project creation (needs approved customer organization selector).
- Project task, milestone, member, lifecycle, file/deployment, customer grant and product entitlement mutation flows.
- Real staging integration, session/tenant acceptance, DB transaction checks or deployed verification.
- No live Supabase credentials, database changes or external mail/API calls were performed.

## Staging acceptance (do not test on production customer records)
1. With a dedicated owner test account and isolated backend, create an internal project and confirm redirect to its real UUID.
2. Confirm unauthorized employee/client cannot create; expired session gives 401, wrong Origin gives 403.
3. With an authorized manager, edit project metadata; reload verifies persisted changes.
4. Submit the same old version twice: only the first update succeeds, the second returns 409; an invalid status transition is still denied by the backend.
5. Verify customer/client viewers see no edit control; test cross-tenant project GET/PATCH denial.
6. Missing backend/env returns unavailable and never invents successful project records.
7. Verify a production build returns 404 on /__preview/workspace and redirects anonymous /projects, /projects/new and /projects/[id] navigation.

## Merge queue
Organization employee entry (#6) then role dashboards (#7), then focused Projects and Operations branches. The current integration branch is stacked after Operations and must be reviewed/rebased after those merge. No additional organization PR was opened here.

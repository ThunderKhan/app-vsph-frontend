# Development-only frontend preview — no backend needed

This is a **read-only UI preview**, not a mock authentication provider and
not an alternative portal route.

## Access

Run the fork branch `migration/workspace-shell-applications` using Node 24:

```powershell
git fetch origin
git switch migration/workspace-shell-applications
git pull --ff-only
npm run check
npm run dev
```

Open **http://localhost:3000/__preview/workspace** (development server only).

The preview reuses the same workspace navigation, dashboard summary, application
library, original CSS, Inter font and shared components as the actual migrated
screens. It provides:
- Example-only products and organizations (not actual records).
- Owner, employee and customer role *presentations* for visual review.
- Overview and Applications tabs, plus working client-side application search.
- Desktop and mobile responsive design using unchanged VSPH CSS.
- A permanent **Development preview / Synthetic data only** banner.

**The role picker is only a visual fixture selector. It does not confer any
permission or represent a signed-in identity.** Owner and employee modules
whose actual dashboards have not been ported are not fabricated here.

## Hard security boundary

The preview lives at `/__preview/workspace`, **outside** the
`(workspace)` authenticated route group. The physical folder is
`src/app/(preview)/%5F_preview/workspace/`: Next.js treats a literal
leading underscore in a folder name as a private, *non-routable* directory.
`%5F_preview` encodes the first underscore and preserves the public URL
`/__preview/workspace`. Do not rename it to `__preview` (which caused
a 404 in development despite all previous source tests passing). It is guarded by

```ts
if (process.env.NODE_ENV !== 'development') notFound();
```

This means it must return 404 in production (`next start`). The original
`/dashboard` and `/applications` routes **remain protected** by the server
session check and are not modified to accept preview identities.

The preview code has no `fetch`, browser storage, real API, credentials,
private URL parameters or auth tokens. Its shared components disable sign-out,
application-launch links, account shortcuts and navigation actions when
`previewMode` is enabled. The server-side API helper is not imported by
this preview route.

The `npm run check` command now also verifies the **actual Next.js
production route manifest** includes `/__preview/workspace`. This prevents
false positives from source-only tests that merely check file existence.

Always verify the production guard before deployment: after `npm run check`,
run `npm run start` and request `/__preview/workspace` in a separate
terminal. It must give an HTTP 404; do not mistake a streamed page body
or application shell for authorized content.

A development-only preview must not be publicly hosted. Run it on an
isolated developer machine; if using a LAN URL, protect access to the
development server. Never enter real account passwords or private tokens
into any preview.

## Work that can continue without the backend

1. Port owner overview and employee dashboards as shared React components,
   and develop isolated, clearly labeled synthetic fixtures for visual review.
2. Port Projects, People, Customers, Reports and account pages incrementally,
   retaining the original design and real API contracts.
3. Run source integrity, TypeScript, lint, responsive browser and production
   build tests. Use preview fixtures only for visual assertions.
4. Maintain a release checklist for server-session authorization, MFA,
   cross-role/tenant denial tests and real staging data. These gates remain
   BLOCKED until a reviewed backend is available.

No library/runtime dependencies, auth rules, external services, production
databases or deployment settings are changed by this preview.

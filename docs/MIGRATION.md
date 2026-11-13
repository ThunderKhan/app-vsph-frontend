# Control Center frontend migration — PR 1: sign-in

The organization frontend is the **canonical target**:
`vsph-global/app-vsph-frontend`. This work is developed in its fork
`ThunderKhan/app-vsph-frontend` on branch `migration/control-center-login`.

## Scope
- Exact VSPH Control Center portal and application login React components
  from validated source `ThunderKhan/vsph-control-center-v3` main.
- Original Inter font binary with SIL license, exact active `auth.css` and
  `crm-auth.css`, and original copy/MFA/UI interactions.
- `/login` and `/apps/[app]/login` UI routes.
- Two separate **root layouts** in Next.js App Router:
  - `src/app/(site)/layout.tsx`: the pre-existing Geist and Tailwind v4
    root layout for the organization's current homepage and future pages.
  - `src/app/(auth)/layout.tsx`: the original VSPH Inter/font/styles
    for sign-in pages; it does not import Tailwind preflight or Geist.
- The existing homepage, `src/app/globals.css`, `next.config.ts`,
  `package-lock.json` and every existing dependency version are preserved.

### Important: no live authentication yet
The Auth UI still sends requests to the original same-origin `/api/*`
contracts. **There is no verified session-auth backend behind the
organization frontend.** A failed/unavailable request must not become an
accepted login. Rendering `/apps/[app]/login` does not itself grant access.
Do not deploy or promote this frontend as a live authenticated application.

Do not introduce an insecure client-side-only authorization bypass. Before
deployment, the approved Fastify backend needs an atomic DB-backed portal
session store, httpOnly cookies, MFA, tenant/product access enforcement,
server-side route guards and exact same-origin API reverse proxy.

### Why separate root layouts?
The organization starter loads Tailwind's CSS reset and Geist font; the legacy
login uses a distinctive split view, Inter and original global CSS. An
ordinary nested layout under the existing root would leak the reset into
login and alter its appearance. Separate root layouts, using route groups
that do not change URLs, preserve both presentations.

## Local verification
From a clone of this **fork branch** with Node.js 24:

```powershell
npm ci
npm run test:migration
npm run typecheck
npm run lint
npm run build
npm run dev
```

Preview `http://localhost:3000/login` and `/apps/crm/login`.
UI interactions should work; real login requests will not authenticate
without a correctly integrated backend. Compare desktop and mobile visual
captures to the original before declaring pixel parity. The Node source
tests verify original exact file hashes, not rendered screenshots.

## Remaining migration
Dashboard, project pages, employee/HR, organizations, customers, finance,
notifications, calendar, search, profile, session management, and
administration remain unported. This is a first incremental frontend PR,
not an application release.

Source baseline: `ThunderKhan/vsph-control-center`
`3b3a1535873aa0517aea41da32a407f3d9680547`.

## November 13 Windows verification corrections

The first run on the organization fork found four independent porting issues:
- `tests/migration-source.test.mjs` incorrectly wrote `blob <bytes> \\0` (an extra ASCII space before NUL) when computing Git object SHA-1. The header is now `blob <bytes>\\0` and original binary/CSS hashes remain untouched.
- The starter layout depended on Next's generated `LayoutProps<'/'>` type; the site layout now uses an explicit ReactNode prop type that works before generating route types.
- React 19's hooks lint disallows synchronous state resets in the app-lookup effect. Initial state is already correct; the dynamic route keys `AuthPage` by app code to remount for a different application. The brand link uses Next `Link` to satisfy Next's route lint.
- With `cacheComponents: true` and partial prefetching unchanged, the dynamic product login must allow request-time `params`: `export const instant = false` on this route only. No organization-wide cache config is disabled.

The original static Inter stylesheet still comes from `/fonts.css` and the auth-layout ESLint exception is narrowly scoped to that single legacy public resource. These are **candidate fixes** until Node tests, lint, typecheck, and production build all pass on the contributor's Node 24 machine.

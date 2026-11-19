# VSPH temporary Coming Soon site

A **standalone, dependency-free static site** to temporarily serve `app.vsph.in` while the main Next.js Cloudflare Worker is repaired.

This is deliberately **not** part of the Next.js root build or the production Worker configuration. It introduces a **separate Worker name** to avoid overwriting the existing application.

## Review locally

```powershell
# From repository root
python -m http.server 8765 --directory operations/coming-soon/public
# Open http://localhost:8765
```

## Deploy when an authorized Cloudflare administrator approves

1. Confirm the correct Cloudflare account and permissions.
2. Run from the repository root:

```powershell
npx wrangler whoami
npx wrangler deploy --config operations/coming-soon/wrangler.jsonc
```

3. Confirm the new `vsph-coming-soon` Worker works at its temporary `workers.dev` URL (HTTP 200, responsive UI, correct page).
4. Record the old `app.vsph.in` binding and its active Worker. Do **not** delete the original.
5. In Cloudflare, move the **custom domain** `app.vsph.in` to `vsph-coming-soon` using the Domains UI. This requires appropriate DNS/Workers authorization and may briefly interrupt traffic. Ensure no conflicting Worker routes/custom-domain mappings remain.
6. Verify HTTPS and fetch `https://app.vsph.in/`; verify the new Worker returns 200. Test with another browser/network.
7. Do not claim a backend is live; the maintenance page is intentionally static.

## Roll back

1. Restore the recorded `app.vsph.in` custom-domain binding to the original `app-vsph-frontend` Worker after it is fixed and verified at an independent test URL.
2. Verify responses after the switch.
3. Only then consider retiring the maintenance Worker.

## Notes

- Changing the Workers Builds token does not resolve the Next.js Error 1101.
- Preview builds for `dev` and `uat` need independently validated build/deploy configurations and resulting URLs.
- Never commit Cloudflare credentials, Wrangler secrets or `.env` contents.
- This folder is inert unless someone explicitly deploys its Wrangler file; `npm run build` at the repo root does not use this maintenance Worker.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const load = async (path) => readFile(new URL(path, root), 'utf8');
const sha = (bytes) => createHash('sha1')
  .update(Buffer.from('blob ' + bytes.length + '\\0'))
  .update(bytes).digest('hex');

test('customer invite CSS is the original apart from the Turbopack-breaking font import', async () => {
  const frozen = await readFile(new URL('docs/reference/accept-invite/invite.css', root));
  const active = await readFile(new URL('src/app/(invite)/invite.css', root));
  const originalImport = Buffer.from("@import url('/fonts.css');\n");
  assert.ok(frozen.subarray(0,originalImport.length).equals(originalImport));
  assert.ok(active.equals(frozen.subarray(originalImport.length)),
    'invitation stylesheet was changed outside of font loading');
  assert.equal(sha(frozen), '4085a2c35922523a79b4a45cf110c575fbb224e5');
  const html = await readFile(new URL('docs/reference/accept-invite/accept-invite.html',root));
  assert.equal(sha(html), '869200159e824b1295b19c795893b81df6bfed5b');
});

test('invitation flow preserves fragment-only proof and backend inspection', async () => {
  const page = await load('src/features/invitations/AcceptInvitePage.tsx');
  const route = await load('src/app/(invite)/accept-invite/page.tsx');
  const layout = await load('src/app/(invite)/layout.tsx');
  const packages = JSON.parse(await load('package.json'));
  assert.match(page, /location\.hash\.slice\(1\)/);
  assert.match(page, /invitation_id/);
  assert.match(page, /invitation_token/);
  assert.match(page, /history\.replaceState\(null, '', window\.location\.pathname\)/);
  assert.match(page, /\/api\/invitations\/.*action/);
  assert.match(page, /credentials: 'same-origin'/);
  assert.match(page, /cache: 'no-store'/);
  assert.match(page, /newIdentity/);
  assert.match(page, /'inspect'/);
  assert.match(page, /'accept'/);
  assert.match(page, /proofRef\.current = null/);
  assert.match(page, /'Invitation accepted for this customer workspace\. Sign in to continue\.'/);
  assert.match(route, /referrer: 'no-referrer'/);
  assert.match(layout, /href="\/fonts\.css"/);
  assert.doesNotMatch(layout, /\.\.\/globals\.css/);
  assert.equal(packages.dependencies.next, '16.4.6');
  assert.equal(packages.dependencies.react, '19.3.0');
  assert.equal(packages.devDependencies.tailwindcss, '4.3.3');
});

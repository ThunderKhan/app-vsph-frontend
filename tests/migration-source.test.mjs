import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const utf8 = async (path) => readFile(new URL(path, root), 'utf8');
const gitSha = (bytes) => createHash('sha1')
  .update(Buffer.concat([Buffer.from('blob ' + bytes.length), Buffer.from([0])]))
  .update(bytes).digest('hex');

test('original Inter font and VSPH login styling are preserved', async () => {
  const originalFont = await readFile(new URL('public/fonts/inter-5a8d3e72.woff2', root));
  assert.equal(gitSha(originalFont), '5a8d3e72ad7ffb62af3b146e1b1f54ab5813a212');
  for (const [path, sha] of [
    ['src/app/(auth)/auth.css', 'fe5e850bd6d31d2fde01b2374713e52fbce04fbe'],
    ['src/app/(auth)/crm-auth.css', 'd1412ddcd91c764db5c7f04c2fec662f5475ee70'],
    ['src/features/auth/presentation.ts', 'dfc77798424434c2a9c58b99c48687164e52c38c'],
  ]) assert.equal(gitSha(await readFile(new URL(path, root))), sha, 'legacy UI drift: ' + path);
  assert.match(await utf8('public/fonts/INTER-LICENSE.txt'), /SIL OPEN FONT LICENSE/i);
  assert.match(await utf8('public/fonts.css'), /inter-5a8d3e72\.woff2/);
});

test('organization site keeps Tailwind and Geist; auth has a distinct root layout', async () => {
  const site = await utf8('src/app/(site)/layout.tsx');
  const auth = await utf8('src/app/(auth)/layout.tsx');
  assert.match(site, /next\/font\/google/);
  assert.match(site, /\.\.\/globals\.css/);
  assert.doesNotMatch(auth, /globals\.css/);
  assert.match(auth, /href="\/fonts\.css"/);
  assert.match(auth, /auth-page portal-auth/);
  assert.match(await utf8('src/app/globals.css'), /@import "tailwindcss"/);
  const packageJson = JSON.parse(await utf8('package.json'));
  assert.equal(packageJson.dependencies.next, '16.4.6');
  assert.equal(packageJson.dependencies.react, '19.3.0');
  assert.equal(packageJson.devDependencies.tailwindcss, '4.3.3');
});

test('auth copy, MFA and API paths remain original, without mock success', async () => {
  const page = await utf8('src/features/auth/AuthPage.tsx');
  const copy = await utf8('src/features/auth/presentation.ts');
  for (const id of ['authForm','authSubmit','authHeading','organizationId','mfaField',
    'totpCode','authError','inviteEntry']) {
    assert.ok(page.includes('id="' + id + '"'), 'missing auth DOM anchor: ' + id);
  }
  for (const path of ['/api/auth/login', '/api/auth/app-login', '/api/apps/']) {
    assert.ok(page.includes(path), 'missing original endpoint: ' + path);
  }
  assert.match(copy, /Welcome back/);
  assert.match(await utf8('src/app/(auth)/crm-auth.css'), /\.auth-intro\{display:none\}/);
});

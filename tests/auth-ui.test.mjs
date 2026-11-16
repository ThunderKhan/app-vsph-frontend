import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('unmerged invitation route is not presented as a working login link', async () => {
 const page = await read('src/features/auth/AuthPage.tsx');
 const layout = await read('src/app/(auth)/layout.tsx');
 assert.doesNotMatch(page, /href="\/accept-invite"/);
 assert.match(page, /Account activation page pending integration/);
 assert.match(page, /Sign-in service is not connected in this environment/);
 assert.match(layout, /auth-overrides\.css/);
});

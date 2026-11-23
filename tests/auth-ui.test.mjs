import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('invitation route is integrated and accessible from the sign-in page', async () => {
 const page = await read('src/features/auth/AuthPage.tsx');
 const layout = await read('src/app/(auth)/layout.tsx');
 assert.match(page, /<Link href="\/accept-invite">How to activate your account<\/Link>/);
 const route = await read('src/app/(invite)/accept-invite/page.tsx');
 assert.match(route, /AcceptInvitePage/);
 assert.match(page, /Sign-in service is not connected in this environment/);
 assert.match(layout, /auth-overrides\.css/);
});

test('MFA challenge is scoped to the current credentials and customer, with accessible status', async () => {
 const page = await read('src/features/auth/AuthPage.tsx');
 assert.match(page, /function resetMfaChallenge\(\)/);
 assert.match(page, /setEmail\(event\.target\.value\); resetMfaChallenge\(\)/);
 assert.match(page, /setPassword\(event\.target\.value\); resetMfaChallenge\(\)/);
 assert.match(page, /setOrganizationId\(event\.target\.value\); resetMfaChallenge\(\)/);
 assert.match(page, /setTotpCode\(event\.target\.value\.replace\(\/\\D\/g, ''\)\.slice\(0, 6\)\)/);
 assert.match(page, /mfaVisible && \(!totpFactorId \|\| totpCode\.length !== 6\)/);
 assert.match(page, /problem\.factors\.length > 0/);
 assert.match(page, /aria-busy=\{busy\}/);
});

test('pending authentication prevents credential edits that could reuse a stale MFA challenge', async()=>{
 const page=await read('src/features/auth/AuthPage.tsx');
 assert.match(page,/readOnly=\{isApplicationLogin\} disabled=\{busy\}/);
 assert.match(page,/disabled=\{busy \|\| !contextReady\}/);
 assert.match(page,/required disabled=\{busy\} value=\{password\}/);
 assert.match(page,/required=\{mfaVisible\} disabled=\{busy\}/);
 assert.match(page,/name="totpFactorId" disabled=\{busy\}/);
});

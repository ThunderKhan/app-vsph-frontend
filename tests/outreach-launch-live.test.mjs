import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {trustedOutreachStartUrl} from '../src/features/outreach/OutreachLaunchContract.ts';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('Outreach launch accepts only the preconfigured SSO start path and secure scheme',()=>{
 const allowed='https://outreach.example.test/api/v1/sso/start';
 assert.equal(trustedOutreachStartUrl(allowed),allowed);
 for(const url of ['https://evil.example.test/', 'https://outreach.example.test/api/v1/sso/start?next=evil',
    'javascript:alert(1)','https://alice:secret@outreach.example.test/api/v1/sso/start',
    'https://outreach.example.test/api/v1/sso/callback'])
   assert.equal(trustedOutreachStartUrl(url),null);
});
test('Outreach bridge never exposes tokens or follows an arbitrary backend redirect',async()=>{
 const route=await read('src/app/(workspace)/apps/outreach/launch/route.ts');
 const nav=await read('src/features/workspace/ApplicationsLibrary.tsx');
 assert.match(route,/validPortalSession/);
 assert.match(route,/approvedInternalOrigin/);
 assert.match(route,/result.headers.get\('location'\)!==approved/);
 assert.match(route,/result.status!==303/);
 assert.match(nav,/\/apps\/outreach\/launch/);
 assert.doesNotMatch(route,/x-vsph-client-secret|NEXT_PUBLIC_|localStorage|searchParams/);
});

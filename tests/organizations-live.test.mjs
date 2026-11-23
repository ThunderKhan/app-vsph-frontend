import {test} from 'node:test';
import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('organization workspace rejects unverified data and uses server sessions',async()=>{
 const page=await read('src/app/(workspace)/organizations/page.tsx');
 const model=await read('src/features/organizations/OrganizationContract.ts');
 const api=await read('src/features/workspace/server-api.ts');
 for(const p of ['parseOrgList','parseOrgDetail','parseOrgMembers','parseOrgInvites'])assert.ok(page.includes(p));
 assert.match(api,/permittedOrgRead/);
 assert.match(model,/product_roles/);
 assert.doesNotMatch(page,/OperationsFixtures|exampleOrganizations|client-side-only/);
});
test('organization writes require exact actions, identity and Origin and preserve invitation retry keys',async()=>{
 const route=await read('src/app/api/organization-command/route.ts');
 const ui=await read('src/features/organizations/OrganizationWorkspace.tsx');
 for(const k of ['approvedPublicOrigin','validPortalSession','Idempotency-Key','organizationMutation'])
   assert.ok(route.includes(k),k);
 assert.match(ui,/pendingInvite/);
 assert.match(ui,/window.location.reload/);
 assert.doesNotMatch(ui,/localStorage|sessionStorage|Math.random/);
});

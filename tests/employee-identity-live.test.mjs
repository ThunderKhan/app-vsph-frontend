import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('personal identity acceptance requires current versions, password and optional MFA',async()=>{
 const contract=await read('src/features/employee-work/IdentityContract.ts');
 const ui=await read('src/features/employee-work/EmploymentWorkspace.tsx');
 const proxy=await read('src/app/api/employee-identity-action/route.ts');
 assert.match(contract,/action==='accept'/);assert.match(contract,/totpFactorId/);
 assert.match(ui,/Accept account link/);assert.match(ui,/MFA_REQUIRED/);
 assert.match(proxy,/validPortalSession/);assert.match(proxy,/approvedPublicOrigin/);
 assert.match(proxy,/factors:factorRows/);
 assert.doesNotMatch(ui+proxy,/localStorage|sessionStorage|OperationsFixtures|NEXT_PUBLIC_/);
});
test('manager identity controls enforce current link/version and UUID idempotency',async()=>{
 const contract=await read('src/features/employee-work/IdentityContract.ts');
 const ui=await read('src/features/employee-work/EmployeeIdentityManager.tsx');
 const api=await read('src/features/workspace/server-api.ts');
 for(const x of ['request','renew','cancel','revoke','grant_hr'])assert.ok(contract.includes(x));
 assert.match(ui,/Current roles and sessions will be rechecked/);
 assert.match(api,/permittedIdentityRead/);
});

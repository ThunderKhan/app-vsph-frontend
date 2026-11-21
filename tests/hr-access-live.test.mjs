import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('HR governance only renders owner-verified roster and controlled removal',async()=>{
 const page=await read('src/app/(workspace)/hr/access/page.tsx');
 const command=await read('src/app/api/hr-governance/route.ts');
 const ui=await read('src/features/employee-work/HrAccessWorkspace.tsx');
 assert.match(page,/flags.governHr/);assert.match(page,/roster.role!=='owner'/);
 assert.match(command,/revoke_hr/);assert.match(command,/approvedPublicOrigin/);
 assert.match(command,/validPortalSession/);assert.match(ui,/Confirm revocation/);
 assert.doesNotMatch(page+ui,/RoleDashboardFixtures|OperationsFixtures|exampleEmployees/);
});

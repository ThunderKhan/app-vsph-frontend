import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('employee self-service uses bounded role-scoped backend data and no preview fixtures',async()=>{
 const code=await read('src/features/employee-work/OwnWorkContract.ts');
 const page=await read('src/app/(workspace)/my-work/page.tsx');
 const api=await read('src/features/workspace/server-api.ts');
 assert.match(code,/tasks.length>50/);
 assert.match(code,/attendance.length>31/);
 assert.match(code,/leave.length>25/);
 assert.match(page,/parseOwnWork/);
 assert.match(api,/permittedMyWork/);
 assert.doesNotMatch(page,/OperationsFixtures|exampleEmployees|localStorage/);
});
test('all own-work mutations enforce same-origin session and fixed action shapes',async()=>{
 const proxy=await read('src/app/api/my-work-action/route.ts');
 const contract=await read('src/features/employee-work/OwnWorkContract.ts');
 const ui=await read('src/features/employee-work/MyWorkWorkspace.tsx');
 assert.match(proxy,/approvedPublicOrigin/);
 assert.match(proxy,/validPortalSession/);
 assert.match(proxy,/Idempotency-Key/);
 assert.match(contract,/Object.keys\(v\).length/);
 for(const a of ["action==='task'","action==='leave'","action==='cancel'","action==='in'","action==='out'"])
   assert.ok(contract.includes(a),a);
 assert.match(ui,/Current authorized records loaded/);
 assert.match(ui,/window.location.reload/);
 assert.doesNotMatch(proxy,/NEXT_PUBLIC_|serverAction|OperationsFixtures/);
});

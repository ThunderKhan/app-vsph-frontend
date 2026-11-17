import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const load=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('workforce projection uses actual backend staff schema, never fixtures',async()=>{
 const model=await load('src/features/projects/ProjectMemberEligibility.ts');
 const picker=await load('src/features/projects/ProjectMemberPicker.tsx');
 for(const field of ['canGovernManagers','canAssign','input.staff','row.user_id',
   'row.full_name','row.department','row.project_role','row.membership_status','row.open_tasks'])
   assert.ok(model.includes(field),field);
 assert.match(model,/ids.has\(row.user_id.toLowerCase\(\)\)/);
 assert.match(model,/role !== 'manager' \|\| isPlatformOwner/);
 assert.match(picker,/existingMemberIds/);
 assert.match(picker,/canChooseMembershipRole\(role,isPlatformOwner\)/);
 assert.match(picker,/isPlatformOwner&&<option value="manager">/);
 assert.doesNotMatch(model+picker,/localStorage|sessionStorage|ProjectFixtures|fetch\(/);
});
test('picker cannot submit in disabled, busy, or invalid states',async()=>{
 const picker=await load('src/features/projects/ProjectMemberPicker.tsx');
 assert.match(picker,/if \(blocked \|\| !valid \|\| !selected\) return/);
 assert.match(picker,/disabled=\{blocked \|\| !valid\}/);
});

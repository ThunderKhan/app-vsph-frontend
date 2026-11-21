import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
async function validators(){
 const source=await read('src/features/operations/EmployeeLifecycleContract.ts');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};vm.runInNewContext(js,{exports},{timeout:1000});
 return exports;
}
test('removal and restoration require exact version, reason, and consent shape',async()=>{
 const x=await validators();
 const form={operation:'remove',id,version:2,reason:'Verified employee departure',confirmed:true};
 assert.equal(x.employeeLifecycleMutation(form)?.path,'/api/employees/'+id+'/remove');
 for(const bad of [{...form,version:0},{...form,reason:'short'},{...form,confirmed:false},
  {...form,email:'a@example.invalid'},{...form,id:'bogus'},{...form,reason:'Some reason\n'}])
  assert.equal(x.employeeLifecycleMutation(bad),null);
 assert.equal(x.employeeLifecycleMutation({...form,operation:'restore',version:1000000000}),null);
 assert.equal(x.confirmedLifecycleResult({id,removed:true,removedAt:'2026-11-21T08:00:00Z'},'remove',id),true);
 assert.equal(x.confirmedLifecycleResult({id,removed:true,removedAt:'2026-11-21T08:00:00Z'},'restore',id),false);
});
test('employee removal UI delegates to protected mutation gateway',async()=>{
 const route=await read('src/app/api/employee-lifecycle-action/route.ts');
 const table=await read('src/features/operations/LiveEmployeeTable.tsx');
 assert.match(route,/validPortalSession/);assert.match(route,/approvedPublicOrigin/);
 assert.match(route,/confirmedLifecycleResult/);assert.match(table,/EmployeeRemovalPanel/);
 assert.doesNotMatch(route+table,/OperationsFixtures|NEXT_PUBLIC_|localStorage/);
});

test('archived-employee parser enforces owner-only, bounded, valid record projections',async()=>{
 const x=await validators();
 const row={id,full_name:'Worker One',email:'worker@example.invalid',department:'Engineering',
  job_title:'Engineer',version:3,removed_at:'2026-11-21T08:00:00Z',removal_reason:'Verified departure'};
 assert.equal(x.archivedWorkers({employees:[row]})?.[0].fullName,'Worker One');
 assert.equal(x.archivedWorkers({employees:[row,row]}),null);
 assert.equal(x.archivedWorkers({employees:[{...row,version:0}]}),null);
 assert.equal(x.archivedWorkers({employees:Array.from({length:101},()=>row)}),null);
 const proxy=await read('src/features/workspace/server-api.ts');
 const page=await read('src/app/(workspace)/employees/archived/page.tsx');
 assert.match(proxy,/permittedArchivedEmployeeRead/);
 assert.match(page,/archivedWorkers/);
 assert.doesNotMatch(page,/OperationsFixtures|exampleEmployees/);
});

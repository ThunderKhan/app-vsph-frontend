import {test} from 'node:test';
import assert from 'node:assert/strict';import vm from 'node:vm';import ts from 'typescript';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
async function parser(){
 const src=await read('src/features/operations/CustomerLifecycleContract.ts');
 const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};vm.runInNewContext(js,{exports},{timeout:1000});return exports;
}
test('customer lifecycle command accepts only explicit current-version changes',async()=>{
 const v=await parser();
 const input={action:'status',organizationId:id,status:'suspended',version:2,confirmed:true};
 assert.equal(v.customerLifecycleMutation(input)?.path,'/api/admin-management/customers/'+id+'/lifecycle/status');
 for(const invalid of [{...input,confirmed:false},{...input,version:0},{...input,status:'reopened'},
   {...input,actor:'super_admin'}, {...input,organizationId:'fake'}])
   assert.equal(v.customerLifecycleMutation(invalid),null);
 const terms={action:'entitlement',organizationId:id,applicationId:id,version:2,confirmed:true,
   planCode:'standard',subscriptionStatus:'active',accessStatus:'enabled',startsAt:null,endsAt:null};
 assert.equal(v.customerLifecycleMutation(terms)?.path,'/api/admin-management/customers/'+id+'/lifecycle/entitlement');
 assert.equal(v.customerLifecycleMutation({...terms,planCode:'../../root'}),null);
 assert.equal(v.customerLifecycleMutation({...terms,subscriptionStatus:'trial'}),null);
 assert.equal(v.customerLifecycleConfirmed({version:3,impact:{activeMembers:1,productSessions:0,pendingInvitations:0}},2),true);
 assert.equal(v.customerLifecycleConfirmed({version:2,impact:{activeMembers:1,productSessions:0,pendingInvitations:0}},2),false);
});
test('lifecycle proxy remains same-origin and legacy-owner only',async()=>{
 const proxy=await read('src/app/api/customer-lifecycle-action/route.ts');
 const api=await read('src/features/workspace/server-api.ts');
 assert.match(proxy,/approvedPublicOrigin/);assert.match(proxy,/validPortalSession/);
 assert.match(proxy,/customerLifecycleConfirmed/);assert.match(api,/permittedCustomerImpact/);
 assert.doesNotMatch(proxy,/NEXT_PUBLIC_|OperationsFixtures/);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';import vm from 'node:vm';import ts from 'typescript';
import {readFile} from 'node:fs/promises';
import {entitlementDateInput,entitlementDateValue} from '../src/features/operations/CustomerEntitlementDates.ts';
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

test('customer lifecycle page shows live, version-matched impact before changes',async()=>{
 const page=await read('src/app/(workspace)/admin/customers/[id]/lifecycle/page.tsx');
 const ui=await read('src/features/operations/CustomerLifecycleWorkspace.tsx');
 const model=await parser(),data=model.parseCustomerLifecycle({
  organization:{id,name:'Example customer',status:'active',version:2},
  products:[{id,code:'MUSIC',name:'Music',access_status:'enabled',subscription_status:'active',
    plan_code:'standard',starts_at:'2026-11-21T03:00:00+00:00',ends_at:null}]
 },{version:2,status:'active',impact:{activeMembers:2,productSessions:1,pendingInvitations:3}});
 assert.equal(data?.impact.productSessions,1);
 assert.equal(model.parseCustomerLifecycle({
   organization:{id,name:'Example',status:'active',version:3},products:[]
 },{version:2,status:'active',impact:{activeMembers:0,productSessions:0,pendingInvitations:0}}),null);
 assert.match(page,/parseCustomerLifecycle/);
 assert.match(ui,/Review entitlement change/);
 assert.match(ui,/Confirm lifecycle change/);
 assert.doesNotMatch(page+ui,/OperationsFixtures|localStorage|Math.random/);
});

test('subscription start and end instants survive unchanged local datetime fields',()=>{
 const original='2026-11-21T08:05:42.123456+00:00';
 const visible=entitlementDateInput(original);
 assert.match(visible,/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
 assert.equal(entitlementDateValue(visible,original).value,'2026-11-21T08:05:42.123Z');
 assert.deepEqual(entitlementDateValue('',original),{valid:true,value:null});
 assert.equal(entitlementDateValue('2026-02-30T09:00',null).valid,false);
 assert.equal(entitlementDateValue('garbage',null).valid,false);
 const changed='2026-11-23T12:30';
 assert.equal(entitlementDateValue(changed,original).value,new Date(changed).toISOString());
});
test('customer editor shows real start/end in local datetime controls and does not clear by default',async()=>{
 const ui=await read('src/features/operations/CustomerLifecycleWorkspace.tsx');
 assert.match(ui,/startsAt:entitlementDateInput\(product.startsAt\)/);
 assert.match(ui,/endsAt:entitlementDateInput\(product.endsAt\)/);
 assert.match(ui,/entitlementDateValue\(terms.startsAt,chosen.startsAt\)/);
 assert.match(ui,/Start date\/time \(blank: no start date\)/);
});

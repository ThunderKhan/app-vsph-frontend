import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readBoundedRequestText} from '../src/features/workspace/BoundedRequestBody.ts';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
function request(chunks){
 const body=new ReadableStream({start(controller){
   for(const chunk of chunks)controller.enqueue(new TextEncoder().encode(chunk));
   controller.close();
 }});
 return new Request('http://127.0.0.1/test',{method:'POST',body,duplex:'half'});
}
test('streamed byte limits stop buffering before oversized chunked uploads are consumed',async()=>{
 assert.equal(await readBoundedRequestText(request(['ab','cd']),4),'abcd');
 assert.equal(await readBoundedRequestText(request(['ab','cd','ef']),4),null);
 assert.equal(await readBoundedRequestText(request(['é']),1),null);
 assert.equal(await readBoundedRequestText(request(['é']),2),'é');
 assert.equal(await readBoundedRequestText(request([]),0),'');
});
test('reviewed mutation gateways read body with streaming byte limits',async()=>{
 for(const path of [
  'finance-command','hrms-calendar-action','project-workspace-action',
  'employee-lifecycle-action','customer-lifecycle-action',
  'project-lifecycle-action','github-delivery-action','organization-command',
  'my-work-action','employee-identity-action','outreach-governance'
 ]){
  const source=await read('src/app/api/'+path+'/route.ts');
  assert.match(source,/readBoundedRequestText\(request,\d+\)/,path);
  assert.doesNotMatch(source,/await request\.text\(\)/,path);
 }
});
test('draft/version and first product grant reviews have regression guardrails',async()=>{
 const org=await read('src/app/(workspace)/organizations/page.tsx');
 const members=await read('src/features/organizations/OrganizationWorkspace.tsx');
 const customer=await read('src/features/operations/CustomerLifecycleWorkspace.tsx');
 const finance=await read('src/features/operations/FinanceManageWorkspace.tsx');
 assert.match(org,/key=\{model.organization.id\+':'\+model.organization.version\}/);
 assert.match(members,/key=\{m.user_id\+':'\+m.version\}/);
 assert.match(members,/products.length>12/);
 assert.match(customer,/registeredProducts.filter/);
 assert.match(customer,/No existing product grant/);
 assert.doesNotMatch(finance,/setInvoiceReview\(false\);pending\.current\.invoice=null/);
 assert.doesNotMatch(finance,/setReceiptReview\(false\);pending\.current\.receipt=null/);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';import vm from 'node:vm';import ts from 'typescript';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const uuid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
async function load(){
 const code=await read('src/features/operations/FinanceManageContract.ts');
 const js=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};vm.runInNewContext(js,{exports},{timeout:1000});return exports;
}
test('finance actions use precise integer paise, bounded dates and strict payloads',async()=>{
 const x=await load();
 const invoice={action:'invoice',key:uuid,reference:'INV-2026-11',organizationId:uuid,
   projectId:null,amountPaise:101,dueOn:'2026-12-10',issuedOn:'2026-11-21'};
 assert.equal(x.validateFinanceWrite(invoice)?.path,'/api/finance/invoices');
 for(const bad of [{...invoice,amountPaise:0},{...invoice,amountPaise:0.5},
  {...invoice,dueOn:'2026-11-01'},{...invoice,organizationId:'fake'},
  {...invoice,role:'owner'}])assert.equal(x.validateFinanceWrite(bad),null);
 assert.equal(x.validateFinanceWrite({action:'void',id:uuid,version:2,reason:'Correction required',confirmed:true})?.path,
   '/api/finance/invoices/'+uuid+'/void');
 assert.equal(x.validateFinanceWrite({action:'reverse',id:uuid,reason:'Correction required',confirmed:true})?.path,
   '/api/finance/payments/'+uuid+'/reverse');
 assert.equal(x.validateFinanceWrite({action:'reverse',id:uuid,reason:'bad',confirmed:true}),null);
});
test('finance reads and writes are fixed owner backend operations',async()=>{
 const route=await read('src/app/api/finance-command/route.ts');
 const api=await read('src/features/workspace/server-api.ts');
 assert.match(route,/approvedPublicOrigin/);assert.match(route,/validPortalSession/);
 assert.match(route,/financeWriteConfirmed/);assert.match(api,/permittedFinanceManage/);
 assert.doesNotMatch(route,/NEXT_PUBLIC_/);
});

test('owner ledger management page uses authenticated read endpoints and exact money labels',async()=>{
 const page=await read('src/app/(workspace)/admin/finance/manage/page.tsx');
 const ui=await read('src/features/operations/FinanceManageWorkspace.tsx');
 assert.match(page,/parseFinanceOptions/);assert.match(page,/parseRecentFinance/);
 assert.match(page,/portalApi\('\/api\/finance'\)/);
 assert.match(ui,/amountToPaise/);assert.match(ui,/rupeesFromPaise/);
 assert.match(ui,/pending.current/);assert.match(ui,/Confirm correction/);
 assert.match(ui,/window.location.reload/);
 assert.doesNotMatch(page+ui,/OperationsFixtures|Math.random|localStorage/);
});

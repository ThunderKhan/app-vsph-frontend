import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('Outreach governance preserves original roles and requires trusted owner gateway',async()=>{
 const contract=await read('src/features/operations/OutreachAccessContract.ts');
 const page=await read('src/app/(workspace)/admin/outreach-access/page.tsx');
 const proxy=await read('src/app/api/outreach-governance/route.ts');
 assert.match(contract,/representative','manager','administrator','analyst/);
 assert.match(page,/parseOutreachUsers/);assert.match(page,/parseOutreachGrants/);
 assert.match(proxy,/approvedPublicOrigin/);assert.match(proxy,/validPortalSession/);
 assert.doesNotMatch(proxy,/NEXT_PUBLIC_|localStorage|OperationsFixtures/);
});

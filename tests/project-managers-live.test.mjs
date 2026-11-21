import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const load=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('owner manager overview retains original governance copy and never fabricates counts',async()=>{
 const page=await load('src/app/(workspace)/admin/project-managers/page.tsx');
 const model=await load('src/features/operations/ManagerOverviewContract.ts');
 const api=await load('src/features/workspace/server-api.ts');
 assert.match(page,/parseManagerOverview/);
 assert.match(page,/Manager records unavailable/);
 assert.match(page,/Accountable project owner/);
 assert.match(model,/value.managers.length>500/);
 assert.match(api,/permittedManagerOverview/);
 assert.doesNotMatch(page,/OperationsFixtures|exampleManagers|Math.random|useState/);
});

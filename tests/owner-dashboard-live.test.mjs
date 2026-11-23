import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseOwnerOperations} from '../src/features/workspace/OwnerOperationsContract.ts';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const base={observedAt:'2026-11-21T06:00:00Z',
 customers:{status:'ready',total:3,active:2,suspended:1},
 delivery:{status:'ready',active:1,completed:0,tasks:5,done:2,cancelled:1,blocked:1,recent:[]},
 workforce:{status:'ready',total:4,active:3,onboarding:1},
 products:{status:'ready',total:2,active:2,catalog:[]},
 attention:{status:'ready',overdueTasks:1,overdueMilestones:0,asOf:'2026-11-21',upcoming:[]},
 activity:{status:'ready',items:[]}};
test('owner dashboard accepts only real, consistent backend-operating section counts',()=>{
 assert.equal(parseOwnerOperations(base)?.customers.status,'ready');
 assert.equal(parseOwnerOperations({...base,delivery:{...base.delivery,done:5}}),null);
 assert.equal(parseOwnerOperations({...base,workforce:{...base.workforce,active:10}}),null);
 assert.equal(parseOwnerOperations({...base,attention:{...base.attention,upcoming:Array(6).fill({})}}),null);
 assert.equal(parseOwnerOperations({...base,products:{status:'unavailable'}})?.products.status,'unavailable');
});
test('real owner landing uses separate authorization for finance and operations',async()=>{
 const page=await read('src/app/(workspace)/dashboard/page.tsx');
 const api=await read('src/features/workspace/server-api.ts');
 const ui=await read('src/features/workspace/LiveOwnerOverview.tsx');
 assert.match(page,/parseOwnerOperations/);
 assert.match(page,/parseFinanceOverview/);
 assert.match(page,/platformRole === 'super_admin'/);
 assert.match(api,/permittedOwnerSnapshot/);
 assert.match(ui,/rupeesFromPaise/);
 assert.doesNotMatch(page+ui,/RoleDashboardFixtures|ownerPreviewData|sampleBalance/);
});

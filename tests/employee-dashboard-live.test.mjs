import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseEmployeeActivity} from '../src/features/workspace/EmployeeActivityContract.ts';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const from='2025-11-22',to='2026-11-21';
test('employee completion activity validates exact 365-day session-scoped response',()=>{
 const event={date:'2026-11-20',count:2};
 const model={windowStart:from,windowEnd:to,timeZone:'Asia/Kolkata',
   source:'employee.task_status',total:2,days:[event],projects:[{name:'Work',count:2}]};
 assert.equal(parseEmployeeActivity(model)?.total,2);
 assert.equal(parseEmployeeActivity({...model,total:8}),null);
 assert.equal(parseEmployeeActivity({...model,days:[event,event]}),null);
 assert.equal(parseEmployeeActivity({...model,timeZone:'America/New_York'}),null);
 assert.equal(parseEmployeeActivity({...model,projects:[{name:'Work',count:9}]}),null);
});
test('live employee role dashboard comes from own HRMS and audit evidence, not sample heatmaps',async()=>{
 const page=await read('src/app/(workspace)/dashboard/page.tsx');
 const api=await read('src/features/workspace/server-api.ts');
 const ui=await read('src/features/workspace/LiveEmployeeOverview.tsx');
 assert.match(page,/parseOwnWork/);assert.match(page,/parseEmployeeActivity/);
 assert.match(page,/flags.employee/);assert.match(page,/LiveEmployeeOverview/);
 assert.match(api,/permittedOwnActivity/);
 assert.match(ui,/task completion activity/i);
 assert.doesNotMatch(page+ui,/employeePreviewData|RoleDashboardFixtures|Math.random|sample task completions/);
});

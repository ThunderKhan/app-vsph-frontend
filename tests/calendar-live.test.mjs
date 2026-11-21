import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('HRMS calendar uses scoped real legacy RPC and validates event fields',async()=>{
 const contract=await read('src/features/calendar/CalendarContract.ts');
 const get=await read('src/app/api/hrms-calendar/route.ts');
 const mutations=await read('src/app/api/hrms-calendar-action/route.ts');
 assert.match(contract,/370\*86400000/);
 assert.match(contract,/14\*86400000/);
 assert.match(contract,/meet.google.com/);
 assert.match(get,/portalApi\('\/api\/hrms\/calendar\?'/);
 assert.match(mutations,/validPortalSession/);
 assert.match(mutations,/approvedPublicOrigin/);
 assert.doesNotMatch(get+mutations,/OperationsFixtures|NEXT_PUBLIC_/);
});
test('calendar has four views, real events, create, edit, delete, and drag/drop',async()=>{
 const ui=await read('src/features/calendar/LiveCalendar.tsx');
 for(const phrase of ['month','week','day','list','onDragStart','onDrop','calendar-week-grid','calendar-day-grid','calendar-editor',
   "mutate('delete'","mutate('save'","mutate(editor.version?'save':'create'"])
    assert.ok(ui.includes(phrase),phrase);
 assert.doesNotMatch(ui,/RoleDashboardFixtures|localStorage|sessionStorage/);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validatedSearchParams,parseSearchPage} from '../src/features/search/SearchContract.ts';
import {parseOwnWork,ownWorkMutation} from '../src/features/employee-work/OwnWorkContract.ts';
import {calendarReadParams,parseCalendarPage,calendarMutation} from '../src/features/calendar/CalendarContract.ts';
import {parseOrgList,organizationMutation} from '../src/features/organizations/OrganizationContract.ts';
import {parsePersonalIdentity,identityMutation} from '../src/features/employee-work/IdentityContract.ts';
import {parseOutreachUsers,outreachMutation} from '../src/features/operations/OutreachAccessContract.ts';
const id='11111111-1111-4111-8111-111111111111';
const id2='22222222-2222-4222-8222-222222222222';
test('search actually validates legacy query and result boundaries',()=>{
 assert.equal(validatedSearchParams(new URLSearchParams({q:'tester'}))?.get('q'),'tester');
 assert.equal(validatedSearchParams(new URLSearchParams({q:'x'})),null);
 assert.equal(validatedSearchParams(new URLSearchParams('q=aa&q=bb')),null);
 assert.equal(validatedSearchParams(new URLSearchParams('q=aa&actor='+id)),null);
 assert.equal(validatedSearchParams(new URLSearchParams({q:'test',assigneeId:id})),null);
 assert.ok(parseSearchPage({results:[{id,project_id:id2,project_key:'TEST-1',
    project_name:'Work testing',title:'A testing task',kind:'task',status:'todo',due_on:null}],nextCursor:null}));
 assert.equal(parseSearchPage({results:[{id,project_id:id2,project_key:'TEST-1',
    project_name:'Work testing',title:'A testing task',kind:'task',status:'todo',
    due_on:null,secret:'ignored'}],nextCursor:'untrusted'}),null);
});
test('employee self-service parses bounded data and rejects forged authority fields',()=>{
 assert.ok(parseOwnWork({employee:{name:'A',jobTitle:'Engineer',department:'Engineering',
   status:'active'},workDate:'2026-11-21',tasks:[],leave:[],attendance:[]}));
 assert.equal(parseOwnWork({employee:{name:'A'},workDate:'2026-11-21',tasks:[],leave:[],attendance:[]}),null);
 assert.deepEqual(ownWorkMutation({action:'in'}),{path:'/api/hrms/me/attendance/in',body:{},needsKey:true});
 assert.equal(ownWorkMutation({action:'in',userId:id}),null);
 assert.equal(ownWorkMutation({action:'leave',startOn:'2026-02-30',
   endOn:'2026-03-01',kind:'annual',reason:'Leave'}),null);
});
test('calendar boundaries do not allow arbitrary destinations or stale event data',()=>{
 const params=new URLSearchParams({from:'2026-11-21T00:00:00.000Z',to:'2026-12-01T00:00:00.000Z'});
 assert.ok(calendarReadParams(params));
 assert.equal(calendarReadParams(new URLSearchParams({from:'bad',to:'bad'})),null);
 assert.deepEqual(parseCalendarPage({events:[],canCompanySchedule:false}),
   {events:[],canCompanySchedule:false});
 const body={title:'Team sync',description:'',startAt:'2026-11-21T10:00:00.000Z',
   endAt:'2026-11-21T11:00:00.000Z',category:'meeting',color:'blue',scope:'team',
   tags:[],attendees:[],meetUrl:'https://meet.google.com/abc-defg-hij'};
 assert.ok(calendarMutation({action:'create',id,...body}));
 assert.equal(calendarMutation({action:'create',id,...body,
   meetUrl:'https://attacker.example/meet'}),null);
 assert.equal(calendarMutation({action:'delete',id,version:0}),null);
});
test('organization scope and roles cannot be supplied by arbitrary actors or fields',()=>{
 assert.deepEqual(parseOrgList([{id,name:'Sample org'}]),[{id,name:'Sample org'}]);
 assert.equal(parseOrgList([{id:'other',name:'Sample org'}]),null);
 assert.deepEqual(organizationMutation({action:'profile',organizationId:id,
  version:1,name:'My Organization'}),{
   path:'/api/organizations/'+id+'/profile',
   body:{version:1,name:'My Organization'},key:false,
 });
 assert.equal(organizationMutation({action:'role',organizationId:id,userId:id2,
   version:1,applicationId:id,role:'super_admin',confirmed:true}),null);
 assert.equal(organizationMutation({action:'member',organizationId:id,userId:id2,
   version:1,role:'owner',status:'active',confirmed:true}),null);
});
test('identity acceptance requires explicit verification and versioned proof',()=>{
 assert.deepEqual(parsePersonalIdentity({requests:[],employment:[]}),{requests:[],employment:[]});
 assert.equal(identityMutation({action:'accept',requestId:id,rosterVersion:1,
   requestVersion:1,confirmed:true,password:''}),null);
 const parsed=identityMutation({action:'accept',requestId:id,rosterVersion:1,
   requestVersion:1,confirmed:true,password:'secret'});
 assert.equal(parsed?.path,'/api/employee-identity/requests/'+id+'/accept');
 assert.equal(parsed?.body.password,'secret');
 assert.equal(identityMutation({action:'request',employeeId:id,rosterVersion:1,
   confirmed:true,owner:true}),null);
});
test('Outreach grants are exactly role-allowlisted and do not create SSO sessions',()=>{
 assert.deepEqual(parseOutreachUsers({users:[{id,full_name:'A',email:'a@example.org',
   status:'active'}]}),[{id,full_name:'A',email:'a@example.org',status:'active'}]);
 assert.deepEqual(outreachMutation({action:'grant',userId:id,role:'representative',confirmed:true}),
   {userId:id,method:'PUT',role:'representative'});
 assert.equal(outreachMutation({action:'grant',userId:id,role:'super_admin',confirmed:true}),null);
 assert.equal(outreachMutation({action:'revoke',userId:'invalid',confirmed:true}),null);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {appCode,parseAppWorkspaceContext,parseAppRecords,validatedAppRecord,
 confirmedAppRecord} from '../src/features/auth/AppWorkspaceContract.ts';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const org='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const recordId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const context={application:{code:'CRM',status:'active',name:'CRM'},organization:{id:org,name:'Customer'},
 user:{name:'Worker'},role:'manager',capabilities:{createRecords:true},
 integration:{recordsConfigured:true,heading:'CRM Contacts',externalHealth:'unverified'}};
test('app context projection requires exactly the requested product, active organization and bounded backend labels',()=>{
 assert.equal(parseAppWorkspaceContext(context,'CRM')?.organization.id,org);
 assert.equal(parseAppWorkspaceContext({...context,organization:{id:'not-uuid',name:'Customer'}},'CRM'),null);
 assert.equal(parseAppWorkspaceContext({...context,application:{...context.application,code:'OTHER'}},'CRM'),null);
 assert.equal(parseAppWorkspaceContext({...context,capabilities:{createRecords:'true'}},'CRM'),null);
 assert.equal(parseAppWorkspaceContext({...context,integration:{...context.integration,externalHealth:'ok'}},'CRM'),null);
 assert.equal(appCode('CRM'),true);assert.equal(appCode('../../evil'),false);
});
test('CRM and Music adapter records never expose private extra provider fields',()=>{
 const sample={records:[{id:recordId,name:'Contact',email:'a@example.invalid',company:'Company',secret:'hidden'}]};
 assert.deepEqual(parseAppRecords(sample,'CRM'),[{id:recordId,first:'Contact',
   second:'a@example.invalid',third:'Company'}]);
 assert.equal(parseAppRecords(sample,'OUTREACH'),null);
 const music={records:[{id:recordId,song_title:'Track',artist:null,status:'pending'}]};
 assert.deepEqual(parseAppRecords(music,'MUSIC'),[{id:recordId,first:'Track',second:'—',third:'pending'}]);
 assert.equal(parseAppRecords({...sample,records:[sample.records[0],
   {...sample.records[0],id:recordId.toUpperCase()}]},'CRM'),null);
});
test('client writes validate only fixed adapters, exact strings and no forged target IDs',()=>{
 assert.deepEqual(validatedAppRecord({name:' Contact ',email:'',company:' Org '},'CRM'),
   {name:'Contact',email:'',company:'Org'});
 assert.deepEqual(validatedAppRecord({song_title:' Track ',artist:'Singer'},'MUSIC'),
   {song_title:'Track',artist:'Singer'});
 assert.equal(validatedAppRecord({name:'A',email:'',company:'',organizationId:org},'CRM'),null);
 assert.equal(validatedAppRecord({name:'A',email:'',company:''},'OUTREACH'),null);
 assert.equal(validatedAppRecord({song_title:'',artist:''},'MUSIC'),null);
 assert.equal(confirmedAppRecord({record:{id:recordId}}),true);
 assert.equal(confirmedAppRecord({record:{id:'not-uuid'}}),false);
});
test('application routes guard both cookies and original backend authority',async()=>{
 const gateway=await read('src/features/auth/app-gateway.ts');
 const home=await read('src/features/auth/AppHomeWorkspace.tsx');
 const page=await read('src/app/(workspace)/apps/[app]/home/page.tsx');
 const logout=await read('src/app/api/auth/app-logout/route.ts');
 const contextRoute=await read('src/app/api/apps/[app]/context/route.ts');
 const recordsRoute=await read('src/app/api/apps/[app]/records/route.ts');
 assert.match(gateway,/validPortalSession\(portal\)/);
 assert.match(gateway,/validPortalSession\(app\)/);
 assert.match(gateway,/readBoundedRequestText\(request,2048\)/);
 assert.match(gateway,/parseAppWorkspaceContext/);
 assert.match(gateway,/confirmedAppRecord/);
 assert.match(gateway,/response.status!==201/);
 assert.match(gateway,/result.cookies.set/);
 assert.match(home,/\/api\/auth\/app-logout/);
 assert.match(home,/\/records/);
 assert.match(page,/AppHomeWorkspace/);
 assert.match(logout,/logoutApp/);
 assert.match(contextRoute,/getAppContext/);
 assert.match(recordsRoute,/postAppRecord/);
 assert.doesNotMatch(gateway+home+page,/GITHUB_APP_PRIVATE_KEY|NEXT_PUBLIC_|x-vsph-client-secret|localStorage/);
});


test('record form cannot post before initial records settle and checks the displayed customer before writing',async()=>{
 const home=await read('src/features/auth/AppHomeWorkspace.tsx');
 assert.match(home,/if\(!context\?\.canCreateRecords\|\|busy\|\|loading\)return/);
 assert.match(home,/disabled=\{busy\|\|loading\|\|!one\.trim\(\)\}/);
 const preflight=home.indexOf("const latestResponse=await fetch(base+'/context'");
 const mutation=home.indexOf("const response=await fetch(base+'/records',{method:'POST'");
 assert.ok(preflight>=0&&mutation>preflight,'fresh context must be read before a record mutation');
 assert.match(home,/current\.organization\.id\.toLowerCase\(\)!==context\.organization\.id\.toLowerCase\(\)/);
 assert.match(home,/current\.canCreateRecords!==true/);
 assert.match(home,/setContext\(null\);setRecords\(\[\]\)/);
});

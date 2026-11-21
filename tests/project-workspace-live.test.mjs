import {test} from 'node:test';
import assert from 'node:assert/strict';
import {projectWorkspaceMutation,parseProjectWorkspace,safeResourceUrl} from '../src/features/projects/ProjectWorkspaceContract.ts';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
test('project workspace validates all seven version-locked actions',()=>{
 const base={projectId:id,version:2};
 const commands=[
  {action:'checklist-add',milestoneId:id,title:'Review milestone',assigneeId:null},
  {action:'checklist-toggle',itemId:id,completed:true},
  {action:'risk-add',title:'Risk item',severity:'high'},
  {action:'risk-resolve',id,resolved:true},
  {action:'resource-add',label:'Design artifact',url:'https://docs.example.test/design',category:'design',shared:false},
  {action:'resource-archive',id},
  {action:'update-publish',summary:'Sprint delivery is proceeding normally',health:'on_track',nextSteps:'',shared:false}
 ];
 for(const cmd of commands)
  assert.equal(projectWorkspaceMutation({...base,...cmd})?.path,
    '/api/projects/'+id+'/workspace/'+cmd.action,cmd.action);
 assert.equal(projectWorkspaceMutation({...base,...commands[0],role:'admin'}),null);
 assert.equal(projectWorkspaceMutation({...base,...commands[0],assigneeId:'../../other'}),null);
 assert.equal(projectWorkspaceMutation({...base,...commands[4],url:'javascript:alert(1)'}),null);
 assert.equal(projectWorkspaceMutation({...base,...commands[6],version:0}),null);
 assert.equal(safeResourceUrl('https://docs.example.test/design'),true);
 assert.equal(safeResourceUrl('https://user:pass@docs.example.test/design'),false);
});
test('workspace returns only verified role-scoped records and rejects unbounded collections',()=>{
 assert.deepEqual(parseProjectWorkspace({checklist:[],risks:[],resources:[],updates:[],role:'client',
   canManage:false})?.checklist,[]);
 assert.equal(parseProjectWorkspace({checklist:[],risks:[],resources:[],updates:[],role:'client',
   canManage:true}),null);
 assert.equal(parseProjectWorkspace({checklist:[],risks:Array.from({length:101},()=>({})),
   resources:[],updates:[],role:'manager',canManage:true}),null);
});
test('project workspace mutations use fixed paths and backend authorization',async()=>{
 const proxy=await read('src/app/api/project-workspace-action/route.ts');
 const api=await read('src/features/workspace/server-api.ts');
 assert.match(api,/permittedProjectWorkspace/);
 assert.match(proxy,/approvedPublicOrigin/);
 assert.match(proxy,/validPortalSession/);
 assert.doesNotMatch(proxy,/NEXT_PUBLIC_|OperationsFixtures|ProjectFixtures/);
});

test('delivery screen uses only backend-authorized project detail and workspace records',async()=>{
 const page=await read('src/app/(workspace)/projects/[id]/workspace/page.tsx');
 const ui=await read('src/features/projects/ProjectWorkspaceLive.tsx');
 assert.match(page,/parseProjectDetail/);
 assert.match(page,/parseProjectWorkspace/);
 assert.match(page,/workspace.role!==project.role/);
 for(const action of ['checklist-add','checklist-toggle','risk-add','risk-resolve',
   'resource-add','resource-archive','update-publish'])assert.ok(ui.includes(action),action);
 assert.match(ui,/assigneeId===actorId/);
 assert.doesNotMatch(page+ui,/ProjectFixtures|OperationsFixtures|localStorage|sessionStorage/);
});

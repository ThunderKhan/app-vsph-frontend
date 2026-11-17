import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
async function moduleFromTs(path,prelude=''){
  const source=prelude+(await read(path)).replace(
    "import { projectIdPattern } from './ProjectLiveContract';",'');
  const output=ts.transpileModule(source,{compilerOptions:{
    module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
  }}).outputText;
  const context={exports:{}};
  vm.runInNewContext(output,context,{timeout:1500});
  return context.exports;
}
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const user='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const task='cccccccc-cccc-4ccc-8ccc-cccccccccccc';

test('live detail parser rejects malformed backend payloads and duplicate records',async()=>{
  const {parseLiveProject}=await moduleFromTs('src/features/projects/ProjectLiveContract.ts');
  const input={
    project:{id,key:'PROJECT-1',name:'Work',description:'',owner_id:user,version:1,
      status:'active',priority:'normal'},role:'manager',
    members:[{user_id:user,full_name:'Builder',role:'manager',status:'active',team:'Engineering'}],
    tasks:[{id:task,title:'Implement',description:'',status:'todo',priority:'normal',
      assignee_id:user,due_on:null,shared:false}],
    comments:[{id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',actor_id:user,task_id:task,
      body:'Please review',created_at:'2026-11-17T05:00:00Z',shared:false}]
  };
  const result=parseLiveProject(input);
  assert.equal(result?.id,id);
  assert.equal(result?.tasks[0].assigneeId,user);
  assert.equal(result?.comments[0].taskId,task);
  assert.equal(parseLiveProject({...input,tasks:[...input.tasks,...input.tasks]}),null);
  assert.equal(parseLiveProject({...input,role:'admin'}),null);
  assert.equal(parseLiveProject({...input,project:{...input.project,version:0}}),null);
  assert.equal(parseLiveProject({...input,comments:[{...input.comments[0],body:''}]}),null);
});

test('workforce parser matches linked internal staff projection and fails closed',async()=>{
  const {parseWorkforce}=await moduleFromTs('src/features/projects/ProjectMemberEligibility.ts');
  const row={user_id:user,full_name:'Builder',department:'Engineering',project_role:null,
    membership_status:null,open_tasks:0};
  const good=parseWorkforce({staff:[row],canAssign:true,canGovernManagers:false});
  assert.equal(good?.staff[0].userId,user);
  assert.equal(parseWorkforce({staff:[row,row],canAssign:true,canGovernManagers:false}),null);
  assert.equal(parseWorkforce({staff:[{...row,open_tasks:-1}],canAssign:true,canGovernManagers:false}),null);
});

test('project action adapter rejects unapproved operations and unsafe payloads',async()=>{
  const {projectMutation}=await moduleFromTs('src/features/projects/ProjectMutationContract.ts',
    "const projectIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;\n");
  const member={version:3,userId:user,role:'contributor',team:'Engineering'};
  const accepted=projectMutation(id,'member-assign',member);
  assert.equal(accepted?.path,'/api/projects/'+id+'/workforce/assign');
  assert.equal(accepted?.method,'POST');
  assert.equal(projectMutation(id,'member-assign',{...member,role:'client'}),null);
  assert.equal(projectMutation(id,'member-assign',{...member,extra:true}),null);
  assert.equal(projectMutation(id,'task-status',{version:2,taskId:task,status:'done'})?.method,'PATCH');
  assert.equal(projectMutation(id,'task-assign',{version:2,taskId:task,assigneeId:null})?.body.assigneeId,null);
  assert.equal(projectMutation(id,'comment-create',{version:2,taskId:task,body:'Review',
    shared:true}),null);
  assert.equal(projectMutation(id,'comment-create',{version:2,taskId:task,body:'Review',
    shared:false})?.path,'/api/projects/'+id+'/comments');
  assert.equal(projectMutation(id,'not-an-action',{version:2,userId:user}),null);
  assert.equal(projectMutation('../bad','member-remove',{version:2,userId:user}),null);
});

test('live project UI uses server authorized data and a CSRF-guarded mutation proxy',async()=>{
  const loader=await read('src/features/projects/project-detail-server.ts');
  const readApi=await read('src/features/workspace/server-api.ts');
  const proxy=await read('src/app/api/project-actions/[id]/[operation]/route.ts');
  const ui=await read('src/features/projects/LiveProjectWorkspace.tsx');
  const page=await read('src/app/(workspace)/projects/[id]/page.tsx');
  const list=await read('src/app/(workspace)/projects/page.tsx');
  for(const word of ["portalApi('/api/projects/'+id)","portalApi('/api/projects/'+id+'/workforce')",
    'parseLiveProject','parseWorkforce'])assert.ok(loader.includes(word),word);
  assert.match(readApi,/const permittedDetail/);
  assert.match(proxy,/request.headers.get\('origin'\)!==publicUrl/);
  assert.match(proxy,/request.cookies.get\('vsph.portal.sid'\)/);
  assert.match(proxy,/projectMutation\(id,operation,body\)/);
  assert.match(proxy,/response.status===409/);
  assert.match(ui,/window.location.reload\(\)/);
  assert.match(ui,/mutate\('member-assign'/);
  assert.match(ui,/mutate\('member-remove'/);
  assert.match(ui,/mutate\('task-assign'/);
  assert.match(ui,/mutate\('task-status'/);
  assert.match(ui,/mutate\('comment-create'/);
  assert.match(page,/loadLiveProject\(id\)/);
  assert.match(list,/href=\{'\/projects\/'\+project.id\}/);
  assert.doesNotMatch(loader+proxy+ui,/ProjectFixtures|exampleProjects|localStorage|sessionStorage/);
});

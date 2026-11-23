import {test} from 'node:test';
import assert from 'node:assert/strict';
import {projectLifecycleMutation,projectLifecycleConfirmed} from '../src/features/projects/ProjectLifecycleContract.ts';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
test('project lifecycle validates original archive/delete version and exact key contract',()=>{
 const cmd={operation:'archive',projectId:id,version:2,key:'PORTAL-2',confirmed:true};
 assert.equal(projectLifecycleMutation(cmd)?.path,'/api/projects/'+id+'/lifecycle/archive');
 for(const bad of [{...cmd,key:'wrong'}, {...cmd,version:0},{...cmd,confirmed:false},
   {...cmd,role:'super_admin'}, {...cmd,projectId:'../../../danger'}, {...cmd,operation:'restore'}])
   assert.equal(projectLifecycleMutation(bad),null);
 assert.equal(projectLifecycleMutation({...cmd,operation:'delete'})?.body.key,'PORTAL-2');
 assert.equal(projectLifecycleConfirmed({id,archived:true},'archive',id,'PORTAL-2'),true);
 assert.equal(projectLifecycleConfirmed({id,deleted:true,key:'PORTAL-2'},'delete',id,'PORTAL-2'),true);
 assert.equal(projectLifecycleConfirmed({id,deleted:true,key:'WRONG'},'delete',id,'PORTAL-2'),false);
});
test('project lifecycle remains owner-only and dependent on backend rejection',async()=>{
 const route=await read('src/app/api/project-lifecycle-action/route.ts');
 const page=await read('src/app/(workspace)/projects/[id]/lifecycle/page.tsx');
 const ui=await read('src/features/projects/ProjectLifecycleWorkspace.tsx');
 assert.match(route,/approvedPublicOrigin/);
 assert.match(route,/validPortalSession/);
 assert.match(route,/projectLifecycleConfirmed/);
 assert.match(page,/platformRole!=='super_admin'/);
 assert.match(ui,/enteredKey!==project.key/);
 assert.match(ui,/Any retained tasks, milestones, finance/);
 assert.doesNotMatch(page+route,/OperationsFixtures|ProjectFixtures|NEXT_PUBLIC_|localStorage/);
});

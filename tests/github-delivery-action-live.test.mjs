import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deliveryCommand,parseRepositoryDiscovery,deliveryConfirmation} from '../src/features/projects/DeliveryMutationContract.ts';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
test('GitHub operations use fixed names and reject arbitrary provider input',()=>{
 const base={projectId:id};
 const calls=[
  {action:'approve',installationId:123},
  {action:'revoke',installationId:123},
  {action:'connect',installationId:123,repositoryId:451},
  {action:'sync',connectionId:id,version:2},
  {action:'disconnect',connectionId:id,version:2},
  {action:'link',recordId:id,workKind:'task',workId:id}
 ];
 for(const c of calls)assert.ok(deliveryCommand({...base,...c}),c.action);
 for(const c of [{...calls[0],token:'shh'}, {...calls[2],repositoryId:0},
  {...calls[5],workKind:'external'}, {...calls[3],connectionId:'foo'}])
   assert.equal(deliveryCommand({...base,...c}),null);
});
test('repository discovery is bounded and contains only approved repo summaries',()=>{
 const raw={repositories:[{repositoryId:123,fullName:'group/repo',private:true}],nextPage:null,truncated:false};
 assert.equal(parseRepositoryDiscovery(raw)?.repositories[0].fullName,'group/repo');
 assert.equal(parseRepositoryDiscovery({...raw,repositories:[{...raw.repositories[0],fullName:'../../evil'}]}),null);
 assert.equal(parseRepositoryDiscovery({...raw,nextPage:51}),null);
});
test('GitHub delivery writes and reads never expose credentials or accept arbitrary URLs',async()=>{
 const api=await read('src/features/workspace/server-api.ts');
 const post=await read('src/app/api/github-delivery-action/route.ts');
 const get=await read('src/app/api/github-repositories/route.ts');
 assert.match(api,/permittedGithubRepoDiscovery/);
 assert.match(post,/validPortalSession/);
 assert.match(post,/approvedPublicOrigin/);
 assert.match(get,/parseRepositoryDiscovery/);
 assert.doesNotMatch(post+get,/GITHUB_APP_PRIVATE_KEY|NEXT_PUBLIC_|x-vsph-client-secret/);
});

test('engineering UI wires all provider-governed commands but never embeds a GitHub token',async()=>{
 const ui=await read('src/features/projects/EngineeringDeliveryActions.tsx');
 const parent=await read('src/features/projects/EngineeringDeliveryWorkspace.tsx');
 for(const action of ["action:'approve'","action:'revoke'","action:'connect'","action:'sync'",
   "action:'disconnect'","action:'link'"])assert.ok(ui.includes(action),action);
 assert.match(parent,/EngineeringDeliveryActions/);
 assert.match(ui,/parseRepositoryDiscovery/);
 assert.doesNotMatch(ui,/GITHUB_APP_PRIVATE_KEY|Authorization:|Bearer |NEXT_PUBLIC_/);
});

test('provider gateway distinguishes genuine mutation confirmation, deferred work and failed sync',()=>{
 assert.equal(deliveryConfirmation({saved:true},'connect'),'confirmed');
 assert.equal(deliveryConfirmation({message:'not confirmed'},'connect'),'invalid');
 assert.equal(deliveryConfirmation({processed:false},'sync',id),'deferred');
 assert.equal(deliveryConfirmation({processed:true,connectionId:id,records:13},'sync',id),'confirmed');
 assert.equal(deliveryConfirmation({processed:true,connectionId:id,error:'provider_timeout'},'sync',id),'provider-failed');
 assert.equal(deliveryConfirmation({processed:true,connectionId:id,records:3},'sync','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),'invalid');
 assert.equal(deliveryConfirmation({processed:true,connectionId:id,records:101},'sync',id),'invalid');
});
test('GitHub backend response errors are not relabeled successful by the proxy',async()=>{
 const src=await read('src/app/api/github-delivery-action/route.ts');
 const ui=await read('src/features/projects/EngineeringDeliveryActions.tsx');
 assert.match(src,/deliveryConfirmation\(result,command.action/);
 assert.match(src,/confirmed==='provider-failed'/);
 assert.match(src,/confirmed==='deferred'/);
 assert.match(ui,/data.processed===false/);
});

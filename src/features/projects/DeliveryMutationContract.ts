/** Exact GitHub delivery commands. No arbitrary provider URL, token or installation secret. */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const obj=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const id=(x:unknown):x is string=>typeof x==='string'&&uuid.test(x);
const positive=(x:unknown):x is number=>Number.isSafeInteger(x)&&(x as number)>0;
const exact=(x:Record<string,unknown>,keys:string[])=>Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
export type DeliveryCommand={path:string;body:Record<string,unknown>;action:string};
export function deliveryCommand(raw:unknown):DeliveryCommand|null{
 if(!obj(raw)||!id(raw.projectId)||typeof raw.action!=='string')return null;
 const base='/api/projects/'+raw.projectId+'/delivery';
 if(raw.action==='approve'){
  if(!exact(raw,['action','projectId','installationId'])||!positive(raw.installationId))return null;
  return {action:raw.action,path:base+'/installations',body:{installationId:raw.installationId}};
 }
 if(raw.action==='revoke'){
  if(!exact(raw,['action','projectId','installationId'])||!positive(raw.installationId))return null;
  return {action:raw.action,path:base+'/installations/revoke',body:{installationId:raw.installationId}};
 }
 if(raw.action==='connect'){
  if(!exact(raw,['action','projectId','installationId','repositoryId'])||
    !positive(raw.installationId)||!positive(raw.repositoryId))return null;
  return {action:raw.action,path:base+'/connections',
    body:{installationId:raw.installationId,repositoryId:raw.repositoryId}};
 }
 if(raw.action==='sync'||raw.action==='disconnect'){
  if(!exact(raw,['action','projectId','connectionId','version'])||
    !id(raw.connectionId)||!positive(raw.version))return null;
  return {action:raw.action,path:base+'/connections/'+raw.connectionId+'/'+raw.action,
    body:{version:raw.version}};
 }
 if(raw.action==='link'){
  if(!exact(raw,['action','projectId','recordId','workKind','workId'])||
    !id(raw.recordId)||!id(raw.workId)||!['task','milestone'].includes(String(raw.workKind)))return null;
  return {action:raw.action,path:base+'/links',
    body:{recordId:raw.recordId,[raw.workKind==='task'?'taskId':'milestoneId']:raw.workId}};
 }
 return null;
}
export type DiscoverableRepository={repositoryId:number;fullName:string;private:boolean};
export function parseRepositoryDiscovery(raw:unknown):{
 repositories:DiscoverableRepository[];nextPage:number|null;truncated:boolean;
}|null{
 if(!obj(raw)||!Array.isArray(raw.repositories)||raw.repositories.length>100||
   !(raw.nextPage===null||positive(raw.nextPage)&&(raw.nextPage as number)<=50)||
   typeof raw.truncated!=='boolean')return null;
 const repositories:DiscoverableRepository[]=[],seen=new Set<number>();
 for(const r of raw.repositories){
  if(!obj(r)||!positive(r.repositoryId)||seen.has(r.repositoryId)||
    typeof r.fullName!=='string'||r.fullName.length>250||
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(r.fullName)||
    typeof r.private!=='boolean')return null;
  seen.add(r.repositoryId);
  repositories.push({repositoryId:r.repositoryId,fullName:r.fullName,private:r.private});
 }
 return {repositories,nextPage:raw.nextPage as number|null,truncated:raw.truncated};
}

/**
 * The legacy RPC returns {saved:true} for five mutations.
 * Synchronization returns a distinct, potentially failed provider-page outcome.
 * Never turn an arbitrary HTTP 200 object into a successful application mutation.
 */
export type DeliveryConfirmation='confirmed'|'deferred'|'provider-failed'|'invalid';
export function deliveryConfirmation(raw:unknown,action:string,connectionId?:string):DeliveryConfirmation{
 if(!obj(raw))return 'invalid';
 if(action!=='sync'){
  return ['approve','revoke','connect','disconnect','link'].includes(action)&&
    raw.saved===true?'confirmed':'invalid';
 }
 if(raw.processed===false&&Object.keys(raw).length===1)return 'deferred';
 if(raw.processed!==true||typeof raw.connectionId!=='string'||!id(raw.connectionId)||
    !connectionId||raw.connectionId.toLowerCase()!==connectionId.toLowerCase())return 'invalid';
 if(typeof raw.error==='string'&&/^[a-z][a-z0-9_]{0,99}$/.test(raw.error))
   return 'provider-failed';
 if(raw.error!==undefined||!Number.isSafeInteger(raw.records)||
    (raw.records as number)<0||(raw.records as number)>100)return 'invalid';
 return 'confirmed';
}

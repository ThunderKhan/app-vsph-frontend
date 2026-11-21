/** Backend-authorized GitHub delivery records; never surface tokens or provider payloads. */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const obj=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const id=(v:unknown):v is string=>typeof v==='string'&&uuid.test(v);
const text=(v:unknown,max:number):v is string=>typeof v==='string'&&v.length<=max;
const time=(v:unknown):v is string=>typeof v==='string'&&!Number.isNaN(Date.parse(v));
const optionalTime=(v:unknown)=>v===null||time(v);
const positive=(v:unknown):v is number=>Number.isSafeInteger(v)&&(v as number)>0;
export function safeGithubUrl(v:unknown):v is string{
 if(typeof v!=='string'||v.length>1000)return false;
 try{const url=new URL(v);
  return url.protocol==='https:'&&url.hostname==='github.com'&&!url.username&&!url.password&&!url.port;
 }catch{return false;}
}
export type GitInstallation={installationId:number;accountLogin:string;status:string};
export type GitConnection={id:string;fullName:string;defaultBranch:string;status:string;
 private:boolean;version:number;lastSuccessAt:string|null;nextSyncAt:string;lastError:string|null;
 checkpoint:{kind:number;page:number}};
export type GitRecord={id:string;kind:string;title:string;url:string;state:string;
 sourceAt:string;observedAt:string};
export type GitEvent={observedAt:string;kind:string;state:string;title:string;url:string};
export type GitLink={recordId:string;taskId:string|null;milestoneId:string|null};
export type DeliveryData={configured:boolean;providerMode:string;vercelReason:string;
 installations:GitInstallation[];connections:GitConnection[];records:GitRecord[];
 events:GitEvent[];links:GitLink[]};
export function parseDeliveryData(value:unknown):DeliveryData|null{
 if(!obj(value)||typeof value.configured!=='boolean'||
   !['isolated-fixture','live-unverified'].includes(String(value.providerMode))||
   !obj(value.vercel)||value.vercel.enabled!==false||!text(value.vercel.reason,150)||
   !Array.isArray(value.installations)||value.installations.length>50||
   !Array.isArray(value.connections)||value.connections.length>20||
   !Array.isArray(value.records)||value.records.length>200||
   !Array.isArray(value.events)||value.events.length>200||
   !Array.isArray(value.links)||value.links.length>200)return null;
 const installations:GitInstallation[]=[],connections:GitConnection[]=[],records:GitRecord[]=[],
  events:GitEvent[]=[],links:GitLink[]=[];
 const unique=(x:string,seen:Set<string>)=>{if(seen.has(x))return false;seen.add(x);return true;};
 const ids=new Set<string>(),repos=new Set<string>(),recordIds=new Set<string>(),linked=new Set<string>();
 for(const r of value.installations){
  if(!obj(r)||!positive(r.installation_id)||!text(r.account_login,100)||
     !['active','revoked'].includes(String(r.status))||
     !unique(String(r.installation_id),ids))return null;
  installations.push({installationId:r.installation_id,accountLogin:r.account_login,status:r.status as string});
 }
 for(const c of value.connections){
  if(!obj(c)||!id(c.id)||!unique(c.id.toLowerCase(),repos)||
     !text(c.full_name,250)||!text(c.default_branch,250)||
     !['active','disconnected','attention'].includes(String(c.status))||
     typeof c.private!=='boolean'||!positive(c.version)||
     !optionalTime(c.last_success_at)||!time(c.next_sync_at)||
     !(c.last_error===null||text(c.last_error,500))||
     !obj(c.checkpoint)||!Number.isSafeInteger(c.checkpoint.kind)||
     !positive(c.checkpoint.page))return null;
  connections.push({id:c.id,fullName:c.full_name,defaultBranch:c.default_branch,
    status:c.status as string,private:c.private,version:c.version as number,
    lastSuccessAt:c.last_success_at as string|null,nextSyncAt:c.next_sync_at,
    lastError:c.last_error as string|null,
    checkpoint:{kind:c.checkpoint.kind as number,page:c.checkpoint.page as number}});
 }
 for(const r of value.records){
  if(!obj(r)||!id(r.id)||!unique(r.id.toLowerCase(),recordIds)||
     !['commit','contributor','pull','workflow','check','release','tag'].includes(String(r.kind))||
     !text(r.title,500)||!safeGithubUrl(r.url)||!text(r.state,100)||
     !time(r.source_at)||!time(r.observed_at))return null;
  records.push({id:r.id,kind:r.kind as string,title:r.title,url:r.url,state:r.state,
   sourceAt:r.source_at,observedAt:r.observed_at});
 }
 for(const e of value.events){
  if(!obj(e)||!time(e.observed_at)||!obj(e.snapshot)||
     !['commit','contributor','pull','workflow','check','release','tag'].includes(String(e.snapshot.kind))||
     !text(e.snapshot.title,500)||!text(e.snapshot.state,100)||
     !safeGithubUrl(e.snapshot.url))return null;
  events.push({observedAt:e.observed_at,kind:e.snapshot.kind as string,
    state:e.snapshot.state as string,title:e.snapshot.title,url:e.snapshot.url});
 }
 for(const l of value.links){
  if(!obj(l)||!id(l.record_id)||!unique(l.record_id.toLowerCase(),linked)||
     !((l.task_id===null&&id(l.milestone_id))||(l.milestone_id===null&&id(l.task_id))))return null;
  links.push({recordId:l.record_id,taskId:l.task_id as string|null,
    milestoneId:l.milestone_id as string|null});
 }
 return {configured:value.configured,providerMode:value.providerMode as string,
   vercelReason:value.vercel.reason as string,installations,connections,records,events,links};
}

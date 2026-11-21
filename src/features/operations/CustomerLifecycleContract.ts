/** Owner-only customer lifecycle and atomic grant/terms migration contracts. */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const obj=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const id=(v:unknown):v is string=>typeof v==='string'&&uuid.test(v);
const positive=(v:unknown):v is number=>Number.isSafeInteger(v)&&(v as number)>0&&(v as number)<=2147483647;
const count=(v:unknown):v is number=>Number.isSafeInteger(v)&&(v as number)>=0;
const text=(v:unknown,max=150):v is string=>typeof v==='string'&&!!v.trim()&&v.length<=max&&
 !/[\u0000-\u001f\u007f]/.test(v);
const iso=(v:unknown):v is string=>typeof v==='string'&&v.length<=35&&
 /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(v)&&!Number.isNaN(Date.parse(v));
const exact=(v:Record<string,unknown>,keys:string[])=>Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
export type LifecycleStatus='active'|'suspended'|'closed';
export type CustomerEntitlement=ReadOnlyProduct;
type ReadOnlyProduct={id:string;name:string;code:string;accessStatus:string;
 subscriptionStatus:string|null;planCode:string|null;startsAt:string|null;endsAt:string|null};
export type CustomerLifecycleData={
 organization:{id:string;name:string;status:LifecycleStatus;version:number};
 products:CustomerEntitlement[];
 impact:{activeMembers:number;productSessions:number;pendingInvitations:number};
};
export function parseCustomerLifecycle(detail:unknown,preview:unknown):CustomerLifecycleData|null{
 if(!obj(detail)||!obj(detail.organization)||!obj(preview)||!obj(preview.impact))return null;
 const o=detail.organization,i=preview.impact;
 if(!id(o.id)||!text(o.name)||!['active','suspended','closed'].includes(String(o.status))||
    !positive(o.version)||o.version!==preview.version||o.status!==preview.status||
    !count(i.activeMembers)||!count(i.productSessions)||!count(i.pendingInvitations)||
    !Array.isArray(detail.products)||detail.products.length>100)return null;
 const products:CustomerEntitlement[]=[],seen=new Set<string>();
 for(const p of detail.products){
  if(!obj(p)||!id(p.id)||seen.has(p.id.toLowerCase())||
     !text(p.name)||!text(p.code,40)||
     !['enabled','suspended','revoked'].includes(String(p.access_status))||
     !(p.subscription_status===null||['trial','active','past_due','cancelled','expired'].includes(String(p.subscription_status)))||
     !(p.plan_code===null||typeof p.plan_code==='string'&&p.plan_code.length<=60)||
     !(p.starts_at===null||iso(p.starts_at))||
     !(p.ends_at===null||iso(p.ends_at)))return null;
  seen.add(p.id.toLowerCase());
  products.push({id:p.id,name:p.name,code:p.code,accessStatus:p.access_status,
    subscriptionStatus:p.subscription_status as string|null,
    planCode:p.plan_code as string|null,
    startsAt:p.starts_at as string|null,endsAt:p.ends_at as string|null});
 }
 return {organization:{id:o.id,name:o.name,status:o.status as LifecycleStatus,version:o.version},
   products,impact:{activeMembers:i.activeMembers,productSessions:i.productSessions,
    pendingInvitations:i.pendingInvitations}};
}
export function customerLifecycleMutation(raw:unknown):{path:string;body:Record<string,unknown>;version:number}|null{
 if(!obj(raw)||!id(raw.organizationId)||!positive(raw.version)||raw.confirmed!==true)return null;
 const prefix='/api/admin-management/customers/'+raw.organizationId+'/lifecycle/';
 if(raw.action==='status'){
  if(!exact(raw,['action','organizationId','status','version','confirmed'])||
     !['active','suspended','closed'].includes(String(raw.status)))return null;
  return {path:prefix+'status',body:{status:raw.status,version:raw.version,confirmed:true},
   version:raw.version as number};
 }
 if(raw.action==='entitlement'){
  if(!exact(raw,['action','organizationId','applicationId','planCode','subscriptionStatus',
    'accessStatus','startsAt','endsAt','version','confirmed'])||
    !id(raw.applicationId)||typeof raw.planCode!=='string'||
    !/^[a-z0-9][a-z0-9_-]{0,59}$/.test(raw.planCode)||
    !['trial','active','past_due','cancelled','expired'].includes(String(raw.subscriptionStatus))||
    !['enabled','suspended','revoked'].includes(String(raw.accessStatus))||
    !(raw.startsAt===null||iso(raw.startsAt))||!(raw.endsAt===null||iso(raw.endsAt))||
    (raw.startsAt!==null&&raw.endsAt!==null&&Date.parse(raw.endsAt)<=Date.parse(raw.startsAt))||
    (raw.subscriptionStatus==='trial'&&(raw.endsAt===null||Date.parse(raw.endsAt)<=Date.now())))return null;
  return {path:prefix+'entitlement',
    body:{applicationId:raw.applicationId,planCode:raw.planCode,
      subscriptionStatus:raw.subscriptionStatus,accessStatus:raw.accessStatus,
      startsAt:raw.startsAt,endsAt:raw.endsAt,version:raw.version,confirmed:true},
    version:raw.version as number};
 }
 return null;
}
export function customerLifecycleConfirmed(result:unknown,currentVersion:number){
 return obj(result)&&positive(result.version)&&result.version===currentVersion+1&&
    obj(result.impact)&&count(result.impact.activeMembers)&&
    count(result.impact.productSessions)&&count(result.impact.pendingInvitations);
}

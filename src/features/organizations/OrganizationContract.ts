/** Customer organization workspace from legacy service-only organization_command RPC. */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const obj=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const label=(v:unknown,n=190):v is string=>typeof v==='string'&&!!v.trim()&&v.length<=n;
const integer=(v:unknown):v is number=>Number.isSafeInteger(v)&&(v as number)>=0;
const version=(v:unknown):v is number=>integer(v)&&(v as number)>0&&(v as number)<=2147483646;
const id=(v:unknown):v is string=>typeof v==='string'&&uuid.test(v);
export type OrgSummary={id:string;name:string};
export type OrgProduct={id:string;name:string;code:string;status:string;access_status:string;
 subscription_status:string|null;plan_code:string|null;starts_at:string|null;ends_at:string|null;
 effective:boolean;can_assign:boolean;roles:string[]};
export type OrgMember={user_id:string;version:number;full_name:string;email:string;role:string;status:string;
 account_status:string;manageable:boolean;product_roles:{applicationId:string;role:string}[]};
export type OrgInvite={id:string;email:string;state:string;expired:boolean;delivery_state:string;
 attempts:number;expires_at:string;generation:number;failure_code:string|null};
export type OrgDetail={organization:{id:string;name:string;slug:string;status:string;version:number};
 actorRole:'owner'|'admin';counts:{activeMembers:number;invitedMembers:number;suspendedMembers:number};
 products:OrgProduct[];productCount:number;activity:{created_at:string;action:string}[]};
export function parseOrgList(raw:unknown):OrgSummary[]|null{
 if(!Array.isArray(raw)||raw.length>100)return null;
 const out:OrgSummary[]=[];const seen=new Set<string>();
 for(const row of raw){if(!obj(row)||!id(row.id)||!label(row.name,150)||seen.has(row.id))return null;
 seen.add(row.id);out.push({id:row.id,name:row.name});}return out;
}
export function parseOrgDetail(raw:unknown):OrgDetail|null{
 if(!obj(raw)||!obj(raw.organization)||!obj(raw.counts)||
   !id(raw.organization.id)||!label(raw.organization.name,150)||
   !label(raw.organization.slug,150)||typeof raw.organization.status!=='string'||
   !version(raw.organization.version)||!['owner','admin'].includes(String(raw.actorRole))||
   !integer(raw.counts.activeMembers)||!integer(raw.counts.invitedMembers)||!integer(raw.counts.suspendedMembers)||
   !integer(raw.productCount)||!Array.isArray(raw.products)||raw.products.length>100||
   !Array.isArray(raw.activity)||raw.activity.length>50)return null;
 const products:OrgProduct[]=[];
 for(const p of raw.products){
  if(!obj(p)||!id(p.id)||!label(p.name,150)||!label(p.code,40)||
    typeof p.status!=='string'||typeof p.access_status!=='string'||
    !(p.subscription_status===null||typeof p.subscription_status==='string')||
    !(p.plan_code===null||typeof p.plan_code==='string')||
    !(p.starts_at===null||typeof p.starts_at==='string')||
    !(p.ends_at===null||typeof p.ends_at==='string')||
    typeof p.effective!=='boolean'||typeof p.can_assign!=='boolean'||
    !Array.isArray(p.roles)||p.roles.length>20||p.roles.some(x=>typeof x!=='string'))return null;
  products.push(p as OrgProduct);
 }
 const activity:{created_at:string;action:string}[]=[];
 for(const a of raw.activity){if(!obj(a)||typeof a.created_at!=='string'||typeof a.action!=='string'||a.action.length>120)return null;
  activity.push({created_at:a.created_at,action:a.action});}
 return {organization:{id:raw.organization.id,name:raw.organization.name,slug:raw.organization.slug,
    status:raw.organization.status,version:raw.organization.version},
   actorRole:raw.actorRole as OrgDetail['actorRole'],counts:{activeMembers:raw.counts.activeMembers,
     invitedMembers:raw.counts.invitedMembers,suspendedMembers:raw.counts.suspendedMembers},
   products,productCount:raw.productCount,activity};
}
export function parseOrgMembers(raw:unknown):OrgMember[]|null{
 if(!Array.isArray(raw)||raw.length>50)return null;
 const rows:OrgMember[]=[];
 for(const m of raw){
  if(!obj(m)||!id(m.user_id)||!version(m.version)||!label(m.full_name,150)||!label(m.email)||
    !['owner','admin','member','viewer'].includes(String(m.role))||
    !['active','suspended','invited'].includes(String(m.status))||
    typeof m.account_status!=='string'||typeof m.manageable!=='boolean'||
    !Array.isArray(m.product_roles)||m.product_roles.length>100)return null;
  const product_roles:{applicationId:string;role:string}[]=[];
  for(const r of m.product_roles){
    if(!obj(r)||!id(r.applicationId)||typeof r.role!=='string'||r.role.length>40)return null;
    product_roles.push({applicationId:r.applicationId,role:r.role});
  }
  rows.push({user_id:m.user_id,version:m.version,full_name:m.full_name,email:m.email,
   role:m.role as string,status:m.status as string,account_status:m.account_status,
   manageable:m.manageable,product_roles});
 }
 return rows;
}
export function parseOrgInvites(raw:unknown):OrgInvite[]|null{
 if(!Array.isArray(raw)||raw.length>100)return null;
 const rows:OrgInvite[]=[];
 for(const r of raw){
  if(!obj(r)||!id(r.id)||!label(r.email)||typeof r.state!=='string'||
    typeof r.expired!=='boolean'||typeof r.delivery_state!=='string'||
    !integer(r.attempts)||typeof r.expires_at!=='string'||!version(r.generation)||
    !(r.failure_code===null||r.failure_code===undefined||typeof r.failure_code==='string'))return null;
  rows.push({id:r.id,email:r.email,state:r.state,expired:r.expired,delivery_state:r.delivery_state,
    attempts:r.attempts,expires_at:r.expires_at,generation:r.generation,
    failure_code:typeof r.failure_code==='string'?r.failure_code:null});
 }return rows;
}
export function organizationMutation(value:unknown):{path:string;body:Record<string,unknown>;key:boolean}|null{
 if(!obj(value)||!id(value.organizationId)||typeof value.action!=='string')return null;
 const prefix='/api/organizations/'+value.organizationId;
 const payload={...value};delete payload.organizationId;delete payload.action;
 if(value.action==='profile'&&Object.keys(payload).length===2&&version(payload.version)&&
    label(payload.name,150)&&!/[\u0000-\u001f\u007f]/.test(payload.name))
    return {path:prefix+'/profile',body:payload,key:false};
 if(value.action==='member'&&Object.keys(payload).length===5&&id(payload.userId)&&
    version(payload.version)&&payload.confirmed===true&&
    ['admin','member','viewer'].includes(String(payload.role))&&
    ['active','suspended'].includes(String(payload.status)))
    return {path:prefix+'/member',body:payload,key:false};
 if(value.action==='role'&&Object.keys(payload).length===5&&id(payload.userId)&&
    id(payload.applicationId)&&version(payload.version)&&payload.confirmed===true&&
    ['','admin','manager','user','viewer','staff','musician'].includes(String(payload.role)))
    return {path:prefix+'/role',body:payload,key:false};
 if(value.action==='invite'&&Object.keys(payload).length===4&&
   label(payload.name,150)&&typeof payload.email==='string'&&payload.email.length<=190&&
   /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)&&
   ['member','viewer','admin'].includes(String(payload.memberRole))&&
   Array.isArray(payload.products)&&payload.products.length<=12&&
   payload.products.every((p:unknown)=>obj(p)&&Object.keys(p).length===2&&
     id(p.applicationId)&&typeof p.role==='string'&&p.role!=='super_admin'&&p.role.length<=40))
   return {path:prefix+'/invitations',body:payload,key:true};
 if(['cancel-invite','reissue-invite'].includes(value.action)&&Object.keys(payload).length===3&&
   id(payload.invitationId)&&version(payload.generation)&&payload.confirmed===true)
   return {path:prefix+'/invitations/'+payload.invitationId+'/'+(value.action==='cancel-invite'?'cancel':'reissue'),
     body:{generation:payload.generation,confirmed:true},key:false};
 return null;
}
export function validOrganizationId(value:string){return uuid.test(value);}

/** Fixed legacy product-context/records adapters. Only CRM and MUSIC expose records. */
const record=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const code=/^[A-Z][A-Z0-9_]{1,39}$/;
const text=(x:unknown,max:number):x is string=>typeof x==='string'&&x.length<=max&&!/[\u0000-\u001f\u007f]/.test(x);
export const appCode=(x:unknown):x is string=>typeof x==='string'&&code.test(x);
export type AppWorkspaceContext={
 application:{code:string;name:string};
 organization:{id:string;name:string};
 user:{name:string};role:string;canCreateRecords:boolean;
 integration:{recordsConfigured:boolean;heading:string;externalHealth:'unverified'};
};
export function parseAppWorkspaceContext(raw:unknown,requested:string):AppWorkspaceContext|null{
 if(!record(raw)||!record(raw.application)||!record(raw.organization)||!record(raw.user)||
   !record(raw.capabilities)||!record(raw.integration)||!appCode(requested)||
   raw.application.code!==requested||raw.application.status!=='active'||
   !text(raw.application.name,150)||!raw.application.name.trim()||
   typeof raw.organization.id!=='string'||!uuid.test(raw.organization.id)||
   !text(raw.organization.name,150)||!raw.organization.name.trim()||
   !text(raw.user.name,150)||!raw.user.name.trim()||
   !text(raw.role,40)||!raw.role.trim()||
   typeof raw.capabilities.createRecords!=='boolean'||
   typeof raw.integration.recordsConfigured!=='boolean'||
   raw.integration.recordsConfigured!==['CRM','MUSIC'].includes(requested)||
   !text(raw.integration.heading,150)||raw.integration.externalHealth!=='unverified')
   return null;
 return {application:{code:requested,name:raw.application.name},
   organization:{id:raw.organization.id,name:raw.organization.name},
   user:{name:raw.user.name},role:raw.role,
   canCreateRecords:raw.capabilities.createRecords,
   integration:{recordsConfigured:raw.integration.recordsConfigured,
     heading:raw.integration.heading,externalHealth:'unverified'}};
}
export type AppRecord={id:string;first:string;second:string;third:string};
export function parseAppRecords(raw:unknown,codeValue:string):AppRecord[]|null{
 if(!record(raw)||!Array.isArray(raw.records)||raw.records.length>100)return null;
 if(!['CRM','MUSIC'].includes(codeValue))return raw.records.length===0?[]:null;
 const out:AppRecord[]=[],seen=new Set<string>();
 for(const x of raw.records){
  if(!record(x)||typeof x.id!=='string'||!uuid.test(x.id)||
     seen.has(x.id.toLowerCase()))return null;
  const first=codeValue==='CRM'?x.name:x.song_title;
  const second=codeValue==='CRM'?x.email:x.artist;
  const third=codeValue==='CRM'?x.company:x.status;
  if(!text(first,150)||!first.trim()||
     !(second===null||second===undefined||text(second,190))||
     !(third===null||third===undefined||text(third,150)))return null;
  seen.add(x.id.toLowerCase());
  out.push({id:x.id,first,second:typeof second==='string'?second:'—',
   third:typeof third==='string'?third:'—'});
 }
 return out;
}
export function validatedAppRecord(raw:unknown,codeValue:string):Record<string,string>|null{
 if(!record(raw)||!['CRM','MUSIC'].includes(codeValue))return null;
 const fields=codeValue==='CRM'?['name','email','company']:['song_title','artist'];
 if(Object.keys(raw).length!==fields.length||fields.some(k=>!Object.hasOwn(raw,k)))return null;
 const first=raw[fields[0]],second=raw[fields[1]];
 if(!text(first,150)||!first.trim()||!text(second,190))return null;
 if(codeValue==='CRM'){
  if(!text(raw.company,150))return null;
  return {name:first.trim(),email:second.trim(),company:raw.company.trim()};
 }
 return {song_title:first.trim(),artist:second.trim()};
}
export function confirmedAppRecord(raw:unknown):boolean{
 return record(raw)&&record(raw.record)&&typeof raw.record.id==='string'&&
   uuid.test(raw.record.id);
}

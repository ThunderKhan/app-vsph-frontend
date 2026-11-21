/** Contract for original identity consent and HR readiness; backend remains source of authority. */
const obj=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const id=(x:unknown):x is string=>typeof x==='string'&&uuid.test(x);
const name=(x:unknown,n=190):x is string=>typeof x==='string'&&x.trim().length>0&&x.length<=n;
const version=(x:unknown):x is number=>Number.isSafeInteger(x)&&(x as number)>=1&&(x as number)<=2147483647;
const str=(x:unknown):x is string=>typeof x==='string'&&x.length<=300;
export type LinkRequest={id:string;version:number;roster_version:number;state:string;expires_at:string;created_at:string};
export type ManagerLink={employee:{id:string;fullName:string;email:string;status:string;version:number};
 link:{status:string;version:number}|null;requests:LinkRequest[];hrReadiness:{message:string;canGrant:boolean;canRequest:boolean}|null};
export type PersonalRequest={id:string;employee_id:string;version:number;roster_version:number;current_roster_version:number;
 expires_at:string;full_name:string;department:string;job_title:string;status:string};
export type PersonalEmployment={full_name:string;department:string;job_title:string;employment_type:string;start_date:string;status:string};
export type PersonalIdentity={requests:PersonalRequest[];employment:PersonalEmployment[]};
export function parsePersonalIdentity(v:unknown):PersonalIdentity|null{
 if(!obj(v)||!Array.isArray(v.requests)||v.requests.length>50||
    !Array.isArray(v.employment)||v.employment.length>10)return null;
 const requests:PersonalRequest[]=[];
 for(const r of v.requests){
   if(!obj(r)||!id(r.id)||!id(r.employee_id)||!version(r.version)||
      !version(r.roster_version)||!version(r.current_roster_version)||
      !name(r.full_name,150)||!name(r.department,100)||!name(r.job_title,120)||
      !str(r.expires_at)||!str(r.status))return null;
   requests.push({id:r.id,employee_id:r.employee_id,version:r.version,
     roster_version:r.roster_version,current_roster_version:r.current_roster_version,
     expires_at:r.expires_at,full_name:r.full_name,department:r.department,
     job_title:r.job_title,status:r.status});
 }
 const employment:PersonalEmployment[]=[];
 for(const e of v.employment){
   if(!obj(e)||!name(e.full_name,150)||!name(e.department,100)||
      !name(e.job_title,120)||!str(e.employment_type)||!str(e.start_date)||!str(e.status))return null;
   employment.push({full_name:e.full_name,department:e.department,job_title:e.job_title,
      employment_type:e.employment_type,start_date:e.start_date,status:e.status});
 }
 return {requests,employment};
}
export function parseManagerLink(v:unknown):ManagerLink|null{
 if(!obj(v)||!obj(v.employee)||!id(v.employee.id)||!name(v.employee.fullName,150)||
    !name(v.employee.email)||!str(v.employee.status)||!version(v.employee.version)||
    !Array.isArray(v.requests)||v.requests.length>20)return null;
 let link:ManagerLink['link']=null;
 if(v.link!==null&&v.link!==undefined){
   if(!obj(v.link)||!version(v.link.version)||!['linked','revoked'].includes(String(v.link.status)))return null;
   link={status:v.link.status as string,version:v.link.version};
 }
 const requests:LinkRequest[]=[];
 for(const r of v.requests){
  if(!obj(r)||!id(r.id)||!version(r.version)||!version(r.roster_version)||
    !str(r.state)||!str(r.expires_at)||!str(r.created_at))return null;
  requests.push({id:r.id,version:r.version,roster_version:r.roster_version,
    state:r.state,expires_at:r.expires_at,created_at:r.created_at});
 }
 let hrReadiness:ManagerLink['hrReadiness']=null;
 if(v.hrReadiness!==null&&v.hrReadiness!==undefined){
  if(!obj(v.hrReadiness)||!str(v.hrReadiness.message)||
     typeof v.hrReadiness.canGrant!=='boolean')return null;
  hrReadiness={message:v.hrReadiness.message,canGrant:v.hrReadiness.canGrant,
    canRequest:v.hrReadiness.canRequest===true};
 }
 return {employee:{id:v.employee.id,fullName:v.employee.fullName,email:v.employee.email,
   status:v.employee.status,version:v.employee.version},link,requests,hrReadiness};
}
export function identityMutation(value:unknown):{path:string;body:Record<string,unknown>;key:boolean}|null{
 if(!obj(value)||typeof value.action!=='string')return null;
 const action=value.action;
 if(action==='accept'){
  const expected=['action','requestId','rosterVersion','requestVersion','confirmed','password'];
  const keys=Object.keys(value);
  if(keys.some(k=>![...expected,'totpCode','totpFactorId'].includes(k))||
      !expected.every(k=>keys.includes(k))||
      !id(value.requestId)||!version(value.rosterVersion)||!version(value.requestVersion)||
      value.confirmed!==true||!name(value.password,4096)||
      (value.totpCode!==undefined&&typeof value.totpCode!=='string')||
      (value.totpCode!==undefined&&value.totpCode!==''&&!/^\d{6}$/.test(value.totpCode))||
      (value.totpFactorId!==undefined&&!id(value.totpFactorId)))return null;
  return {path:'/api/employee-identity/requests/'+value.requestId+'/accept',
   key:false,body:{rosterVersion:value.rosterVersion,requestVersion:value.requestVersion,
     confirmed:true,password:value.password,
     ...(value.totpCode?{totpCode:value.totpCode}:{}),
     ...(value.totpFactorId?{totpFactorId:value.totpFactorId}:{})}};
 }
 if(!id(value.employeeId)||!version(value.rosterVersion)||value.confirmed!==true)return null;
 const path='/api/employee-identity/employees/'+value.employeeId;
 if(action==='request'&&Object.keys(value).length===4)
   return {path:path+'/request',body:{rosterVersion:value.rosterVersion,confirmed:true},key:true};
 if(['renew','cancel'].includes(action)&&Object.keys(value).length===6&&
   id(value.requestId)&&version(value.requestVersion))
   return {path:path+'/'+action,body:{rosterVersion:value.rosterVersion,
     requestId:value.requestId,requestVersion:value.requestVersion,confirmed:true},key:false};
 if(action==='revoke'&&Object.keys(value).length===5&&version(value.linkVersion))
   return {path:path+'/revoke',body:{rosterVersion:value.rosterVersion,
     linkVersion:value.linkVersion,confirmed:true},key:false};
 if(action==='grant_hr'&&Object.keys(value).length===4)
   return {path:'/api/employees/'+value.employeeId+'/grant_hr',
    body:{version:value.rosterVersion,confirmed:true},key:false};
 return null;
}

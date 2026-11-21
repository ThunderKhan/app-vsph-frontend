/** Legacy HRMS current-employee projection; no fixture defaults or coworker data. */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const obj=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const text=(x:unknown,n=300):x is string=>typeof x==='string'&&!!x.trim()&&x.length<=n;
const positive=(x:unknown):x is number=>Number.isSafeInteger(x)&&(x as number)>0&&(x as number)<2147483647;
const day=(x:unknown):x is string=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 !Number.isNaN(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
const maybeDate=(x:unknown)=>x===null||(typeof x==='string'&&!Number.isNaN(Date.parse(x)));
export type OwnTask={id:string;title:string;project_name:string;project_status:string;project_version:number;status:string;priority:string;due_on:string|null};
export type OwnLeave={id:string;version:number;start_on:string;end_on:string;kind:string;status:string;reason:string;decision_note:string|null};
export type OwnAttendance={id:string;version:number;work_day:string;status:string;checked_in_at:string|null;checked_out_at:string|null;recovery_note:string|null};
export type OwnWork={employee:{name:string;jobTitle:string;department:string;status:string};workDate:string;tasks:OwnTask[];leave:OwnLeave[];attendance:OwnAttendance[]};
export function parseOwnWork(v:unknown):OwnWork|null{
 if(!obj(v)||!obj(v.employee)||!text(v.employee.name,150)||
   typeof v.employee.jobTitle!=='string'||typeof v.employee.department!=='string'||
   !['active','on_leave','onboarding','inactive'].includes(String(v.employee.status))||
   !day(v.workDate)||!Array.isArray(v.tasks)||v.tasks.length>50||
   !Array.isArray(v.leave)||v.leave.length>25||
   !Array.isArray(v.attendance)||v.attendance.length>31)return null;
 const tasks:OwnTask[]=[];
 for(const t of v.tasks){
   if(!obj(t)||typeof t.id!=='string'||!uuid.test(t.id)||!text(t.title,300)||
     !text(t.project_name,150)||!positive(t.project_version)||
     !['planned','active','paused','completed','archived'].includes(String(t.project_status))||
     !['todo','in_progress','in_review','done','blocked','cancelled'].includes(String(t.status))||
     !text(t.priority,30)||!(t.due_on===null||day(t.due_on)))return null;
   tasks.push(t as OwnTask);
 }
 const leave:OwnLeave[]=[];
 for(const r of v.leave){
   if(!obj(r)||typeof r.id!=='string'||!uuid.test(r.id)||!positive(r.version)||
     !day(r.start_on)||!day(r.end_on)||r.end_on<r.start_on||
     !['annual','sick','unpaid','other'].includes(String(r.kind))||
     !['pending','approved','rejected','cancelled'].includes(String(r.status))||
     !text(r.reason,500)||!(r.decision_note===null||typeof r.decision_note==='string'))return null;
   leave.push(r as OwnLeave);
 }
 const attendance:OwnAttendance[]=[];
 for(const a of v.attendance){
   if(!obj(a)||typeof a.id!=='string'||!uuid.test(a.id)||!positive(a.version)||
     !day(a.work_day)||!['open','closed','incomplete'].includes(String(a.status))||
     !maybeDate(a.checked_in_at)||!maybeDate(a.checked_out_at)||
     !(a.recovery_note===null||typeof a.recovery_note==='string'))return null;
   attendance.push(a as OwnAttendance);
 }
 return {employee:{name:v.employee.name,jobTitle:v.employee.jobTitle,department:v.employee.department,status:v.employee.status as string},
   workDate:v.workDate,tasks,leave,attendance};
}
type Mutation={path:string;body:Record<string,unknown>;needsKey:boolean};
const exact=(v:Record<string,unknown>,k:string[])=>Object.keys(v).length===k.length&&k.every(x=>Object.hasOwn(v,x));
export function ownWorkMutation(value:unknown):Mutation|null{
 if(!obj(value)||typeof value.action!=='string')return null;
 const action=value.action;
 if(action==='task'&&exact(value,['action','id','version','status'])&&
   typeof value.id==='string'&&uuid.test(value.id)&&positive(value.version)&&
   ['in_progress','in_review','done','blocked'].includes(String(value.status)))
   return {path:'/api/hrms/me/tasks/'+value.id+'/status',body:{version:value.version,status:value.status},needsKey:false};
 if(action==='leave'&&exact(value,['action','startOn','endOn','kind','reason'])&&
   day(value.startOn)&&day(value.endOn)&&value.startOn<=value.endOn&&
   Date.parse(value.endOn)-Date.parse(value.startOn)<=365*86400000&&
   ['annual','sick','unpaid','other'].includes(String(value.kind))&&
   text(value.reason,500))
   return {path:'/api/hrms/me/leave',body:{startOn:value.startOn,endOn:value.endOn,kind:value.kind,reason:value.reason},needsKey:true};
 if(action==='cancel'&&exact(value,['action','id','version'])&&
   typeof value.id==='string'&&uuid.test(value.id)&&positive(value.version))
   return {path:'/api/hrms/me/leave/'+value.id+'/cancel',body:{version:value.version},needsKey:false};
 if(action==='in'&&exact(value,['action']))
   return {path:'/api/hrms/me/attendance/in',body:{},needsKey:true};
 if(action==='out'&&exact(value,['action','id','version'])&&
   typeof value.id==='string'&&uuid.test(value.id)&&positive(value.version))
   return {path:'/api/hrms/me/attendance/'+value.id+'/out',body:{version:value.version},needsKey:true};
 return null;
}
export function validOwnWorkId(v:string){return uuid.test(v);}

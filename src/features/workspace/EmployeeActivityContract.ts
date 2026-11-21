/** The legacy employee.task_status activity RPC: actual completed tasks, not performance. */
const obj=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const date=(x:unknown):x is string=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 !Number.isNaN(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
const count=(x:unknown):x is number=>Number.isSafeInteger(x)&&(x as number)>=0;
export type EmployeeActivity={windowStart:string;windowEnd:string;timeZone:'Asia/Kolkata';
 source:'employee.task_status';total:number;days:{date:string;count:number}[];
 projects:{name:string;count:number}[]};
export function parseEmployeeActivity(value:unknown):EmployeeActivity|null{
 if(!obj(value)||!date(value.windowStart)||!date(value.windowEnd)||
    Date.parse(value.windowEnd)-Date.parse(value.windowStart)!==364*86400000||
    value.timeZone!=='Asia/Kolkata'||value.source!=='employee.task_status'||
    !count(value.total)||!Array.isArray(value.days)||value.days.length>365||
    !Array.isArray(value.projects)||value.projects.length>3)return null;
 const days:{date:string;count:number}[]=[],seen=new Set<string>();let sum=0;
 for(const d of value.days){
  if(!obj(d)||!date(d.date)||d.date<value.windowStart||d.date>value.windowEnd||
     !count(d.count)||d.count===0||seen.has(d.date))return null;
  seen.add(d.date);sum+=d.count;days.push({date:d.date,count:d.count});
 }
 if(sum!==value.total)return null;
 const projects:{name:string;count:number}[]=[],names=new Set<string>();
 for(const p of value.projects){
  if(!obj(p)||typeof p.name!=='string'||!p.name.trim()||p.name.length>150||
     !count(p.count)||p.count===0||names.has(p.name))return null;
  names.add(p.name);projects.push({name:p.name,count:p.count});
 }
 if(projects.reduce((n,p)=>n+p.count,0)>value.total)return null;
 return {windowStart:value.windowStart,windowEnd:value.windowEnd,
   timeZone:'Asia/Kolkata',source:'employee.task_status',total:value.total,days,projects};
}

/** Original VSPH internal HRMS calendar contract. All authorization remains server-side. */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const obj=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const iso=(v:unknown):v is string=>typeof v==='string'&&v.length<=35&&
 /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(v)&&!Number.isNaN(Date.parse(v));
const categories=['meeting','task','reminder','personal'] as const;
const colors=['blue','green','purple','orange','pink','red'] as const;
const scopes=['personal','team','company'] as const;
export type CalendarEvent={
 id:string;title:string;description:string;startAt:string;endAt:string;
 category:string;color:string;scope:string;tags:string[];attendees:string[];
 meetUrl:string;version:number;canEdit:boolean;
};
export type CalendarPage={events:CalendarEvent[];canCompanySchedule:boolean};
export type CalendarAction={path:string;method:'POST'|'PATCH'|'DELETE';body:Record<string,unknown>};
export function calendarReadParams(params:URLSearchParams):URLSearchParams|null{
 const keys=[...params.keys()];
 if(keys.length!==2||new Set(keys).size!==2||!keys.includes('from')||!keys.includes('to'))return null;
 const from=params.get('from'),to=params.get('to');
 if(!iso(from)||!iso(to)||Date.parse(to)<=Date.parse(from)||
    Date.parse(to)-Date.parse(from)>370*86400000)return null;
 return new URLSearchParams({from:new Date(from).toISOString(),to:new Date(to).toISOString()});
}
export function parseCalendarPage(v:unknown):CalendarPage|null{
 if(!obj(v)||!Array.isArray(v.events)||v.events.length>1000||
    typeof v.canCompanySchedule!=='boolean')return null;
 const events:CalendarEvent[]=[];const seen=new Set<string>();
 for(const r of v.events){
  if(!obj(r)||typeof r.id!=='string'||!uuid.test(r.id)||seen.has(r.id)||
     typeof r.title!=='string'||!r.title.trim()||r.title.length>120||
     typeof r.description!=='string'||r.description.length>1000||
     !iso(r.startAt)||!iso(r.endAt)||Date.parse(r.endAt)<=Date.parse(r.startAt)||
     typeof r.category!=='string'||!categories.includes(r.category as typeof categories[number])||
     typeof r.color!=='string'||!colors.includes(r.color as typeof colors[number])||
     typeof r.scope!=='string'||!scopes.includes(r.scope as typeof scopes[number])||
     !Array.isArray(r.tags)||r.tags.length>8||r.tags.some(t=>typeof t!=='string'||t.length>32)||
     !Array.isArray(r.attendees)||r.attendees.length>20||r.attendees.some(t=>typeof t!=='string'||t.length>254)||
     typeof r.meetUrl!=='string'||r.meetUrl.length>300||
     !Number.isSafeInteger(r.version)||(r.version as number)<1||typeof r.canEdit!=='boolean')return null;
  seen.add(r.id);
  events.push({id:r.id,title:r.title,description:r.description,startAt:r.startAt,endAt:r.endAt,
    category:r.category,color:r.color,scope:r.scope,tags:r.tags,attendees:r.attendees,
    meetUrl:r.meetUrl,version:r.version as number,canEdit:r.canEdit});
 }
 return {events,canCompanySchedule:v.canCompanySchedule};
}
function eventFields(v:Record<string,unknown>,updating:boolean):Record<string,unknown>|null{
 const required=['title','description','startAt','endAt','category','color','scope','tags','attendees','meetUrl'];
 if(updating)required.push('version');
 if(Object.keys(v).length!==required.length||required.some(k=>!Object.hasOwn(v,k)))return null;
 if(typeof v.title!=='string'||!v.title.trim()||v.title.trim().length>120||
    typeof v.description!=='string'||v.description.length>1000||
    !iso(v.startAt)||!iso(v.endAt)||Date.parse(v.endAt)<=Date.parse(v.startAt)||
    Date.parse(v.endAt)-Date.parse(v.startAt)>14*86400000||
    !categories.includes(v.category as typeof categories[number])||
    !colors.includes(v.color as typeof colors[number])||
    !scopes.includes(v.scope as typeof scopes[number])||
    !Array.isArray(v.tags)||v.tags.length>8||v.tags.some(x=>typeof x!=='string'||!x.trim()||x.length>32)||
    !Array.isArray(v.attendees)||v.attendees.length>20||
    v.attendees.some(x=>typeof x!=='string'||x.length>254||!/^\S+@\S+\.\S+$/.test(x.trim()))||
    (v.scope==='personal'&&v.attendees.length>0)||
    typeof v.meetUrl!=='string'||v.meetUrl.length>300||
    (updating&&(!Number.isSafeInteger(v.version)||(v.version as number)<1)))return null;
 if(v.meetUrl){
   try{const u=new URL(v.meetUrl);
    if(u.protocol!=='https:'||u.hostname!=='meet.google.com'||u.port||u.username||u.password||
       u.search||u.hash||!/^\/[a-z0-9/_-]+$/i.test(u.pathname))return null;
   }catch{return null;}
 }
 return {...v,title:v.title.trim(),startAt:new Date(v.startAt).toISOString(),
   endAt:new Date(v.endAt).toISOString(),tags:[...new Set((v.tags as string[]).map(x=>x.trim()))],
   attendees:[...new Set((v.attendees as string[]).map(x=>x.trim().toLowerCase()))]};
}
export function calendarMutation(value:unknown):CalendarAction|null{
 if(!obj(value)||typeof value.action!=='string')return null;
 if(value.action==='delete'){
   if(Object.keys(value).length!==3||typeof value.id!=='string'||!uuid.test(value.id)||
      !Number.isSafeInteger(value.version)||(value.version as number)<1)return null;
   return {path:'/api/hrms/calendar/'+value.id,method:'DELETE',body:{version:value.version}};
 }
 if(value.action==='create'||value.action==='save'){
   if(typeof value.id!=='string'||!uuid.test(value.id))return null;
   const remaining={...value};delete remaining.action;delete remaining.id;
   const body=eventFields(remaining,value.action==='save');
   if(!body)return null;
   return value.action==='create'?
     {path:'/api/hrms/calendar',method:'POST',body:{id:value.id,...body}}:
     {path:'/api/hrms/calendar/'+value.id,method:'PATCH',body};
 }
 return null;
}

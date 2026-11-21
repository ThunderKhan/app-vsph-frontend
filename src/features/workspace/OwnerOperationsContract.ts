/** Owner-only operating snapshot; unavailable sections remain explicitly unavailable. */
const obj=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const int=(x:unknown):x is number=>Number.isSafeInteger(x)&&(x as number)>=0;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const date=(x:unknown)=>typeof x==='string'&&!Number.isNaN(Date.parse(x));
type State='ready'|'unavailable';
type Section<T>={status:'unavailable'}|({status:'ready'}&T);
type Count={total:number;active:number;suspended:number};
type Delivery={active:number;completed:number;tasks:number;done:number;cancelled:number;blocked:number;
 recent:{id:string;name:string;kind:string}[]};
type Workforce={total:number;active:number;onboarding:number};
type Products={total:number;active:number;catalog:{id:string;name:string;code:string}[]};
type Attention={overdueTasks:number;overdueMilestones:number;asOf:string;
 upcoming:{id:string;projectId:string;title:string;dueOn:string}[]};
type Activity={items:{projectId:string;action:string;createdAt:string}[]};
export type OwnerOperations={observedAt:string;customers:Section<Count>;
 delivery:Section<Delivery>;workforce:Section<Workforce>;products:Section<Products>;
 attention:Section<Attention>;activity:Section<Activity>};
export function parseOwnerOperations(raw:unknown):OwnerOperations|null{
 if(!obj(raw)||!date(raw.observedAt))return null;
 const sections=['customers','delivery','workforce','products','attention','activity'] as const;
 if(sections.some(k=>!obj(raw[k])||!['ready','unavailable'].includes(String((raw[k] as Record<string,unknown>).status))))return null;
 const c=raw.customers as Record<string,unknown>,d=raw.delivery as Record<string,unknown>,
  w=raw.workforce as Record<string,unknown>,p=raw.products as Record<string,unknown>,
  a=raw.attention as Record<string,unknown>,h=raw.activity as Record<string,unknown>;
 if(c.status==='ready'&&(!int(c.total)||!int(c.active)||!int(c.suspended)||
   c.active>c.total||c.suspended>c.total))return null;
 if(d.status==='ready'){
  if(![d.active,d.completed,d.tasks,d.done,d.cancelled,d.blocked].every(int)||
     (d.done as number)+(d.cancelled as number)+(d.blocked as number)>(d.tasks as number)||
     !Array.isArray(d.recent)||d.recent.length>6)return null;
  for(const r of d.recent){
   if(!obj(r)||typeof r.id!=='string'||!uuid.test(r.id)||
     typeof r.name!=='string'||!r.name.trim()||r.name.length>200||
     !['internal','customer'].includes(String(r.kind)))return null;
  }
 }
 if(w.status==='ready'&&(!int(w.total)||!int(w.active)||!int(w.onboarding)||
    w.active>w.total||w.onboarding>w.total))return null;
 if(p.status==='ready'){
  if(!int(p.total)||!int(p.active)||p.active>p.total||
    !Array.isArray(p.catalog)||p.catalog.length>3)return null;
  for(const x of p.catalog){
    if(!obj(x)||typeof x.id!=='string'||!uuid.test(x.id)||
      typeof x.name!=='string'||!x.name.trim()||x.name.length>200||
      typeof x.code!=='string'||x.code.length>50)return null;
  }
 }
 if(a.status==='ready'){
  if(!int(a.overdueTasks)||!int(a.overdueMilestones)||!date(a.asOf)||
    !Array.isArray(a.upcoming)||a.upcoming.length>5)return null;
  for(const x of a.upcoming){
   if(!obj(x)||typeof x.id!=='string'||!uuid.test(x.id)||
     typeof x.projectId!=='string'||!uuid.test(x.projectId)||
     typeof x.title!=='string'||x.title.length>250||!date(x.dueOn))return null;
  }
 }
 if(h.status==='ready'){
  if(!Array.isArray(h.items)||h.items.length>6)return null;
  for(const x of h.items){
   if(!obj(x)||typeof x.projectId!=='string'||!uuid.test(x.projectId)||
      typeof x.action!=='string'||x.action.length>100||!date(x.createdAt))return null;
  }
 }
 return raw as OwnerOperations;
}

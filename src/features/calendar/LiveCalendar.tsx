'use client';
import {useEffect,useMemo,useRef,useState,type FormEvent} from 'react';
import {parseCalendarPage,type CalendarEvent} from './CalendarContract';
type View='month'|'week'|'day'|'list';
const pad=(n:number)=>String(n).padStart(2,'0');
const dateKey=(d:Date)=>[d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join('-');
const addDays=(d:Date,days:number)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+days);
const startWeek=(d:Date)=>addDays(new Date(d.getFullYear(),d.getMonth(),d.getDate()),-d.getDay());
const localInput=(d:Date)=>dateKey(d)+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
const label=(d:Date)=>d.toLocaleDateString('en-US',{month:'long',year:'numeric'});
type Editor={id:string;version?:number;title:string;description:string;startAt:string;endAt:string;
  category:string;color:string;scope:string;tags:string;attendees:string;meetUrl:string};
const newEditor=(d=new Date()):Editor=>{
 const start=new Date(d);start.setMinutes(0,0,0);
 if(start.getHours()===0)start.setHours(9);else start.setHours(start.getHours()+1);
 return {id:crypto.randomUUID(),title:'',description:'',startAt:localInput(start),
   endAt:localInput(new Date(start.getTime()+3600000)),category:'meeting',color:'blue',
   scope:'personal',tags:'',attendees:'',meetUrl:''};
};
export function LiveCalendar(){
 const [date,setDate]=useState(()=>new Date());
 const [view,setView]=useState<View>('month');
 const [events,setEvents]=useState<CalendarEvent[]>([]);
 const [loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false);
 const [message,setMessage]=useState('Loading events…');
 const [canCompanySchedule,setCanCompanySchedule]=useState(false);
 const [query,setQuery]=useState(''),[category,setCategory]=useState(''),[color,setColor]=useState(''),[tag,setTag]=useState('');
 const [editor,setEditor]=useState<Editor|null>(null);
 const [formError,setFormError]=useState(''),[confirmDelete,setConfirmDelete]=useState(false);
 const reload=useRef(0);
 const span=useMemo(()=>{
  let from:Date,to:Date;
  if(view==='month'){from=startWeek(new Date(date.getFullYear(),date.getMonth(),1));to=addDays(from,42);}
  else if(view==='week'){from=startWeek(date);to=addDays(from,7);}
  else if(view==='day'){from=new Date(date.getFullYear(),date.getMonth(),date.getDate());to=addDays(from,1);}
  else{from=new Date(date.getFullYear(),date.getMonth(),1);to=new Date(date.getFullYear(),date.getMonth()+1,1);}
  return {from:from.toISOString(),to:to.toISOString()};
 },[date,view]);
 useEffect(()=>{
  const abort=new AbortController();
  void (async()=>{
   try{
    const response=await fetch('/api/hrms-calendar?'+new URLSearchParams(span),{
      credentials:'same-origin',cache:'no-store',signal:abort.signal,
    });
    if(response.status===401){window.location.assign('/login');return;}
    const raw:unknown=await response.json().catch(()=>null);
    if(!response.ok)throw Error(raw&&typeof raw==='object'&&'message' in raw&&
      typeof raw.message==='string'?raw.message:'Calendar unavailable.');
    const model=parseCalendarPage(raw);
    if(!model)throw Error('Invalid calendar response.');
    if(abort.signal.aborted)return;
    setEvents(model.events);setCanCompanySchedule(model.canCompanySchedule);
    setLoaded(true);setMessage(model.events.length?'':'No events');
   }catch(e){
    if(abort.signal.aborted)return;
    setEvents([]);setLoaded(false);
    setMessage(e instanceof Error?e.message:'Calendar unavailable.');
   }
  })();
  return ()=>abort.abort();
 },[span,reload.current]);
 const availableTags=[...new Set(events.flatMap(e=>e.tags))].sort();
 const filtered=events.filter(e=>(!category||e.category===category)&&(!color||e.color===color)&&
    (!tag||e.tags.includes(tag))&&(!query||
       [e.title,e.description,e.category,...e.tags].join(' ').toLowerCase().includes(query.toLowerCase())));
 const move=(delta:number)=>{
  setBusy(true);setLoaded(false);setMessage('Loading events…');
  setDate(cur=>view==='month'||view==='list'?
    new Date(cur.getFullYear(),cur.getMonth()+delta,Math.min(cur.getDate(),28)):
    addDays(cur,delta*(view==='week'?7:1)));
 };
 const changeView=(v:View)=>{setBusy(true);setLoaded(false);setView(v);setMessage('Loading events…');};
 const openEvent=(e:CalendarEvent)=>{
   setConfirmDelete(false);setFormError('');
   setEditor({id:e.id,version:e.version,title:e.title,description:e.description,
     startAt:localInput(new Date(e.startAt)),endAt:localInput(new Date(e.endAt)),
     category:e.category,color:e.color,scope:e.scope,tags:e.tags.join(', '),
     attendees:e.attendees.join(', '),meetUrl:e.meetUrl});
 };
 const eventEditable=editor?.version===undefined||events.find(e=>e.id===editor.id)?.canEdit===true;
 async function mutate(action:'create'|'save'|'delete',body:Record<string,unknown>){
  setBusy(true);setFormError('');setMessage('Saving event…');
  try{
   const response=await fetch('/api/hrms-calendar-action',{method:'POST',credentials:'same-origin',cache:'no-store',
      headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...body})});
   if(response.status===401){window.location.assign('/login');return;}
   const raw:unknown=await response.json().catch(()=>null);
   if(!response.ok)throw Error(raw&&typeof raw==='object'&&'message' in raw&&typeof raw.message==='string'?
      raw.message:'Event operation was not confirmed. Reload before retrying.');
   setEditor(null);setConfirmDelete(false);setLoaded(false);setMessage('Loading events…');
   reload.current+=1;setDate(d=>new Date(d.getTime()));
  }catch(e){setFormError(e instanceof Error?e.message:'Event operation failed.');setMessage('Event change not confirmed.');}
  finally{setBusy(false);}
 }
 const submit=(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(!editor||!eventEditable)return;
  const start=new Date(editor.startAt),end=new Date(editor.endAt);
  if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start){
    setFormError('Choose a valid event start and end time.');return;
  }
  void mutate(editor.version?'save':'create',{
    id:editor.id,...(editor.version?{version:editor.version}:{}),
    title:editor.title,description:editor.description,startAt:start.toISOString(),
    endAt:end.toISOString(),category:editor.category,color:editor.color,scope:editor.scope,
    tags:editor.tags.split(',').map(t=>t.trim()).filter(Boolean),
    attendees:editor.scope==='personal'?[]:editor.attendees.split(',').map(t=>t.trim()).filter(Boolean),
    meetUrl:editor.meetUrl.trim(),
  });
 };
 async function moveEvent(eventId:string,target:Date){
  const item=events.find(e=>e.id===eventId&&e.canEdit);
  if(!item)return;
  const begin=new Date(item.startAt),newStart=new Date(target);
  newStart.setHours(begin.getHours(),begin.getMinutes(),0,0);
  const duration=Date.parse(item.endAt)-Date.parse(item.startAt);
  if(duration<=0)return;
  await mutate('save',{id:item.id,version:item.version,title:item.title,description:item.description,
     startAt:newStart.toISOString(),endAt:new Date(newStart.getTime()+duration).toISOString(),
     category:item.category,color:item.color,scope:item.scope,
     tags:item.tags,attendees:item.attendees,meetUrl:item.meetUrl});
 }
 const selectedEvents=(d:Date)=>filtered.filter(e=>dateKey(new Date(e.startAt))===dateKey(d));
 const eventButton=(ev:CalendarEvent,showTime=false)=>
  <button type="button" key={ev.id} className="calendar-event" data-color={ev.color}
    draggable={ev.canEdit} onDragStart={e=>{if(ev.canEdit)e.dataTransfer.setData('text/plain',ev.id);}}
    onClick={()=>openEvent(ev)} title={ev.title}>
    {showTime?new Date(ev.startAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+' · ':''}{ev.title}
  </button>;
 const period=(view==='month'||view==='list')?label(date):view==='week'?
    'Week of '+startWeek(date).toLocaleDateString('en-US'):date.toLocaleDateString('en-US');
 return <section className="employee-calendar" aria-labelledby="employeeCalendarTitle">
  <header className="calendar-heading"><h1 id="employeeCalendarTitle">Calendar</h1>
    <div className="calendar-heading-actions"><button type="button" className="calendar-primary"
      onClick={()=>{setEditor(newEditor());setFormError('');setConfirmDelete(false);}}>New event</button></div>
  </header>
  <div className="calendar-toolbar">
   <div className="calendar-period"><strong aria-live="polite">{period}</strong>
    <button type="button" onClick={()=>move(-1)} aria-label="Previous period">‹</button>
    <button type="button" onClick={()=>{setDate(new Date());setBusy(true);setLoaded(false);}}>Today</button>
    <button type="button" onClick={()=>move(1)} aria-label="Next period">›</button>
   </div>
   <div className="calendar-view-tabs" role="group" aria-label="Calendar view">
    {(['month','week','day','list'] as const).map(v=><button key={v} type="button" aria-pressed={view===v} onClick={()=>changeView(v)}>{v[0].toUpperCase()+v.slice(1)}</button>)}
   </div>
  </div>
  <div className="calendar-filters">
   <input type="search" aria-label="Search events" placeholder="Search events" value={query} onChange={e=>setQuery(e.target.value)}/>
   <select aria-label="Filter by category" value={category} onChange={e=>setCategory(e.target.value)}>
    <option value="">All categories</option>{['meeting','task','reminder','personal'].map(x=><option key={x}>{x}</option>)}</select>
   <select aria-label="Filter by color" value={color} onChange={e=>setColor(e.target.value)}>
    <option value="">All colors</option>{['blue','green','purple','orange','pink','red'].map(x=><option key={x}>{x}</option>)}</select>
   <select aria-label="Filter by tag" value={tag} onChange={e=>setTag(e.target.value)}>
    <option value="">All tags</option>{availableTags.map(x=><option key={x}>{x}</option>)}</select>
  </div>
  <p className="calendar-status" role="status">{loaded?filtered.length+' events in view':message}</p>
  {loaded&&<div className="calendar-grid">
   {view==='month'?<div className="calendar-month">
    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div className="calendar-day-head" key={d}>{d}</div>)}
    {Array.from({length:42},(_,i)=>{
     const day=addDays(startWeek(new Date(date.getFullYear(),date.getMonth(),1)),i),items=selectedEvents(day);
     return <div className="calendar-month-cell" key={dateKey(day)}
       data-outside={String(day.getMonth()!==date.getMonth())}
       onDragOver={e=>e.preventDefault()}
       onDrop={e=>{e.preventDefault();void moveEvent(e.dataTransfer.getData('text/plain'),day);}}>
       <button type="button" className="calendar-date-number" onClick={()=>{setDate(day);changeView('day');}}>{day.getDate()}</button>
       <div className="calendar-events">{items.slice(0,3).map(ev=>eventButton(ev))}
       {items.length>3&&<button type="button" onClick={()=>{setDate(day);changeView('day');}}>+{items.length-3} more</button>}
       </div>
     </div>;
    })}
   </div>:<div className="calendar-list">
    {filtered.filter(e=>view==='list'||view==='week'&&
      new Date(e.startAt)>=startWeek(date)&&new Date(e.startAt)<addDays(startWeek(date),7)||
      view==='day'&&dateKey(new Date(e.startAt))===dateKey(date)).map(e=>
        <div className="calendar-list-group" key={e.id}>
          <strong>{new Date(e.startAt).toLocaleString('en-IN')}</strong>{eventButton(e,true)}
        </div>)}
    {!filtered.length&&<p>No events</p>}
   </div>}
  </div>}
  {editor&&<section className="calendar-editor" aria-label={editor.version?'Edit event':'New event'}>
   <h2>{editor.version?'Edit event':'New event'}</h2>
   {formError&&<p role="alert">{formError}</p>}
   <form onSubmit={submit}>
    <div className="calendar-form-grid">
     <label>Title<input value={editor.title} maxLength={120} required disabled={!eventEditable}
       onChange={e=>setEditor(v=>v&&({...v,title:e.target.value}))}/></label>
     <label>Category<select value={editor.category} disabled={!eventEditable}
       onChange={e=>setEditor(v=>v&&({...v,category:e.target.value}))}>
       {['meeting','task','reminder','personal'].map(c=><option key={c}>{c}</option>)}</select></label>
     <label>Start<input type="datetime-local" required value={editor.startAt} disabled={!eventEditable}
       onChange={e=>setEditor(v=>v&&({...v,startAt:e.target.value}))}/></label>
     <label>End<input type="datetime-local" required value={editor.endAt} disabled={!eventEditable}
       onChange={e=>setEditor(v=>v&&({...v,endAt:e.target.value}))}/></label>
     <label>Color<select value={editor.color} disabled={!eventEditable}
       onChange={e=>setEditor(v=>v&&({...v,color:e.target.value}))}>
       {['blue','green','purple','orange','pink','red'].map(c=><option key={c}>{c}</option>)}</select></label>
     <label>Scope<select value={editor.scope} disabled={!eventEditable}
       onChange={e=>setEditor(v=>v&&({...v,scope:e.target.value}))}>
       <option value="personal">Personal</option><option value="team">Team meeting</option>
       {(canCompanySchedule||editor.scope==='company')&&<option value="company">Company meeting</option>}
     </select></label>
    </div>
    <label>Description<textarea rows={3} maxLength={1000} value={editor.description} disabled={!eventEditable}
      onChange={e=>setEditor(v=>v&&({...v,description:e.target.value}))}/></label>
    <label>Tags (comma separated)<input value={editor.tags} disabled={!eventEditable}
      onChange={e=>setEditor(v=>v&&({...v,tags:e.target.value}))}/></label>
    {editor.scope!=='personal'&&<label>Attendees (comma separated email addresses)
     <input value={editor.attendees} disabled={!eventEditable}
       onChange={e=>setEditor(v=>v&&({...v,attendees:e.target.value}))}/></label>}
    <label>Google Meet URL<input type="url" value={editor.meetUrl} disabled={!eventEditable}
      onChange={e=>setEditor(v=>v&&({...v,meetUrl:e.target.value}))}/></label>
    <div className="calendar-form-actions">
     {eventEditable&&<button type="submit" disabled={busy}>{busy?'Saving…':'Save event'}</button>}
     {editor.version&&eventEditable&&(confirmDelete?
       <button type="button" disabled={busy} onClick={()=>void mutate('delete',{id:editor.id,version:editor.version})}>Confirm deletion</button>:
       <button type="button" disabled={busy} onClick={()=>setConfirmDelete(true)}>Delete event</button>)}
     <button type="button" onClick={()=>{setEditor(null);setFormError('');}} disabled={busy}>Close</button>
    </div>
   </form>
  </section>}
 </section>;
}

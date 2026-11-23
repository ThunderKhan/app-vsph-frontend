'use client';
import Link from 'next/link';
import {useRef,useState,type FormEvent} from 'react';
import type {NotificationRecord} from '@/features/operations/NotificationLiveContract';
import type {OwnWork} from './OwnWorkContract';
type Action=Record<string,unknown>&{action:string};
const choices:Record<string,string[]>={todo:['in_progress','blocked'],in_progress:['in_review','blocked'],
  in_review:['done','in_progress','blocked'],blocked:['in_progress']};
const label=(s:string)=>s.replaceAll('_',' ');
const when=(s:string|null)=>s?new Date(s).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}):'Not recorded';
export function MyWorkWorkspace({data,notifications,hasCursor}:{
 data:OwnWork;notifications:NotificationRecord[]|null;hasCursor:boolean;
}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('Current authorized records loaded.');
 const [error,setError]=useState(false),[confirmId,setConfirmId]=useState<string|null>(null);
 const [leave,setLeave]=useState({startOn:'',endOn:'',kind:'annual',reason:''});
 const keys=useRef(new Map<string,string>());
 async function mutate(action:Action,keyName?:string){
   if(busy)return;
   const key=keyName?(keys.current.get(keyName)||crypto.randomUUID()):null;
   if(key&&keyName)keys.current.set(keyName,key);
   setBusy(true);setError(false);setMessage('Submitting current employee operation…');
   try{
     const response=await fetch('/api/my-work-action',{
       method:'POST',credentials:'same-origin',cache:'no-store',
       headers:{'Content-Type':'application/json',...(key?{'Idempotency-Key':key}:{})},
       body:JSON.stringify(action),
     });
     if(response.status===401){window.location.assign('/login');return;}
     const payload:unknown=await response.json().catch(()=>null);
     if(!response.ok){
       const reason=payload&&typeof payload==='object'&&'message' in payload&&
         typeof payload.message==='string'?payload.message:'The operation was not confirmed. Refresh before retrying.';
       setError(true);setMessage(reason);return;
     }
     if(keyName)keys.current.delete(keyName);
     window.location.reload();
   }catch{
     setError(true);setMessage('The operation was not confirmed. Refresh current records before retrying unchanged details.');
   }finally{setBusy(false);}
 }
 function leaveSubmit(e:FormEvent<HTMLFormElement>){
   e.preventDefault();
   if(leave.endOn<leave.startOn){setError(true);setMessage('Leave end date must be on or after start date.');return;}
   void mutate({action:'leave',...leave},'leave');
 }
 const activeAttendance=data.attendance.find(a=>a.status==='open');
 const canCheckIn=data.employee.status==='active'&&!activeAttendance&&
   !data.attendance.some(a=>a.work_day===data.workDate);
 return <main className="workspace-content hr-page my-work-live" id="mainContent" tabIndex={-1}>
   <header><h1>My work</h1></header>
   <p role={error?'alert':'status'} aria-live="polite" className="hr-message" data-error={error}>{message}</p>
   <button className="secondary" type="button" disabled={busy} onClick={()=>window.location.reload()}>Refresh records</button>
   <section className="hr-panel my-work-identity">
     <h2>{data.employee.name}</h2>
     <p>{data.employee.jobTitle} · {data.employee.department} · {label(data.employee.status)}</p>
     <p className="muted">This workspace contains your own records. Your employer manages your work identity separately from your profile.</p>
   </section>
   <div className="hr-grid">
     <section className="hr-panel hr-wide">
       <h2>Task notifications</h2>
       <p className="muted">Current authorized notices from the notification worker. Assignment and overdue reminders require the worker to run.</p>
       {!notifications?<p>Task notifications are temporarily unavailable. Your saved work remains available.</p>:
         notifications.length?notifications.map(n=><article key={n.id} className="hr-record">
           <h3>{n.title||'Task notification'}</h3>
           <p>{n.projectName} · {label(n.eventType)}</p>
           <Link href={'/projects/'+n.projectId}>Open project</Link>
         </article>):<p>No current authorized notifications.</p>}
     </section>
     <section className="hr-panel hr-wide">
       <h2>Assigned tasks</h2>
       <p className="muted">Only tasks assigned to you through a current project membership. Status changes require an active project. Completed and cancelled work is read-only.</p>
       {!data.tasks.length&&<p>No assigned tasks on this page.</p>}
       {data.tasks.map(t=><article key={t.id} className="hr-record">
         <h3>{t.title}</h3><p>{t.project_name} · {label(t.status)} · {label(t.priority)} · Due {t.due_on||'not set'}</p>
         {t.project_status==='active'&&choices[t.status]&&<div className="hr-actions">
           {choices[t.status].map(status=><button key={status} type="button" className="secondary" disabled={busy}
             onClick={()=>void mutate({action:'task',id:t.id,version:t.project_version,status})}>Set {label(status)}</button>)}
         </div>}
       </article>)}
       <div className="hr-actions">
         {data.tasks.length===50&&<Link href={'/my-work?afterTaskId='+data.tasks[data.tasks.length-1].id}>Next assigned tasks</Link>}
         {hasCursor&&<Link href="/my-work">First assigned tasks</Link>}
       </div>
     </section>
     <section className="hr-panel">
       <h2>Attendance</h2>
       <p>Company workday: {data.workDate}</p>
       <p className="muted">One check-in per company workday (Asia/Kolkata). Times are recorded by the server. These records are not payroll or approved working hours.</p>
       <div className="hr-actions">
         {activeAttendance?<button type="button" disabled={busy} onClick={()=>void mutate({
           action:'out',id:activeAttendance.id,version:activeAttendance.version},'out:'+activeAttendance.id)}>Check out</button>:
           canCheckIn?<button type="button" disabled={busy} onClick={()=>void mutate({action:'in'},'in:'+data.workDate)}>Check in</button>:
           <p className="muted">No check-in action is available for this workday.</p>}
       </div>
       {data.attendance.map(a=><article key={a.id} className="hr-record">
         <h3>{a.work_day} · {label(a.status)}</h3>
         <p>In: {when(a.checked_in_at)} · Out: {when(a.checked_out_at)}</p>
         {a.recovery_note&&<p className="muted">{a.recovery_note}</p>}
       </article>)}
       {!data.attendance.length&&<p>No attendance recorded.</p>}
     </section>
     <section className="hr-panel">
       <h2>Request leave</h2><p className="muted">Requests require HR or owner review. No leave balance or entitlement is inferred.</p>
       <form onSubmit={leaveSubmit} onChange={()=>keys.current.delete('leave')}>
         <label>From<input type="date" name="startOn" required value={leave.startOn}
            onChange={e=>setLeave(old=>({...old,startOn:e.target.value}))}/></label>
         <label>Through<input type="date" name="endOn" required value={leave.endOn}
            onChange={e=>setLeave(old=>({...old,endOn:e.target.value}))}/></label>
         <label>Leave type<select name="kind" value={leave.kind}
           onChange={e=>setLeave(old=>({...old,kind:e.target.value}))}>
           {['annual','sick','unpaid','other'].map(k=><option key={k} value={k}>{k[0].toUpperCase()+k.slice(1)}</option>)}
         </select></label>
         <label>Reason<textarea name="reason" rows={3} maxLength={500} required value={leave.reason}
           onChange={e=>setLeave(old=>({...old,reason:e.target.value}))}/></label>
         <button type="submit" disabled={busy}>Submit leave request</button>
       </form>
       <h3 className="my-work-recent">Recent requests</h3>
       {data.leave.map(r=><article key={r.id} className="hr-record">
         <h3>{r.start_on} through {r.end_on}</h3><p>{label(r.kind)} · {label(r.status)}</p>
         <p>{r.reason}</p>{r.decision_note&&<p>Review note: {r.decision_note}</p>}
         {r.status==='pending'&&(confirmId!==r.id?
           <button type="button" className="secondary" disabled={busy}
             onClick={()=>setConfirmId(r.id)}>Cancel request</button>:
           <div className="hr-actions"><button type="button" disabled={busy}
             onClick={()=>void mutate({action:'cancel',id:r.id,version:r.version})}>Confirm cancellation</button>
             <button type="button" className="secondary" onClick={()=>setConfirmId(null)}>Keep request</button></div>)}
       </article>)}
       {!data.leave.length&&<p>No leave requests.</p>}
       <p className="muted">Most recent 25 requests. Attendance shows the latest 31 company workdays.</p>
     </section>
   </div>
 </main>;
}

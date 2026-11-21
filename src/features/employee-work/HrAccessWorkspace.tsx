'use client';
import Link from 'next/link';
import {useState} from 'react';
import type {RosterEmployee} from '@/features/operations/EmployeeLiveContract';
const url=(search:string,after?:string)=>{const p=new URLSearchParams();if(search)p.set('search',search);if(after)p.set('afterId',after);
 return '/hr/access'+(p.size?'?'+p.toString():'');};
export function HrAccessWorkspace({employees,hasMore,nextCursor,search,after}:{
 employees:readonly RosterEmployee[];hasMore:boolean;nextCursor:string|null;search:string;after:string;
}){
 const [busy,setBusy]=useState(false),[confirm,setConfirm]=useState<string|null>(null),[message,setMessage]=useState('');
 async function revoke(employee:RosterEmployee){
   if(busy||confirm!==employee.id)return;
   setBusy(true);setMessage('');
   try{
     const r=await fetch('/api/hr-governance',{
       method:'POST',cache:'no-store',credentials:'same-origin',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({id:employee.id,version:employee.version,confirmed:true,action:'revoke_hr'})
     });
     if(r.status===401){window.location.replace('/login');return;}
     if(!r.ok){const data:unknown=await r.json().catch(()=>null);
       throw Error(data&&typeof data==='object'&&'message' in data&&typeof data.message==='string'?
          data.message:'HR authority was not changed. Review the current employee record.');}
     window.location.reload();
   }catch(e){setMessage(e instanceof Error?e.message:'HR governance is unavailable.');}
   finally{setBusy(false);}
 }
 return <main className="workspace-content hr-page hr-access-live" id="mainContent" tabIndex={-1}>
  <header><h1>HR access governance</h1></header>
  <p className="muted">Appointment requires an active employee and an accepted, matching portal identity link. It grants workforce administration only; customer product roles and project management remain separate. Revocation takes effect on the next authorized request.</p>
  <p className="hr-message" role={message?'alert':'status'} aria-live="polite">{message||'Current authorized access records loaded.'}</p>
  <Link href={url(search)} className="hr-access-refresh">Refresh records</Link>
  <section className="hr-panel">
   <h2>Employee access</h2>
   <form action="/hr/access" method="get" className="hr-access-search">
     <label>Find employee<input type="search" name="search" maxLength={80}
       defaultValue={search} placeholder="Name or work email"/></label>
     <button type="submit">Search</button>
   </form>
   {employees.map(e=><article className="hr-record" key={e.id}>
     <h3>{e.fullName}</h3><p>{e.email} · {e.status.replaceAll('_',' ')} · {e.isHr?'HR manager':'No HR authority'}</p>
     <div className="hr-actions">
       <Link href={'/employees/'+e.id+'/account-link'}>Review identity link</Link>
       {e.isHr&&(confirm===e.id?<div className="hr-access-confirm">
          <p>Confirm HR authority revocation for {e.email}.</p>
          <button type="button" disabled={busy} onClick={()=>void revoke(e)}>Confirm revocation</button>
          <button type="button" className="secondary" disabled={busy} onClick={()=>setConfirm(null)}>Cancel</button>
         </div>:<button type="button" className="secondary" disabled={busy}
           onClick={()=>setConfirm(e.id)}>Revoke HR</button>)}
     </div>
   </article>)}
   {!employees.length&&<p>No matching employees.</p>}
   <div className="hr-actions">
    {after&&<Link href={url(search)}>First employees</Link>}
    {hasMore&&nextCursor&&<Link href={url(search,nextCursor)}>Next employees</Link>}
   </div>
  </section>
 </main>;
}

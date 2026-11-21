'use client';
import Link from 'next/link';
import {useState,type FormEvent} from 'react';
import type {ArchivedWorker} from './EmployeeLifecycleContract';
function RestoreRecord({record}:{record:ArchivedWorker}){
 const [open,setOpen]=useState(false),[reason,setReason]=useState('');
 const [confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy||!confirmed||reason.trim().length<8||reason.trim().length>500)return;
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/employee-lifecycle-action',{
     method:'POST',credentials:'same-origin',cache:'no-store',
     headers:{'Content-Type':'application/json'},
     body:JSON.stringify({operation:'restore',id:record.id,version:record.version,
       reason:reason.trim(),confirmed:true}),
   });
   if(response.status===401){window.location.assign('/login');return;}
   const data:unknown=await response.json().catch(()=>null);
   if(!response.ok||!data||typeof data!=='object'||!('ok' in data)||data.ok!==true)
     throw Error(data&&typeof data==='object'&&'message' in data&&typeof data.message==='string'?
       data.message:'Restoration not confirmed. Refresh archived records before retrying.');
   window.location.assign('/employees');
  }catch(e){setError(e instanceof Error?e.message:'Restoration not confirmed.');}
  finally{setBusy(false);}
 }
 return <article className="employee-archived-record">
   <h2>{record.fullName}</h2><p>{record.email} · {record.department} · {record.jobTitle}</p>
   <p>Removed {new Date(record.removedAt).toLocaleDateString('en-IN')} · {record.reason}</p>
   <button type="button" aria-expanded={open} disabled={busy}
      onClick={()=>{setOpen(v=>!v);setConfirmed(false);setError('');}}>
      {open?'Close review':'Review restoration'}</button>
   {open&&<form onSubmit={submit}>
     <p>Restoration returns this record to <strong>Onboarding</strong>. Previous identity links,
       project memberships and HR access stay revoked. New consent and assignments are required.</p>
     {error&&<p role="alert">{error}</p>}
     <label>Restoration reason (8–500 characters)
       <textarea required minLength={8} maxLength={500} rows={3} disabled={busy}
         value={reason} onChange={e=>{setReason(e.target.value.replace(/[\u0000-\u001f\u007f]/g,' '));setConfirmed(false);}}/>
     </label>
     <label className="employee-live-confirm"><input type="checkbox" checked={confirmed} disabled={busy}
       onChange={e=>setConfirmed(e.target.checked)}/>
       I have reviewed the archived identity and confirm access is not automatically restored.</label>
     <div className="employee-live-edit-actions">
       <button type="button" disabled={busy} onClick={()=>setOpen(false)}>Cancel</button>
       <button type="submit" disabled={busy||!confirmed||reason.trim().length<8}>
         {busy?'Restoring…':'Restore to Onboarding'}</button>
     </div>
   </form>}
 </article>;
}
export function ArchivedEmployeeList({records}:{records:readonly ArchivedWorker[]}){
 return <main className="workspace-content employee-live-workspace" id="mainContent" tabIndex={-1}>
   <nav className="employee-live-breadcrumb"><Link href="/employees">Employees</Link><span>/ Archived employees</span></nav>
   <header className="employee-live-heading"><div>
     <h1>Archived employees</h1><p>Platform owner · Current archived workforce records</p>
   </div><Link className="employee-live-action" href="/employees/archived">Refresh</Link></header>
   <section className="employee-live-panel">
     <p role="status">{records.length} archived records (up to 100).</p>
     {!records.length&&<p>No archived employee records.</p>}
     {records.map(r=><RestoreRecord key={r.id} record={r}/>)}
   </section>
 </main>;
}

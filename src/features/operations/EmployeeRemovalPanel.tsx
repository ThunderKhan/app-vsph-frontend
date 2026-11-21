'use client';
import {useState,type FormEvent} from 'react';
import type {RosterEmployee} from './EmployeeLiveContract';

export function EmployeeRemovalPanel({employee,onClose}:{employee:RosterEmployee;onClose:()=>void}){
 const [reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(busy||!confirmed||reason.trim().length<8||reason.trim().length>500)return;
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/employee-lifecycle-action',{
     method:'POST',credentials:'same-origin',cache:'no-store',
     headers:{'Content-Type':'application/json'},
     body:JSON.stringify({operation:'remove',id:employee.id,version:employee.version,
       reason:reason.trim(),confirmed:true})
   });
   if(response.status===401){window.location.assign('/login');return;}
   const data:unknown=await response.json().catch(()=>null);
   if(!response.ok||!data||typeof data!=='object'||!('ok' in data)||data.ok!==true)
     throw Error(data&&typeof data==='object'&&'message' in data&&typeof data.message==='string'?
       data.message:'Removal unconfirmed. Refresh current employee records before retrying.');
   window.location.reload();
  }catch(e){setError(e instanceof Error?e.message:'Unable to confirm employee removal.');}
  finally{setBusy(false);}
 }
 return <section className="employee-live-edit employee-lifecycle-remove" aria-label={'Remove '+employee.fullName}>
   <h3>Remove employee</h3><p>{employee.fullName} · {employee.email}</p>
   <p>This archives the workforce record and revokes employee-only access. Removal is audited.
     Protected owner and self-records cannot be removed through this workflow.</p>
   {error&&<p role="alert">{error}</p>}
   <form onSubmit={submit}>
     <label>Removal reason (8–500 characters)<textarea required minLength={8} maxLength={500}
       rows={3} disabled={busy} value={reason} onChange={e=>{setReason(e.target.value);setConfirmed(false);}}/></label>
     <label className="employee-live-confirm">
       <input type="checkbox" checked={confirmed} disabled={busy}
         onChange={e=>setConfirmed(e.target.checked)}/>
       I reviewed the current employee and confirm removal and access revocation.
     </label>
     <div className="employee-live-edit-actions">
       <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
       <button type="submit" disabled={busy||!confirmed||reason.trim().length<8}>
         {busy?'Removing…':'Confirm employee removal'}</button>
     </div>
   </form>
 </section>;
}

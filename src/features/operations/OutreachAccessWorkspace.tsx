'use client';
import Link from 'next/link';
import {useState,type FormEvent} from 'react';
import {roles,type OutreachUser,type OutreachGrant} from './OutreachAccessContract';
const pretty=(value:string)=>value.replaceAll('_',' ').replace(/\b\w/g,x=>x.toUpperCase());
export function OutreachAccessWorkspace({users,grants}:{users:OutreachUser[];grants:OutreachGrant[]}){
 const [employee,setEmployee]=useState('');
 const [role,setRole]=useState<(typeof roles)[number]>('representative');
 const [review,setReview]=useState<{action:'grant'|'revoke';userId:string;role?:string}|null>(null);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 function requestGrant(e:FormEvent<HTMLFormElement>){e.preventDefault();if(employee)
   setReview({action:'grant',userId:employee,role});}
 async function mutate(){
  if(!review||busy)return;
  setBusy(true);setMessage('');
  try{
   const response=await fetch('/api/outreach-governance',{method:'POST',cache:'no-store',
    credentials:'same-origin',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:review.action,userId:review.userId,confirmed:true,
      ...(review.action==='grant'?{role:review.role}:{})})});
   if(response.status===401){window.location.replace('/login');return;}
   const raw:unknown=await response.json().catch(()=>null);
   if(!response.ok)throw Error(raw&&typeof raw==='object'&&'message' in raw&&typeof raw.message==='string'?
     raw.message:'Outreach access was not confirmed. Refresh current grants.');
   window.location.reload();
  }catch(e){setMessage(e instanceof Error?e.message:'Outreach service unavailable.');}
  finally{setBusy(false);}
 }
 return <main className="workspace-content outreach-live" id="mainContent">
   <header><div><p className="eyebrow">INTERNAL APPLICATION</p><h1>Outreach Access</h1></div>
    <Link href="/admin">Back to administration</Link></header>
   {message&&<p role="alert">{message}</p>}
   <section className="outreach-panel"><h2>Grant employee access</h2>
    <form onSubmit={requestGrant}><div className="outreach-fields">
     <label>Employee account<select required value={employee}
       onChange={e=>{setEmployee(e.target.value);setReview(null);}}>
       <option value="">Select account</option>
       {users.map(u=><option key={u.id} value={u.id}>{u.full_name} · {u.email}</option>)}
     </select></label>
     <label>Outreach role<select value={role}
       onChange={e=>{setRole(e.target.value as typeof role);setReview(null);}}>
       {roles.map(r=><option key={r} value={r}>{pretty(r)}</option>)}
     </select></label>
    </div><button type="submit" disabled={busy||!employee}>Grant access</button></form>
   </section>
   <section className="outreach-panel"><div className="outreach-section-head">
    <h2>Existing grants</h2>
    <button type="button" disabled={busy} onClick={()=>window.location.reload()}>Refresh</button>
   </div><div className="outreach-table-wrap" role="region" aria-label="Existing grants" tabIndex={0}>
    <table><thead><tr><th>Employee</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
     <tbody>{grants.length?grants.map(g=><tr key={g.user_id}>
      <td><strong>{g.full_name||g.user_id}</strong><small>{g.email}</small></td>
      <td>{pretty(g.role_code)}</td><td>{pretty(g.status)}</td>
      <td>{g.status==='enabled'&&<button type="button" disabled={busy}
         onClick={()=>setReview({action:'revoke',userId:g.user_id})}>Revoke</button>}</td>
     </tr>):<tr><td colSpan={4}>No Outreach access granted.</td></tr>}</tbody>
    </table>
   </div></section>
   {review&&<section className="outreach-panel">
    <h2>Confirm Outreach access change</h2>
    <p>{review.action==='grant'?'Grant '+pretty(review.role||'')+' access':'Revoke access'} for {
     users.find(u=>u.id===review.userId)?.email||grants.find(g=>g.user_id===review.userId)?.email||review.userId}?</p>
    <p>Owner permission and target access will be rechecked by the backend.</p>
    <button type="button" disabled={busy} onClick={()=>void mutate()}>Confirm</button>
    <button type="button" disabled={busy} onClick={()=>setReview(null)}>Cancel</button>
   </section>}
 </main>;
}

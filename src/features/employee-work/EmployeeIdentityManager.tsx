'use client';
import Link from 'next/link';
import {useRef,useState} from 'react';
import type {ManagerLink,LinkRequest} from './IdentityContract';
export function EmployeeIdentityManager({data}:{data:ManagerLink}){
 const e=data.employee,linked=data.link?.status==='linked';
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [review,setReview]=useState<{action:string;record?:LinkRequest}|null>(null);
 const key=useRef<string|null>(null);
 async function mutate(action:string,record?:LinkRequest){
  if(busy)return;
  const request=action==='request';
  if(request&&!key.current)key.current=crypto.randomUUID();
  const payload={action,employeeId:e.id,rosterVersion:e.version,confirmed:true,
    ...(record?{requestId:record.id,requestVersion:record.version}:{}),
    ...(action==='revoke'?{linkVersion:data.link?.version}:{})};
  setBusy(true);setMessage('Updating current account-link request…');
  try{
   const r=await fetch('/api/employee-identity-action',{method:'POST',
    credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json',...(request?{'Idempotency-Key':key.current!}:{})},
    body:JSON.stringify(payload)});
   if(r.status===401){window.location.replace('/login');return;}
   const body:unknown=await r.json().catch(()=>null);
   if(!r.ok)throw Error(body&&typeof body==='object'&&'message' in body&&typeof body.message==='string'?
      body.message:'The identity change was not confirmed. Refresh and inspect before retrying.');
   key.current=null;window.location.reload();
  }catch(err){setMessage(err instanceof Error?err.message:'Account-link service unavailable.');}
  finally{setBusy(false);}
 }
 return <main className="workspace-content identity-live" id="mainContent">
  <header><h1>Employee account &amp; access</h1>
    <button type="button" disabled={busy} onClick={()=>window.location.reload()}>Refresh</button></header>
  {message&&<p role="alert">{message}</p>}
  <section className="identity-panel">
   <h2>{e.fullName}</h2><p>{e.email}</p>
   <div className="identity-grid">
    <article><strong>Login setup</strong><p>{linked?'Accepted':'Not linked'}</p></article>
    <article><strong>Employment status</strong><p>{e.status.replaceAll('_',' ')}</p></article>
   </div>
  </section>
  <section className="identity-panel"><h3>Access &amp; permissions</h3>
   <p>{linked?'The employee has accepted their personal account link. HR authority and customer or project access still require separate approval.':'Account linking and HR permissions are governed independently.'}</p>
   <h4>HR authority</h4>
   <p>{data.hrReadiness?.message||'HR permissions can be granted only by an authorized platform owner.'}</p>
   {data.hrReadiness?.canGrant&&<button type="button" disabled={busy}
     onClick={()=>setReview({action:'grant_hr'})}>Grant HR</button>}
   {linked?<button type="button" disabled={busy} onClick={()=>setReview({action:'revoke'})}>
     Revoke employee account link</button>:
     ['active','onboarding'].includes(e.status)&&
       <button type="button" disabled={busy||data.hrReadiness?.canRequest===false}
         onClick={()=>setReview({action:'request'})}>Request account link</button>}
   <p>Revoking an employee link does not automatically disable an unrelated portal login or customer access.</p>
   {review&&<div className="identity-confirm">
     <p>Confirm {review.action.replaceAll('_',' ')} for {e.email}. Current roles and sessions will be rechecked by the backend.</p>
     <button type="button" disabled={busy} onClick={()=>void mutate(review.action,review.record)}>Confirm</button>
     <button type="button" disabled={busy} onClick={()=>setReview(null)}>Cancel</button>
   </div>}
   <Link href="/hr/access">HR access governance</Link>
  </section>
  <section className="identity-panel"><h3>Account activity</h3>
    <details><summary>{data.requests.length} account-link request{data.requests.length===1?'':'s'} · View history</summary>
      {data.requests.map(r=><article key={r.id} className="identity-history">
        <h4>{r.state}</h4><p>Original expiry: {new Date(r.expires_at).toLocaleString()}</p>
        {['pending','expired'].includes(r.state)&&<div className="identity-actions">
          <button disabled={busy} type="button" onClick={()=>setReview({action:'renew',record:r})}>Renew request</button>
          <button disabled={busy} type="button" onClick={()=>setReview({action:'cancel',record:r})}>Cancel request</button>
        </div>}
      </article>)}
      {!data.requests.length&&<p>No account-link requests recorded.</p>}
    </details>
  </section>
  <section className="identity-panel"><h3>Employee login invitation</h3>
   <p>New-account enrollment, temporary credentials and private setup links use a separately approved issuance flow. No setup links or passwords are produced by this account-link screen.</p>
  </section>
 </main>;
}

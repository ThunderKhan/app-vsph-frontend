'use client';
import {useState,type FormEvent} from 'react';
import type {PersonalIdentity,PersonalRequest} from './IdentityContract';
export function EmploymentWorkspace({data}:{data:PersonalIdentity}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [current,setCurrent]=useState<string|null>(null),[password,setPassword]=useState('');
 const [totpCode,setTotpCode]=useState(''),[factorId,setFactorId]=useState('');
 const [factors,setFactors]=useState<{id:string;name:string}[]>([]);
 const [agreed,setAgreed]=useState(false);
 async function accept(request:PersonalRequest,e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!agreed||busy)return;
  const secret=password;
  setBusy(true);setPassword('');setMessage('Verifying your current account…');
  try{
   const response=await fetch('/api/employee-identity-action',{method:'POST',
    credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'accept',requestId:request.id,rosterVersion:request.roster_version,
      requestVersion:request.version,confirmed:true,password:secret,
      ...(totpCode?{totpCode}:{}),...(factorId?{totpFactorId:factorId}:{})})});
   const body:unknown=await response.json().catch(()=>null);
   setTotpCode('');
   if(response.ok){window.location.reload();return;}
   if(body&&typeof body==='object'&&'code' in body&&body.code==='MFA_REQUIRED'){
      const next='factors' in body&&Array.isArray(body.factors)?body.factors:[];
      setFactors(next.filter((x:unknown)=>x!==null&&typeof x==='object'&&
        'id' in x&&typeof x.id==='string'&&'name' in x&&typeof x.name==='string')
        .map((x:unknown)=>({id:(x as {id:string}).id,name:(x as {name:string}).name})));
      setMessage('Authenticator verification required. Re-enter your password and use the enrolled factor.');
      return;
   }
   if(response.status===401){window.location.replace('/login');return;}
   throw Error(body&&typeof body==='object'&&'message' in body&&typeof body.message==='string'?
     body.message:'Link acceptance was not confirmed. Refresh before retrying.');
  }catch(error){setMessage(error instanceof Error?error.message:'Link acceptance unavailable.');}
  finally{setBusy(false);}
 }
 return <main className="workspace-content identity-live" id="mainContent">
   <header><h1>My employment</h1></header>
   {message&&<p role="alert">{message}</p>}
   <button type="button" disabled={busy} onClick={()=>window.location.reload()}>Refresh</button>
   {data.employment.map((item,i)=><article className="identity-panel" key={item.full_name+':'+i}>
    <h2>{item.full_name}</h2><p>{item.department} · {item.job_title} · {item.status}</p>
    <p>Start date {item.start_date}</p>
   </article>)}
   {data.requests.map(r=><article className="identity-panel" key={r.id}>
    <h2>{r.full_name} — account-link request</h2>
    <p>{r.department} · {r.job_title} · expires {new Date(r.expires_at).toLocaleString()}</p>
    {r.current_roster_version!==r.roster_version?
      <p>This roster changed. Ask the issuer to renew the request before accepting.</p>:
      current!==r.id?<button type="button" onClick={()=>{setCurrent(r.id);setPassword('');setAgreed(false);setFactors([]);}}>
       Review account link</button>:
      <form onSubmit={e=>void accept(r,e)}>
        <label>Confirm your password<input type="password" autoComplete="current-password"
          maxLength={4096} required value={password} disabled={busy}
          onChange={e=>setPassword(e.target.value)}/></label>
        {factors.length>0&&<>
          <label>Authenticator code<input inputMode="numeric" autoComplete="one-time-code"
            pattern="[0-9]{6}" maxLength={6} required value={totpCode} disabled={busy}
            onChange={e=>setTotpCode(e.target.value)}/></label>
          <label>Authenticator<select value={factorId} required onChange={e=>setFactorId(e.target.value)}>
            <option value="">Select authenticator</option>{factors.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
          </select></label>
        </>}
        <label><input type="checkbox" required checked={agreed} onChange={e=>setAgreed(e.target.checked)}/>
          I agree to link my existing account to this employee record.</label>
        <button type="submit" disabled={!agreed||busy}>Accept account link</button>
        <button type="button" onClick={()=>setCurrent(null)} disabled={busy}>Cancel</button>
      </form>}
   </article>)}
   {!data.employment.length&&!data.requests.length&&
      <p>No active employment link or eligible account-link request is available. Ask VSPH to review your roster/account mapping.</p>}
 </main>;
}

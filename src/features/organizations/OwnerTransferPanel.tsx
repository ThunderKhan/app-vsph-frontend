'use client';
import {useState,type FormEvent} from 'react';
import type {OrgMember} from './OrganizationContract';
import {parseOwnerTransferPreview,parseOwnerMfaFactors,type OwnerTransferPreview} from './OwnerTransferContract';

export function OwnerTransferPanel({organizationId,members}:{organizationId:string;members:OrgMember[]}){
 const eligible=members.filter(m=>m.role==='admin'&&m.status==='active'&&m.account_status==='active');
 const [targetId,setTargetId]=useState(eligible[0]?.user_id||'');
 const [review,setReview]=useState<OwnerTransferPreview|null>(null);
 const [password,setPassword]=useState(''),[totpCode,setTotpCode]=useState('');
 const [factorId,setFactorId]=useState(''),[factors,setFactors]=useState<{id:string;name:string}[]>([]);
 const [agreed,setAgreed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 function reset(){
   setReview(null);setPassword('');setTotpCode('');setFactorId('');
   setAgreed(false);setFactors([]);setMessage('');
 }
 async function loadPreview(){
  if(busy||!targetId)return;
  reset();setBusy(true);
  try{
    const url='/api/owner-transfer-preview?'+new URLSearchParams({
      organizationId,targetUserId:targetId,
    });
    const response=await fetch(url,{credentials:'same-origin',cache:'no-store'});
    if(response.status===401){window.location.assign('/login');return;}
    const raw:unknown=await response.json().catch(()=>null);
    if(!response.ok)throw Error(raw&&typeof raw==='object'&&'message' in raw&&typeof raw.message==='string'?
      raw.message:'Current owner and administrator eligibility could not be verified.');
    const checked=parseOwnerTransferPreview(raw,organizationId,targetId);
    if(!checked)throw Error('Ownership review was invalid. Reload current membership data.');
    setReview(checked);
  }catch(error){setMessage(error instanceof Error?error.message:'Ownership review unavailable.');}
  finally{setBusy(false);}
 }
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!review||!agreed||!password||busy||
    (factors.length>0&&(!/^[0-9]{6}$/.test(totpCode)||!factorId)))return;
  const secret=password;
  setPassword('');setTotpCode('');setBusy(true);setMessage('Verifying current owner identity…');
  try{
    const response=await fetch('/api/owner-transfer-action',{
      method:'POST',credentials:'same-origin',cache:'no-store',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({...review,confirmed:true,password:secret,
        ...(factors.length?{totpCode,totpFactorId:factorId}:{})}),
    });
    if(response.status===401){window.location.assign('/login');return;}
    const result:unknown=await response.json().catch(()=>null);
    if(response.ok&&result&&typeof result==='object'&&'ok' in result&&result.ok===true){
      window.location.assign('/organizations');return;
    }
    if(result&&typeof result==='object'&&'code' in result&&result.code==='MFA_REQUIRED'){
      setFactors('factors' in result?parseOwnerMfaFactors(result.factors):[]);
      setFactorId('');setMessage('Enter your enrolled authenticator code and re-enter your password.');
      return;
    }
    if(response.status===409){reset();setMessage('Ownership changed. Reload and review the target again.');return;}
    throw Error(result&&typeof result==='object'&&'message' in result&&typeof result.message==='string'?
      result.message:'Ownership transfer was not confirmed. Inspect current memberships before retrying.');
  }catch(error){setMessage(error instanceof Error?error.message:'Ownership transfer was not confirmed.');}
  finally{setBusy(false);}
 }
 return <div className="org-owner-transfer">
   <p>Only the current sole active owner may transfer to an accepted active administrator.
      Your account becomes an administrator, and both users' organization sessions are revoked.
      Product grants, subscriptions and project memberships are preserved.</p>
   {!eligible.length?<p>No eligible active administrator on this members page. Review the next members page
       or ask VSPH to verify the administrator account.</p>:<>
    <label>New organization owner
      <select value={targetId} disabled={busy} onChange={e=>{setTargetId(e.target.value);reset();}}>
        {eligible.map(m=><option key={m.user_id} value={m.user_id}>
          {m.full_name} · {m.email}</option>)}
      </select>
    </label>
    <button type="button" disabled={busy} onClick={()=>void loadPreview()}>
      {busy?'Checking…':'Review owner transfer'}</button>
   </>}
   {message&&<p role="alert">{message}</p>}
   {review&&<form onSubmit={e=>void submit(e)} autoComplete="off">
     <h3>Confirm transfer to {review.targetName}</h3>
     <p>{review.targetEmail} · Target admin version {review.targetVersion}</p>
     <p>Organization version {review.organizationVersion} · Current owner version {review.ownerVersion}.
       These versions must still match when verified and transferred.</p>
     <label>Current account password
       <input type="password" required maxLength={4096} autoComplete="current-password"
         disabled={busy} value={password} onChange={e=>setPassword(e.target.value)}/>
     </label>
     {factors.length>0&&<>
       <label>Authenticator
         <select required disabled={busy} value={factorId} onChange={e=>setFactorId(e.target.value)}>
           <option value="">Choose enrolled authenticator</option>
           {factors.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
         </select>
       </label>
       <label>Six-digit authenticator code
         <input inputMode="numeric" required pattern="[0-9]{6}" maxLength={6}
           autoComplete="one-time-code" disabled={busy} value={totpCode}
           onChange={e=>setTotpCode(e.target.value)}/>
       </label>
     </>}
     <label className="org-owner-consent">
       <input type="checkbox" required checked={agreed} disabled={busy}
         onChange={e=>setAgreed(e.target.checked)}/>
       I confirm that I will become an administrator and that the selected active
       administrator will become this organization's owner.
     </label>
     <div className="org-actions">
       <button type="submit" disabled={busy||!agreed||!password||
         (factors.length>0&&(!factorId||!/^[0-9]{6}$/.test(totpCode)))}>
         {busy?'Verifying…':'Verify identity and transfer ownership'}</button>
       <button type="button" disabled={busy} onClick={reset}>Cancel transfer</button>
     </div>
     <p>If the response is interrupted, refresh and verify the current owner before retrying.
       A fresh review and credential verification are required for every attempt.</p>
   </form>}
 </div>;
}

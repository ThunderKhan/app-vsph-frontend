'use client';
import {useEffect,useState,type FormEvent} from 'react';
import type {AppWorkspaceContext,AppRecord} from './AppWorkspaceContract';

export function AppHomeWorkspace({code}:{code:string}){
 const [context,setContext]=useState<AppWorkspaceContext|null>(null);
 const [records,setRecords]=useState<AppRecord[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [message,setMessage]=useState('Checking your application session…');
 const [one,setOne]=useState(''),[two,setTwo]=useState(''),[three,setThree]=useState('');
 const base='/api/apps/'+code;
 const appLogin='/apps/'+code.toLowerCase()+'/login';
 async function loadRecords(){
  const response=await fetch(base+'/records',{credentials:'same-origin',cache:'no-store'});
  if(response.status===401){window.location.assign(appLogin);return;}
  if(!response.ok)throw Error('Product records could not be verified.');
  const raw:unknown=await response.json().catch(()=>null);
  if(!raw||typeof raw!=='object'||!('records' in raw)||!Array.isArray(raw.records))
    throw Error('Invalid product records response.');
  setRecords(raw.records as AppRecord[]);
 }
 useEffect(()=>{
  let active=true;
  void (async()=>{
   try{
    const response=await fetch(base+'/context',{credentials:'same-origin',cache:'no-store'});
    if(!active)return;
    if(response.status===401){window.location.assign(appLogin);return;}
    if(!response.ok)throw Error(response.status===403?
      'Your current application entitlement was revoked.':
      'Application context could not be verified.');
    const raw:unknown=await response.json().catch(()=>null);
    if(!raw||typeof raw!=='object'||!('application' in raw)||!('organization' in raw)||
       !('integration' in raw))throw Error('Invalid application context.');
    const value=raw as AppWorkspaceContext;
    if(value.application.code!==code)throw Error('Unexpected product identity.');
    setContext(value);
    if(value.integration.recordsConfigured){
      const found=await fetch(base+'/records',{credentials:'same-origin',cache:'no-store'});
      if(!active)return;
      if(found.status===401){window.location.assign(appLogin);return;}
      if(!found.ok)throw Error('Records could not be verified.');
      const contents:unknown=await found.json().catch(()=>null);
      if(!contents||typeof contents!=='object'||!('records' in contents)||
        !Array.isArray(contents.records))throw Error('Invalid records response.');
      setRecords(contents.records as AppRecord[]);
    }
    setMessage('Application access verified. Every record is scoped by the backend.');
   }catch(err){if(active){
     setContext(null);setRecords([]);
     setMessage(err instanceof Error?err.message:'Application unavailable.');
   }}
   finally{if(active)setLoading(false);}
  })();
  return ()=>{active=false;};
 // On a new app code, Next rekeys the component; the scoped API URL is fixed for the mount.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[code]);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!context?.canCreateRecords||busy||loading)return;
  const body=code==='CRM'?{name:one,email:two,company:three}:
    {song_title:one,artist:two};
  setBusy(true);setMessage('Saving authorized record…');
  try{
    // Another browser tab can reauthenticate this product for a different
    // customer. Recheck the currently selected customer before creating.
    // Backend enforcement of the original customer ID is still required to
    // close the race between this check and the mutation.
    const latestResponse=await fetch(base+'/context',{
      credentials:'same-origin',cache:'no-store'});
    if(latestResponse.status===401){window.location.assign(appLogin);return;}
    if(!latestResponse.ok)throw Error('Current application access could not be verified.');
    const latest:unknown=await latestResponse.json().catch(()=>null);
    const current=latest as Partial<AppWorkspaceContext>|null;
    if(!current||current.application?.code!==code||!current.organization?.id||
      current.organization.id.toLowerCase()!==context.organization.id.toLowerCase()||
      current.canCreateRecords!==true){
      setContext(null);setRecords([]);
      throw Error('Your customer or product role changed. Reload this workspace before creating a record.');
    }
    const response=await fetch(base+'/records',{method:'POST',
     credentials:'same-origin',cache:'no-store',
     headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(response.status===401){window.location.assign(appLogin);return;}
    if(response.status!==201)throw Error(response.status===403?'Product role cannot create records.':
      'Record creation was not confirmed.');
    setOne('');setTwo('');setThree('');
    await loadRecords();
    setMessage('Record added to the selected customer workspace.');
  }catch(err){setMessage(err instanceof Error?err.message:'Record creation unavailable.');}
  finally{setBusy(false);}
 }
 async function logout(){
  if(busy)return;setBusy(true);setMessage('Signing out of this application…');
  try{
   const response=await fetch('/api/auth/app-logout',{method:'POST',
     credentials:'same-origin',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({app:code}),cache:'no-store'});
   if(!response.ok)throw Error('Application logout was not confirmed.');
   window.location.assign('/dashboard');
  }catch(err){setMessage(err instanceof Error?err.message:'Application logout failed.');setBusy(false);}
 }
 const activeAdapter=code==='CRM'||code==='MUSIC';
 const headings=code==='CRM'?['Contact','Email','Company']:['Song','Artist','Status'];
 return <main className="workspace-content app-home-live" id="mainContent" tabIndex={-1}>
  <header className="app-home-header"><div>
    <p className="app-home-kicker">VSPH APPLICATION WORKSPACE</p>
    <h1>{context?.application.name||code}</h1>
    <p>Authorized customer product workspace</p>
   </div><button type="button" disabled={busy||loading} onClick={()=>void logout()}>
    Log out of application</button>
  </header>
  <section className="app-home-panel" aria-label="Application account">
   <h2>Welcome{context?', '+context.user.name:''}</h2>
   <p role="status">{message}</p>
   {context&&<p><strong>Customer:</strong> {context.organization.name}
    {' · '}<strong>Role:</strong> {context.role.replaceAll('_',' ')}</p>}
  </section>
  {context&&<section className="app-home-panel">
   <h2>{context.integration.heading}</h2>
   <p>Records belong only to the selected customer. Product roles and write authority
      are checked again by the backend for every request.</p>
   {!context.integration.recordsConfigured?<p>No operational record adapter is connected.
      External product health has not been verified.</p>:<>
    {context.canCreateRecords&&activeAdapter?
     <form className="app-home-form" onSubmit={e=>void submit(e)}>
      <label>{code==='CRM'?'Contact name':'Song title'}
       <input required maxLength={150} value={one} disabled={busy} onChange={e=>setOne(e.target.value)}/></label>
      <label>{code==='CRM'?'Email':'Artist'}
       <input type={code==='CRM'?'email':'text'} maxLength={190} value={two} disabled={busy}
        onChange={e=>setTwo(e.target.value)}/></label>
      {code==='CRM'&&<label>Company
       <input maxLength={150} value={three} disabled={busy} onChange={e=>setThree(e.target.value)}/></label>}
      <button type="submit" disabled={busy||loading||!one.trim()}>{busy?'Saving…':'Add record'}</button>
     </form>:<p>View-only access for this product role.</p>}
    <div role="region" tabIndex={0} aria-label="Product records, horizontally scrollable"
      className="app-home-records">
     <table><thead><tr>{headings.map(x=><th scope="col" key={x}>{x}</th>)}</tr></thead>
      <tbody>{records.map(r=><tr key={r.id}><td>{r.first}</td><td>{r.second}</td><td>{r.third}</td></tr>)}</tbody>
     </table>
    </div>
    {!records.length&&<p>No authorized records are available.</p>}
   </>}
  </section>}
 </main>;
}

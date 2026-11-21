'use client';
import {useState,type FormEvent} from 'react';
import type {ProjectDetail} from './ProjectDetailContract';
import type {DeliveryData} from './EngineeringDeliveryContract';
import {parseRepositoryDiscovery,type DiscoverableRepository} from './DeliveryMutationContract';
type RepositoryDiscovery={repositories:DiscoverableRepository[];nextPage:number|null;truncated:boolean};
export function EngineeringDeliveryActions({project,delivery,platformOwner}:{
 project:ProjectDetail;delivery:DeliveryData;platformOwner:boolean;
}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [newInstallation,setNewInstallation]=useState('');
 const active=delivery.installations.filter(i=>i.status==='active');
 const [installation,setInstallation]=useState(String(active[0]?.installationId||''));
 const [confirmRevoke,setConfirmRevoke]=useState(false);
 const [confirmDisconnect,setConfirmDisconnect]=useState<string|null>(null);
 const [discovery,setDiscovery]=useState<RepositoryDiscovery|null>(null);
 const [currentPage,setCurrentPage]=useState(1);
 const [chosenWork,setChosenWork]=useState<Record<string,string>>({});
 const manager=project.role==='manager'&&!['archived','completed'].includes(project.project.status);
 const usable=manager&&delivery.configured;
 async function action(body:Record<string,unknown>){
  if(busy)return;
  setBusy(true);setMessage('Submitting approved GitHub delivery action…');
  try{
   const response=await fetch('/api/github-delivery-action',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({projectId:project.project.id,...body}),
   });
   if(response.status===401){window.location.assign('/login');return;}
   const data:unknown=await response.json().catch(()=>null);
   if(!response.ok||!data||typeof data!=='object'||!('ok' in data)||data.ok!==true)
      throw Error(data&&typeof data==='object'&&'message' in data&&typeof data.message==='string'?
        data.message:'GitHub operation was not confirmed. Refresh before retrying.');
   window.location.reload();
  }catch(err){setMessage(err instanceof Error?err.message:'GitHub operation was not confirmed.');}
  finally{setBusy(false);}
 }
 async function discover(page:number){
  if(busy||!installation||!Number.isSafeInteger(Number(installation))||page>50)return;
  setBusy(true);setMessage('Discovering authorized repositories…');setDiscovery(null);
  try{
   const path='/api/github-repositories?'+new URLSearchParams({
      projectId:project.project.id,installationId:installation,page:String(page)
   });
   const response=await fetch(path,{credentials:'same-origin',cache:'no-store'});
   if(response.status===401){window.location.assign('/login');return;}
   const data:unknown=await response.json().catch(()=>null);
   if(!response.ok)throw Error(data&&typeof data==='object'&&'message' in data&&typeof data.message==='string'?
      data.message:'Repository discovery denied or unavailable.');
   const parsed=parseRepositoryDiscovery(data);
   if(!parsed)throw Error('Repository discovery response was invalid.');
   setCurrentPage(page);setDiscovery(parsed);setMessage('Authorized repository page loaded.');
  }catch(err){setMessage(err instanceof Error?err.message:'Repository discovery unavailable.');}
  finally{setBusy(false);}
 }
 const linkedIds=new Set(delivery.links.map(l=>l.recordId));
 const linkable=delivery.records.filter(r=>['pull','release'].includes(r.kind));
 const selector=(recordId:string)=>chosenWork[recordId]||'';
 return <section className="engineering-panel engineering-actions">
  <h2>Repository governance</h2>
  <p>Provider access is controlled by the approved GitHub App and current project membership.
    Installation tokens, private keys and webhooks remain entirely server-side.</p>
  {message&&<p role="alert">{message}</p>}
  {platformOwner&&manager&&<form onSubmit={(e:FormEvent<HTMLFormElement>)=>{
     e.preventDefault();void action({action:'approve',installationId:Number(newInstallation)});
   }}>
     <h3>Approve GitHub installation</h3>
     <label>Verified installation ID<input type="number" required min={1} step={1}
       value={newInstallation} onChange={e=>setNewInstallation(e.target.value)}/></label>
     <button type="submit" disabled={busy||!delivery.configured||!Number.isSafeInteger(Number(newInstallation))||
       Number(newInstallation)<=0}>Verify and approve installation</button>
   </form>}
  {usable&&active.length>0&&<>
    <div className="engineering-governance-row">
     <label>Approved installation
       <select value={installation} disabled={busy} onChange={e=>{
         setInstallation(e.target.value);setDiscovery(null);setConfirmRevoke(false);}}>
         {active.map(i=><option key={i.installationId} value={i.installationId}>
           {i.accountLogin} · {i.installationId}</option>)}
       </select>
     </label>
     <button type="button" disabled={busy} onClick={()=>void discover(1)}>Discover repositories</button>
    </div>
    {platformOwner&&<div className="engineering-governance-row">
      {confirmRevoke?<><p>Revoking the installation hides connected project repository observations.</p>
        <button type="button" disabled={busy} onClick={()=>void action({
          action:'revoke',installationId:Number(installation)})}>Confirm installation revocation</button>
        <button type="button" disabled={busy} onClick={()=>setConfirmRevoke(false)}>Cancel</button></>:
        <button type="button" disabled={busy} onClick={()=>setConfirmRevoke(true)}>Review installation revocation</button>}
    </div>}
    {discovery&&<section aria-label="Authorized GitHub repositories">
      <h3>Available repositories (page {currentPage})</h3>
      {!discovery.repositories.length&&<p>No repositories authorized for this installation on this page.</p>}
      {discovery.repositories.map(r=><div className="engineering-repository" key={r.repositoryId}>
        <span>{r.fullName} · {r.private?'Private':'Public'}</span>
        <button type="button" disabled={busy} onClick={()=>void action({action:'connect',
          installationId:Number(installation),repositoryId:r.repositoryId})}>Connect repository</button>
      </div>)}
      {discovery.nextPage&&<button type="button" disabled={busy}
        onClick={()=>void discover(discovery.nextPage!)}>Next repository page</button>}
      {discovery.truncated&&<p>Discovery budget reached. Narrow the approved installation selection.</p>}
    </section>}
  </>}
  {manager&&<section>
    <h3>Manage existing connections</h3>
    {delivery.connections.filter(c=>c.status!=='disconnected').map(c=>
     <div className="engineering-repository" key={c.id}>
      <strong>{c.fullName}</strong>
      <div className="engineering-governance-row">
       <button type="button" disabled={busy||!delivery.configured}
         onClick={()=>void action({action:'sync',connectionId:c.id,version:c.version})}>
           Synchronize next page</button>
       {confirmDisconnect===c.id?<>
        <p>Confirm disconnect. Previously collected observations will be hidden.</p>
        <button type="button" disabled={busy} onClick={()=>void action({
          action:'disconnect',connectionId:c.id,version:c.version})}>Confirm disconnect</button>
        <button type="button" onClick={()=>setConfirmDisconnect(null)}>Cancel</button>
       </>:<button type="button" disabled={busy} onClick={()=>setConfirmDisconnect(c.id)}>
         Review disconnect</button>}
      </div>
     </div>)}
  </section>}
  {manager&&linkable.length>0&&<section>
    <h3>Explicitly link GitHub evidence to project work</h3>
    <p>Only recorded pull requests and releases can be linked to an existing project task or milestone.
      No relationship is inferred from titles.</p>
    {linkable.map(r=><form key={r.id} onSubmit={e=>{
       e.preventDefault();const parts=selector(r.id).split(':');
       if(parts.length!==2)return;
       void action({action:'link',recordId:r.id,workKind:parts[0],workId:parts[1]});
     }}>
       <strong>{r.title}</strong>
       <label>Project task or milestone
         <select value={selector(r.id)} onChange={e=>setChosenWork(v=>({...v,[r.id]:e.target.value}))}>
           <option value="">Choose task or milestone</option>
           {project.tasks.map(t=><option key={'task:'+t.id} value={'task:'+t.id}>Task: {t.title}</option>)}
           {project.milestones.map(m=><option key={'milestone:'+m.id} value={'milestone:'+m.id}>
             Milestone: {m.title}</option>)}
         </select>
       </label>
       <button type="submit" disabled={busy||!selector(r.id)}>Save explicit link</button>
       {linkedIds.has(r.id)&&<small>Existing link can be replaced by a reviewed selection.</small>}
     </form>)}
  </section>}
 </section>;
}

'use client';
import Link from 'next/link';
import {useState,type FormEvent} from 'react';
import type {ProjectDetail} from './ProjectDetailContract';
import type {ProjectWorkspaceData} from './ProjectWorkspaceContract';
const label=(s:string)=>s.replaceAll('_',' ');
export function ProjectWorkspaceLive({project:data,workspace,actorId}:{
 project:ProjectDetail;workspace:ProjectWorkspaceData;actorId:string;
}){
 const p=data.project;
 const canEdit=workspace.canManage&&!['archived','completed'].includes(p.status);
 const canToggle=canEdit||workspace.role==='contributor'&&!['archived','completed'].includes(p.status);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [checklist,setChecklist]=useState({milestoneId:data.milestones[0]?.id||'',title:'',assigneeId:''});
 const [risk,setRisk]=useState({title:'',severity:'medium'});
 const [resource,setResource]=useState({label:'',url:'',category:'document',shared:false});
 const [update,setUpdate]=useState({summary:'',health:'on_track',nextSteps:'',shared:false});
 async function mutate(action:string,body:Record<string,unknown>){
  if(busy)return;
  setBusy(true);setMessage('Saving project delivery change…');
  try{
   const response=await fetch('/api/project-workspace-action',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({projectId:p.id,version:p.version,action,...body})
   });
   if(response.status===401){window.location.assign('/login');return;}
   const result:unknown=await response.json().catch(()=>null);
   if(!response.ok||!result||typeof result!=='object'||!('ok' in result)||result.ok!==true)
     throw Error(result&&typeof result==='object'&&'message' in result&&typeof result.message==='string'?
       result.message:'Project operation not confirmed. Refresh before retrying.');
   window.location.reload();
  }catch(err){setMessage(err instanceof Error?err.message:'Project change not confirmed.');}
  finally{setBusy(false);}
 }
 const submitChecklist=(e:FormEvent<HTMLFormElement>)=>{
   e.preventDefault();if(!canEdit||!checklist.milestoneId)return;
   void mutate('checklist-add',{milestoneId:checklist.milestoneId,title:checklist.title,assigneeId:checklist.assigneeId||null});
 };
 const submitRisk=(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(canEdit)void mutate('risk-add',risk);
 };
 const submitResource=(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(canEdit)void mutate('resource-add',resource);
 };
 const submitUpdate=(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(canEdit)void mutate('update-publish',update);
 };
 const assignable=data.members.filter(m=>m.status==='active'&&['manager','contributor'].includes(m.role));
 const milestone=(id:string)=>data.milestones.find(m=>m.id===id)?.title||'Authorized milestone';
 return <main className="workspace-content project-workspace-live" id="mainContent" tabIndex={-1}>
  <nav><Link href={'/projects/'+p.id}>Back to project</Link></nav>
  <header className="project-delivery-header"><div>
    <h1>Project delivery workspace</h1>
    <p>{p.name} · {p.key} · {label(p.status)} · Your role: {label(workspace.role)}</p>
  </div><button type="button" disabled={busy} onClick={()=>window.location.reload()}>Refresh</button></header>
  <p>Read-only project records remain available where authorized. All mutations
    recheck role, task assignment and project version in the legacy backend.</p>
  {message&&<p role="alert" className="project-delivery-error">{message}</p>}
  <section className="project-delivery-panel">
    <h2>Milestone checklists</h2>
    {workspace.checklist.length===0&&<p>No milestone checklist records are available.</p>}
    {workspace.checklist.map(item=><article className="project-delivery-record" key={item.id}>
      <div><strong>{item.title}</strong><p>{milestone(item.milestoneId)} · {item.completed?'Completed':'Open'}</p></div>
      {canToggle&&(canEdit||item.assigneeId===actorId)&&
        <button type="button" disabled={busy} onClick={()=>void mutate('checklist-toggle',
          {itemId:item.id,completed:!item.completed})}>
          {item.completed?'Reopen':'Complete'}</button>}
    </article>)}
    {canEdit&&<form onSubmit={submitChecklist}>
      <h3>Add checklist item</h3>
      <div className="project-delivery-fields">
        <label>Milestone<select required value={checklist.milestoneId}
          onChange={e=>setChecklist(s=>({...s,milestoneId:e.target.value}))}>
          {data.milestones.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}
        </select></label>
        <label>Title<input required maxLength={180} value={checklist.title}
          onChange={e=>setChecklist(s=>({...s,title:e.target.value}))}/></label>
        <label>Assignee (optional)<select value={checklist.assigneeId}
          onChange={e=>setChecklist(s=>({...s,assigneeId:e.target.value}))}>
          <option value="">Unassigned</option>{assignable.map(m=><option key={m.user_id}
            value={m.user_id}>{m.full_name||m.user_id}</option>)}
        </select></label>
      </div>
      <button type="submit" disabled={busy||!data.milestones.length}>Add item</button>
    </form>}
  </section>
  {workspace.role!=='client'&&<section className="project-delivery-panel">
    <h2>Risks</h2>{!workspace.risks.length&&<p>No project risks recorded.</p>}
    {workspace.risks.map(r=><article className="project-delivery-record" key={r.id}>
      <div><strong>{r.title}</strong><p>{label(r.severity)} · {label(r.status)}</p></div>
      {canEdit&&<button type="button" disabled={busy} onClick={()=>void mutate('risk-resolve',
        {id:r.id,resolved:r.status!=='resolved'})}>{r.status==='resolved'?'Reopen':'Resolve'}</button>}
    </article>)}
    {canEdit&&<form onSubmit={submitRisk}>
      <h3>Add risk</h3><div className="project-delivery-fields">
       <label>Risk title<input required maxLength={180} value={risk.title}
         onChange={e=>setRisk(s=>({...s,title:e.target.value}))}/></label>
       <label>Severity<select value={risk.severity}
         onChange={e=>setRisk(s=>({...s,severity:e.target.value}))}>
         {['low','medium','high'].map(s=><option key={s}>{s}</option>)}
       </select></label>
      </div><button type="submit" disabled={busy}>Add risk</button>
    </form>}
  </section>}
  <section className="project-delivery-panel">
    <h2>Delivery resources</h2>
    {!workspace.resources.length&&<p>No shared resources recorded.</p>}
    {workspace.resources.map(r=><article className="project-delivery-record" key={r.id}>
     <div><strong>{r.label}</strong><p>{label(r.category)} · {r.shared?'Client-shared':'Internal'}</p>
       <a href={r.url} target="_blank" rel="noopener noreferrer">Open verified HTTPS resource</a></div>
     {canEdit&&<button type="button" disabled={busy}
       onClick={()=>void mutate('resource-archive',{id:r.id})}>Archive resource</button>}
    </article>)}
    {canEdit&&<form onSubmit={submitResource}>
     <h3>Add resource</h3><div className="project-delivery-fields">
       <label>Label<input required maxLength={120} value={resource.label}
         onChange={e=>setResource(s=>({...s,label:e.target.value}))}/></label>
       <label>HTTPS URL<input required type="url" maxLength={1000} value={resource.url}
         onChange={e=>setResource(s=>({...s,url:e.target.value}))}/></label>
       <label>Category<select value={resource.category}
         onChange={e=>setResource(s=>({...s,category:e.target.value}))}>
         {['document','design','repository','deployment','other'].map(s=><option key={s}>{s}</option>)}
       </select></label>
       <label className="project-delivery-check"><input type="checkbox" checked={resource.shared}
         onChange={e=>setResource(s=>({...s,shared:e.target.checked}))}/> Shared with clients</label>
     </div><button type="submit" disabled={busy}>Add resource</button>
    </form>}
  </section>
  <section className="project-delivery-panel">
    <h2>Weekly updates</h2>
    {!workspace.updates.length&&<p>No published updates.</p>}
    {workspace.updates.map(u=><article className="project-delivery-record" key={u.id}>
      <div><strong>{label(u.health)}</strong><p>{new Date(u.createdAt).toLocaleDateString('en-IN')} · {u.shared?'Shared':'Internal'}</p>
        <p>{u.summary}</p>{u.nextSteps&&<p>Next steps: {u.nextSteps}</p>}</div>
    </article>)}
    {canEdit&&<form onSubmit={submitUpdate}>
      <h3>Publish weekly update</h3>
      <label>Summary<textarea rows={4} required minLength={8} maxLength={2500}
        value={update.summary} onChange={e=>setUpdate(s=>({...s,summary:e.target.value}))}/></label>
      <label>Next steps<textarea rows={3} maxLength={1500}
        value={update.nextSteps} onChange={e=>setUpdate(s=>({...s,nextSteps:e.target.value}))}/></label>
      <label>Health<select value={update.health}
        onChange={e=>setUpdate(s=>({...s,health:e.target.value}))}>
        {['on_track','at_risk','off_track'].map(x=><option key={x} value={x}>{label(x)}</option>)}
      </select></label>
      <label className="project-delivery-check"><input type="checkbox" checked={update.shared}
        onChange={e=>setUpdate(s=>({...s,shared:e.target.checked}))}/> Shared with clients</label>
      <button type="submit" disabled={busy}>Publish update</button>
    </form>}
  </section>
 </main>;
}

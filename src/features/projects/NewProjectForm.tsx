'use client';
import Link from 'next/link';
import { useState,type FormEvent } from 'react';
import type { CreationDirectory,ProjectCreation } from './ProjectCreationContract';

export function NewProjectForm({organizations,ownerName}:{
  organizations:CreationDirectory['organizations'];ownerName:string;
}){
  const [name,setName]=useState('');
  const [key,setKey]=useState('');
  const [description,setDescription]=useState('');
  const [kind,setKind]=useState<ProjectCreation['kind']>('internal');
  const [organization,setOrganization]=useState('');
  const [priority,setPriority]=useState<ProjectCreation['priority']>('normal');
  const [startsOn,setStartsOn]=useState('');
  const [dueOn,setDueOn]=useState('');
  const [clientVisible,setClientVisible]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(saving)return;
    setError('');setSaving(true);
    const body={
      key,name:name.trim(),description,kind,
      customerOrganizationId:kind==='customer'?organization:null,
      priority,startsOn,dueOn,clientVisible:kind==='customer'&&clientVisible,
      products:[]
    };
    if(kind==='customer'&&!organization){
      setError('Select an active customer organization.');setSaving(false);return;
    }
    if(startsOn&&dueOn&&dueOn<startsOn){
      setError('The due date cannot precede the start date.');setSaving(false);return;
    }
    try{
      const response=await fetch('/api/project-create',{
        method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(body)
      });
      const result:unknown=await response.json().catch(()=>null);
      if(response.status===401){window.location.assign('/login');return;}
      if(!response.ok||!result||typeof result!=='object'||!('id' in result)||
        typeof result.id!=='string'){
        const message=result&&typeof result==='object'&&'message' in result&&
          typeof result.message==='string'?result.message:'Could not create project.';
        setError(message);return;
      }
      window.location.assign('/projects/'+result.id);
    }catch{setError('Project service unavailable. No creation was confirmed.');}
    finally{setSaving(false);}
  }
  return <main className="workspace-content project-workspace live-project-detail"
    id="mainContent" tabIndex={-1}>
    <nav className="project-live-breadcrumb" aria-label="Breadcrumb">
      <Link href="/projects">Projects</Link><span aria-hidden="true">/</span><span>New project</span>
    </nav>
    <header className="project-heading"><div><h1>New project</h1>
      <p>Create an internal initiative or a customer engagement.</p></div></header>
    <section className="project-live-panel">
      {error&&<p className="feedback-state error-state" role="alert">{error}</p>}
      <form className="project-live-create-form" onSubmit={submit}>
        <p>Accountable owner: <strong>{ownerName}</strong>.
          Additional project managers can be appointed after creation.</p>
        <label>Project name <input required maxLength={150} disabled={saving}
          value={name} onChange={e=>setName(e.target.value)}/></label>
        <label>Project key <input required pattern="[A-Z][A-Z0-9-]{1,19}" maxLength={20}
          placeholder="CLIENT-PORTAL" disabled={saving} value={key}
          onChange={e=>setKey(e.target.value.toUpperCase())}/></label>
        <label>Description <textarea rows={4} maxLength={5000} disabled={saving}
          value={description} onChange={e=>setDescription(e.target.value)}/></label>
        <div className="project-live-create-grid">
          <label>Project type <select value={kind} disabled={saving}
            onChange={e=>{setKind(e.target.value as ProjectCreation['kind']);setClientVisible(false);}}>
            <option value="internal">Internal</option>
            <option value="customer">Customer engagement</option>
          </select></label>
          <label>Priority <select value={priority} disabled={saving}
            onChange={e=>setPriority(e.target.value as ProjectCreation['priority'])}>
            {(['low','normal','high','urgent'] as const).map(p=>
              <option key={p} value={p}>{p}</option>)}</select></label>
          <label>Start date <input type="date" disabled={saving} value={startsOn}
            onChange={e=>setStartsOn(e.target.value)}/></label>
          <label>Due date <input type="date" disabled={saving} value={dueOn}
            onChange={e=>setDueOn(e.target.value)}/></label>
        </div>
        {kind==='customer'&&<>
          <label>Customer organization
            <select required disabled={saving} value={organization}
              onChange={e=>setOrganization(e.target.value)}>
              <option value="">Choose an active organization</option>
              {organizations.map(o=><option value={o.id} key={o.id}>{o.name}</option>)}
            </select></label>
          <label className="project-live-checkbox">
            <input type="checkbox" disabled={saving} checked={clientVisible}
              onChange={e=>setClientVisible(e.target.checked)}/>
            Allow explicitly assigned customer viewers to see shared records
          </label>
        </>}
        <p className="project-live-note">Customer organizations are not granted automatic
          membership or product access. New projects begin with their creator as owner.</p>
        <div className="project-live-form-actions">
          <Link href="/projects">Cancel</Link>
          <button type="submit" disabled={saving||!name.trim()||!key.trim()||
            (kind==='customer'&&!organization)}>
            {saving?'Creating…':'Create project'}</button>
        </div>
      </form>
    </section>
  </main>;
}

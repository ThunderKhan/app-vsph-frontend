'use client';
import {useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import type {ProjectDetail} from './ProjectDetailContract';
export function ProjectLifecycleWorkspace({project}:{
 project:ProjectDetail['project'];
}){
 const router=useRouter();
 const operation=project.status==='archived'?'delete':'archive';
 const [enteredKey,setEnteredKey]=useState('');
 const [confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy||!confirmed||enteredKey!==project.key)return;
  setBusy(true);setMessage('');
  try{
   const response=await fetch('/api/project-lifecycle-action',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({operation,projectId:project.id,version:project.version,
     key:enteredKey,confirmed:true}),
   });
   if(response.status===401){window.location.assign('/login');return;}
   const body:unknown=await response.json().catch(()=>null);
   if(!response.ok||!body||typeof body!=='object'||!('ok' in body)||body.ok!==true)
     throw Error(body&&typeof body==='object'&&'message' in body&&typeof body.message==='string'?
       body.message:'Project lifecycle change not confirmed. Refresh before retrying.');
   if(operation==='delete'){router.replace('/projects');router.refresh();}
   else{router.replace('/projects/'+project.id);router.refresh();}
  }catch(e){setMessage(e instanceof Error?e.message:'Project lifecycle change not confirmed.');}
  finally{setBusy(false);}
 }
 return <section className="project-live-lifecycle">
   <h1>{operation==='archive'?'Archive project':'Delete archived project'}</h1>
   <p><strong>{project.name}</strong> · {project.key} · {project.status} · version {project.version}</p>
   {operation==='archive'?<>
    <p>Archiving prevents normal project work and retains its history. Current project
     permissions and version are checked again by the backend before any change.</p>
   </>:<>
    <p role="alert">Permanent deletion is only allowed for archived, metadata-only projects.
     Any retained tasks, milestones, finance, external references, or other dependencies
     cause the backend to reject the entire transaction. This action cannot be undone.</p>
   </>}
   {message&&<p role="alert">{message}</p>}
   <form onSubmit={submit}>
     <label>Type the exact project key to confirm
       <input required value={enteredKey} maxLength={20} autoComplete="off"
         onChange={e=>{setEnteredKey(e.target.value);setConfirmed(false);}}/>
     </label>
     <label className="project-lifecycle-check">
       <input type="checkbox" required checked={confirmed} disabled={busy}
         onChange={e=>setConfirmed(e.target.checked)}/>
       {operation==='archive'?'I reviewed the current project and confirm archiving.':
        'I understand this permanently deletes an eligible empty project and its metadata.'}
     </label>
     <button type="submit" disabled={busy||!confirmed||enteredKey!==project.key}>
       {busy?'Submitting…':operation==='archive'?'Confirm archive':'Confirm permanent deletion'}
     </button>
   </form>
 </section>;
}

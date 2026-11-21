'use client';
import {useState,type FormEvent} from 'react';
import type {MusicLaunchConfig} from './MusicLaunchContract';
export function MusicLaunchWorkspace({config}:{config:MusicLaunchConfig}){
 const [selected,setSelected]=useState(config.organizations[0].id);
 const [busy,setBusy]=useState(false);
 const active=config.organizations.find(x=>x.id===selected);
 function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy||!active)return;
  setBusy(true);
  // Only the prevalidated, deployment-approved Music SSO URL can be used.
  const url=new URL(config.startUrl);
  url.searchParams.set('organization_id',active.id);
  window.location.assign(url.toString());
 }
 return <main className="workspace-content music-launch" id="mainContent" tabIndex={-1}>
   <section className="music-launch-card">
     <h1>Open Music</h1>
     <p>Select the customer workspace you want to open. VSPH verifies your
       access before continuing to Music.</p>
     <form onSubmit={submit}>
       <label>Customer organization
         <select name="organization" required value={selected} disabled={busy}
           onChange={e=>setSelected(e.target.value)}>
           {config.organizations.map(x=><option key={x.id} value={x.id}>{x.name} ({x.role.replaceAll('_',' ')})</option>)}
         </select>
       </label>
       <p>Your product role will be verified after authorization.</p>
       <button disabled={busy||!active} type="submit">
         {busy?'Continuing…':'Continue to Music'}</button>
     </form>
     <p className="music-security">Your Music role and organization are verified again when
       entering the application. No portal account credentials are included in this link.</p>
   </section>
 </main>;
}

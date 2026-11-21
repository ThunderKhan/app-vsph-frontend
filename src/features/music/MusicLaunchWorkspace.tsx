'use client';
import {useState,type FormEvent} from 'react';
import type {MusicWorkspace} from './MusicLaunchContract';
export function MusicLaunchWorkspace({organizations}:{organizations:MusicWorkspace[]}){
 const [selected,setSelected]=useState(organizations[0].id);
 const [busy,setBusy]=useState(false);
 const active=organizations.find(x=>x.id===selected);
 function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy||!active)return;
  setBusy(true);
  // The same-origin route rechecks authorization and builds the fixed external SSO URL.
  window.location.assign('/apps/music/launch/start?'+new URLSearchParams({organizationId:active.id}));
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
           {organizations.map(x=><option key={x.id} value={x.id}>{x.name} ({x.role.replaceAll('_',' ')})</option>)}
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

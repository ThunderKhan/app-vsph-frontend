'use client';
import Link from 'next/link';
import {useState} from 'react';
import type {ProjectDetail} from './ProjectDetailContract';
import type {DeliveryData} from './EngineeringDeliveryContract';
import {EngineeringDeliveryActions} from './EngineeringDeliveryActions';
const kinds=['','commit','contributor','pull','workflow','check','release','tag'] as const;
const time=(x:string|null)=>!x||Date.parse(x)===0?'Source time unavailable':
 new Date(x).toLocaleString('en-IN',{timeZone:'UTC'});
export function EngineeringDeliveryWorkspace({project,delivery,platformOwner}:{
 project:ProjectDetail;delivery:DeliveryData;platformOwner:boolean;
}){
 const p=project.project;
 const [filter,setFilter]=useState('');
 const linked=new Map(delivery.links.map(l=>[l.recordId,l]));
 const authority=project.role==='manager'&&!['archived','completed'].includes(p.status);
 const visible=delivery.records.filter(x=>!filter||x.kind===filter);
 return <main className="workspace-content engineering-delivery" id="mainContent" tabIndex={-1}>
   <nav><Link href={'/projects/'+p.id}>Back to project</Link></nav>
   <header><h1>Engineering delivery</h1>
     <p>{p.name} · {p.key} · {p.status} · Backend-authorized GitHub observations</p></header>
   <section className="engineering-panel">
     <h2>Connector state</h2>
     <p role="status">{delivery.providerMode==='isolated-fixture'?
       'Isolated provider fixture. No live GitHub verification.':delivery.configured?
       'GitHub App configured. Live provider acceptance still requires staging verification.':
       'GitHub connector disabled. An operator must configure the server-owned App and approve an installation.'}</p>
     <p>Vercel: disabled — {delivery.vercelReason}</p>
     <p>{platformOwner&&authority?
       'A platform owner may approve repository installations only after verifying the approved GitHub App and installation scope.':
       'Your project role does not grant platform-level GitHub installation approval.'}</p>
   </section>
   <EngineeringDeliveryActions project={project} delivery={delivery} platformOwner={platformOwner}/>
   <section className="engineering-panel">
     <h2>Approved installations</h2>
     {delivery.installations.length?delivery.installations.map(g=>
       <p key={g.installationId}>{g.accountLogin} · {g.installationId} · {g.status}</p>):
       <p>No GitHub installations approved for this project.</p>}
   </section>
   <section className="engineering-panel">
     <h2>Repository connections</h2>
     {!delivery.connections.length&&<p>No repository connections. No development activity is fabricated.</p>}
     {delivery.connections.map(c=><article className="engineering-connection" key={c.id}>
       <h3>{c.fullName}</h3>
       <p>{c.status} · {c.defaultBranch} · {c.private?'Private':'Public'}</p>
       <p>Last successful page: {time(c.lastSuccessAt)}</p>
       <p>Next eligible poll: {time(c.nextSyncAt)}</p>
       <p>Checkpoint category {c.checkpoint.kind}, page {c.checkpoint.page}
         {c.lastError?' · '+c.lastError:''}</p>
     </article>)}
   </section>
   <section className="engineering-panel">
     <h2>Recent delivery evidence</h2>
     <p>Up to 200 provider observations. Source time and ingestion time are separate.</p>
     <label>Delivery record type <select value={filter} onChange={e=>setFilter(e.target.value)}>
       {kinds.map(k=><option key={k} value={k}>{k||'All engineering records'}</option>)}
     </select></label>
     <div className="engineering-table" role="region" tabIndex={0}
       aria-label="GitHub records table, horizontally scrollable">
       <table><thead><tr>{['Source','Type','State','Source time','Observed','Linked work']
         .map(k=><th scope="col" key={k}>{k}</th>)}</tr></thead>
         <tbody>{visible.map(r=>{
           const l=linked.get(r.id);
           const linkedName=l?.taskId?project.tasks.find(t=>t.id===l.taskId)?.title:
             l?.milestoneId?project.milestones.find(m=>m.id===l.milestoneId)?.title:null;
           return <tr key={r.id}>
             <td><a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a></td>
             <td>{r.kind}</td><td>{r.state}</td>
             <td>{time(r.sourceAt)}</td><td>{time(r.observedAt)}</td>
             <td>{linkedName|| (l?'Linked work':'Unlinked')}</td>
           </tr>;
         })}</tbody>
       </table>
     </div>
     {!visible.length&&<p>No ingested records match this view.</p>}
   </section>
   <section className="engineering-panel">
     <h2>Engineering timeline</h2>
     <p>Latest 200 observed changes; source and observed timestamps may differ.</p>
     {!delivery.events.length&&<p>No recorded engineering changes.</p>}
     <ol>{delivery.events.map((e,i)=><li key={i}>
       {time(e.observedAt)} · {e.kind} · {e.state} ·
       <a href={e.url} target="_blank" rel="noopener noreferrer">{e.title}</a>
     </li>)}</ol>
   </section>
 </main>;
}

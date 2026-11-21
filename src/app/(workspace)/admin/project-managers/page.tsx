import type {Metadata} from 'next';
import Link from 'next/link';
import {portalApi} from '@/features/workspace/server-api';
import {parseManagerOverview} from '@/features/operations/ManagerOverviewContract';
import '../project-managers-live.css';
export const metadata:Metadata={title:'Project manager governance | VSPH',
 robots:{index:false,follow:false}};
export default async function ProjectManagersPage(){
 const response=await portalApi('/api/projects/manager-overview');
 const rows=response.kind==='ok'?parseManagerOverview(response.value):null;
 return <main className="workspace-content manager-governance-live" id="mainContent" tabIndex={-1}>
   <header><div><p className="eyebrow">PEOPLE / PROJECT MANAGEMENT</p>
     <h1>Project managers</h1>
     <p className="muted">Control project leadership without granting HR, platform ownership, or customer product access.</p>
   </div><div className="actions"><Link href="/projects">Project portfolio</Link>
      <Link href="/admin/project-managers">Refresh</Link></div></header>
   {rows===null?<p role="alert">Manager records unavailable. Current owner permission or the backend could not be verified.</p>:<>
    <section className="manager-metric-strip" aria-label="Manager metrics">
      <div><small>Active manager assignments</small><strong>{rows.length}</strong></div>
      <div><small>Projects with managers</small><strong>{new Set(rows.map(r=>r.project_id)).size}</strong></div>
      <div><small>Unlinked manager identities</small><strong>{rows.filter(r=>!r.linked_employee).length}</strong></div>
    </section>
    <section className="manager-panel">
      <h2>Project leadership directory</h2>
      <p className="muted">The accountable project owner cannot be removed until ownership is transferred. Appointment and revocation happen within the project's Team workspace.</p>
      {!rows.length?<p>No active manager appointments found.</p>:
       <div className="manager-table" role="region" tabIndex={0}
         aria-label="Project leadership directory, horizontally scrollable">
         <table><thead><tr>{['Project','Manager','Department','Account','Authority'].map(n=><th scope="col" key={n}>{n}</th>)}</tr></thead>
         <tbody>{rows.map((row,i)=><tr key={row.project_id+':'+i}>
           <td><Link href={'/projects/'+row.project_id+'#team'}>{row.project_name}</Link>
             <small>{row.project_status}</small></td>
           <td>{row.manager_name}</td>
           <td>{row.department||'Platform owner / existing assignment'}</td>
           <td>{row.account_status}</td>
           <td>{row.accountable_owner?'Accountable project owner':'Project manager'}</td>
         </tr>)}</tbody></table>
       </div>}
    </section>
   </>}
   <section className="manager-panel"><h2>Governance boundaries</h2>
     <p className="muted">Only a platform owner appoints or removes project managers. A project manager may assign active, linked VSPH employees to their project and its tasks, but cannot grant HR access, company-wide manager authority, or customer product roles. Changes are version-checked and audited.</p>
     <Link href="/employees">Employee directory</Link>
   </section>
 </main>;
}

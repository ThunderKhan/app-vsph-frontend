import type {Metadata} from 'next';
import Link from 'next/link';
import {portalApi} from '@/features/workspace/server-api';
import {parseOutreachUsers,parseOutreachGrants} from '@/features/operations/OutreachAccessContract';
import {OutreachAccessWorkspace} from '@/features/operations/OutreachAccessWorkspace';
import '../../outreach-access-live.css';
export const metadata:Metadata={title:'Outreach Access | VSPH',robots:{index:false,follow:false}};
export default async function OutreachAccessPage(){
 const [u,g]=await Promise.all([portalApi('/api/admin-management/users'),
   portalApi('/api/admin-management/outreach-access')]);
 const users=u.kind==='ok'?parseOutreachUsers(u.value):null;
 const grants=g.kind==='ok'?parseOutreachGrants(g.value):null;
 if(!users||!grants)return <main className="workspace-content outreach-live" id="mainContent" tabIndex={-1}>
   <h1>Outreach Access</h1><p role="alert">Owner authorization or Outreach data could not be verified.</p>
   <Link href="/admin">Back to administration</Link>
 </main>;
 return <OutreachAccessWorkspace users={users} grants={grants}/>;
}

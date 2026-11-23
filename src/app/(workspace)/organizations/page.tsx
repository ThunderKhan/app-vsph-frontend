import type {Metadata} from 'next';
import Link from 'next/link';
import {portalApi} from '@/features/workspace/server-api';
import {parseOrgList,parseOrgDetail,parseOrgMembers,parseOrgInvites} from '@/features/organizations/OrganizationContract';
import {OrganizationWorkspace} from '@/features/organizations/OrganizationWorkspace';
import '../organizations-live.css';
export const metadata:Metadata={title:'My organizations | VSPH',robots:{index:false,follow:false}};
type Query={org?:string|string[];afterId?:string|string[];memberAfter?:string|string[]};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function OrganizationsPage({searchParams}:{searchParams:Promise<Query>}){
 const query=await searchParams;
 if([query.org,query.afterId,query.memberAfter].some(v=>Array.isArray(v)||
   (typeof v==='string'&&!uuid.test(v))))
   return <main className="workspace-content org-live" id="mainContent" tabIndex={-1}><p role="alert">Invalid organization filter.</p></main>;
 const org=(query.org||'') as string,after=(query.afterId||'') as string,
   memberAfter=(query.memberAfter||'') as string;
 const listing=await portalApi('/api/organizations'+(after?'?afterId='+after:''));
 const organizations=listing.kind==='ok'?parseOrgList(listing.value):null;
 if(!organizations)return <main className="workspace-content org-live" id="mainContent" tabIndex={-1}>
   <h1>My organizations</h1><p role="alert">Your organization administration permission or the service could not be verified.</p>
   <Link href="/dashboard">Return to dashboard</Link>
 </main>;
 const active=org||organizations[0]?.id||'';
 if(active&&!organizations.some(o=>o.id===active) && !after){
  // The backend detail endpoint still independently checks membership for deep links.
 }
 if(!active)return <main className="workspace-content org-live" id="mainContent" tabIndex={-1}>
   <h1>My organizations</h1>
   <p>No active organization administrator memberships are available. Ask your platform administrator to review your membership.</p>
 </main>;
 const [detail,members,invites]=await Promise.all([
   portalApi('/api/organizations/'+active),
   portalApi('/api/organizations/'+active+'/members'+(memberAfter?'?afterId='+memberAfter:'')),
   portalApi('/api/organizations/'+active+'/invitations'),
 ]);
 const model=detail.kind==='ok'?parseOrgDetail(detail.value):null;
 const memberRows=members.kind==='ok'?parseOrgMembers(members.value):null;
 const inviteRows=invites.kind==='ok'?parseOrgInvites(invites.value):null;
 if(!model||!memberRows||!inviteRows||model.organization.id!==active)
   return <main className="workspace-content org-live" id="mainContent" tabIndex={-1}><h1>My organizations</h1>
     <p role="alert">The selected organization is unavailable or its current access could not be verified.</p>
     <Link href="/organizations">Return to organizations</Link>
   </main>;
 return <OrganizationWorkspace key={model.organization.id+':'+model.organization.version} organizations={organizations} current={model}
   members={memberRows} invitations={inviteRows}
   organizationAfter={after} memberAfter={memberAfter}/>;
}

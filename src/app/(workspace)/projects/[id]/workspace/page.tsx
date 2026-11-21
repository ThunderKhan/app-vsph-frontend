import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {portalApi} from '@/features/workspace/server-api';
import {portalIdentity} from '@/features/workspace/contracts';
import {isProjectId,parseProjectDetail} from '@/features/projects/ProjectDetailContract';
import {parseProjectWorkspace} from '@/features/projects/ProjectWorkspaceContract';
import {ProjectWorkspaceLive} from '@/features/projects/ProjectWorkspaceLive';
import '../../../project-workspace.css';
export const metadata:Metadata={title:'Project delivery workspace | VSPH',robots:{index:false,follow:false}};
export default async function ProjectWorkspacePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!isProjectId(id))notFound();
 const [details,records,identity]=await Promise.all([
   portalApi('/api/projects/'+id),portalApi('/api/projects/'+id+'/workspace'),portalApi('/api/auth/me')
 ]);
 if(details.kind==='unauthorized'||records.kind==='unauthorized'||identity.kind==='unauthorized')redirect('/login');
 const project=details.kind==='ok'?parseProjectDetail(details.value,id):null;
 const workspace=records.kind==='ok'?parseProjectWorkspace(records.value):null;
 const actor=identity.kind==='ok'?portalIdentity(identity.value):null;
 if(!project||!workspace||!actor||workspace.role!==project.role)
   return <main className="workspace-content project-workspace-live" id="mainContent">
     <h1>Project delivery unavailable</h1>
     <p role="alert">Current project access, delivery data, or account session could not be verified.</p>
     <Link href="/projects">Return to Projects</Link>
   </main>;
 return <ProjectWorkspaceLive project={project} workspace={workspace} actorId={actor.id}/>;
}

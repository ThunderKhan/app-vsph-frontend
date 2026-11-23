import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {portalApi} from '@/features/workspace/server-api';
import {portalIdentity} from '@/features/workspace/contracts';
import {isProjectId,parseProjectDetail} from '@/features/projects/ProjectDetailContract';
import {ProjectLifecycleWorkspace} from '@/features/projects/ProjectLifecycleWorkspace';
import '../../../projects-live.css';
import '../../../project-lifecycle.css';
export const metadata:Metadata={title:'Project lifecycle | VSPH',robots:{index:false,follow:false}};
export default async function ProjectLifecyclePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!isProjectId(id))notFound();
 const [identity,details]=await Promise.all([portalApi('/api/auth/me'),portalApi('/api/projects/'+id)]);
 if(identity.kind==='unauthorized'||details.kind==='unauthorized')redirect('/login');
 const actor=identity.kind==='ok'?portalIdentity(identity.value):null;
 const project=details.kind==='ok'?parseProjectDetail(details.value,id):null;
 if(!actor||actor.platformRole!=='super_admin'||!project)
   return <main className="workspace-content project-workspace" id="mainContent" tabIndex={-1}>
     <h1>Project lifecycle unavailable</h1>
     <p role="alert">Your platform-owner permission or current project data could not be verified.</p>
     <Link href="/projects">Back to Projects</Link>
   </main>;
 return <main className="workspace-content project-workspace" id="mainContent" tabIndex={-1}>
   <nav><Link className="project-live-back" href={'/projects/'+id}>Back to project</Link></nav>
   <ProjectLifecycleWorkspace project={project.project}/>
 </main>;
}

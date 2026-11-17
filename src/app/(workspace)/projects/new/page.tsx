import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { portalApi } from '@/features/workspace/server-api';
import { portalIdentity } from '@/features/workspace/contracts';
import { parseCreationDirectory } from '@/features/projects/ProjectCreationContract';
import { NewProjectForm } from '@/features/projects/NewProjectForm';
import '../../../(preview)/projects.css';
import '../../project-detail-live.css';

export const metadata:Metadata={
  title:'Create project | VSPH Control Center',
  robots:{index:false,follow:false}
};
export default async function NewProjectPage(){
  const session=await portalApi('/api/auth/me');
  if(session.kind==='unauthorized')redirect('/login');
  const user=session.kind==='ok'?portalIdentity(session.value):null;
  if(!user||user.platformRole!=='super_admin')
    return <main className="workspace-content project-workspace" id="mainContent">
      <h1>Project creation unavailable</h1>
      <p role="alert">Portfolio administration permission is required.</p>
      <Link href="/projects">Back to projects</Link>
    </main>;
  const result=await portalApi('/api/projects/directory');
  if(result.kind==='unauthorized')redirect('/login');
  const directory=result.kind==='ok'?parseCreationDirectory(result.value):null;
  if(!directory)return <main className="workspace-content project-workspace" id="mainContent">
    <h1>Project creation unavailable</h1>
    <p role="alert">The authorized organization directory could not be verified.</p>
    <Link href="/projects">Back to projects</Link>
  </main>;
  return <NewProjectForm organizations={directory.organizations} ownerName={user.name}/>;
}

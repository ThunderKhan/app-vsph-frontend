import type { Metadata } from 'next';
import Link from 'next/link';
import { loadLiveProject } from '@/features/projects/project-detail-server';
import { LiveProjectWorkspace } from '@/features/projects/LiveProjectWorkspace';
import '../../../(preview)/projects.css';
import '../../project-detail-live.css';

export const metadata:Metadata={
  title:'Project details | VSPH Control Center',
  robots:{index:false,follow:false}
};
export default async function ProjectDetailsPage({params}:{
  params:Promise<{id:string}>;
}){
  const {id}=await params;
  const data=await loadLiveProject(id);
  if(!data)return <main className="workspace-content project-workspace" id="mainContent">
    <h1>Project unavailable</h1>
    <p role="alert">Your project access could not be verified, or this project is unavailable.</p>
    <Link href="/projects">Back to projects</Link>
  </main>;
  return <LiveProjectWorkspace {...data}/>;
}

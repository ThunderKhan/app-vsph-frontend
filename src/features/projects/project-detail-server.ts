import { redirect } from 'next/navigation';
import { portalApi } from '@/features/workspace/server-api';
import { portalIdentity } from '@/features/workspace/contracts';
import { parseLiveProject, projectIdPattern } from './ProjectLiveContract';
import { parseWorkforce, type ProjectWorkforce } from './ProjectMemberEligibility';

/** Authenticated, server-only detail request, with no fixture fallback. */
export async function loadLiveProject(id:string): Promise<{
  project: NonNullable<ReturnType<typeof parseLiveProject>>;
  workforce: ProjectWorkforce|null;
  actorId: string|null;
}|null>{
  if(!projectIdPattern.test(id))return null;
  const result=await portalApi('/api/projects/'+id);
  if(result.kind==='unauthorized')redirect('/login');
  if(result.kind!=='ok')return null;
  const project=parseLiveProject(result.value);
  if(!project||project.id.toLowerCase()!==id.toLowerCase())return null;
  let workforce:ProjectWorkforce|null=null;
  if(project.role==='manager' && !['completed','archived'].includes(project.status)){
    const staff=await portalApi('/api/projects/'+id+'/workforce');
    if(staff.kind==='unauthorized')redirect('/login');
    if(staff.kind==='ok')workforce=parseWorkforce(staff.value);
  }
  const identity=await portalApi('/api/auth/me');
  if(identity.kind==='unauthorized')redirect('/login');
  const actor=identity.kind==='ok'?portalIdentity(identity.value):null;
  return {project,workforce,actorId:actor?.id??null};
}

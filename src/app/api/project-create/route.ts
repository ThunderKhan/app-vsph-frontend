import { type NextRequest, NextResponse } from 'next/server';
import { approvedInternalOrigin } from '@/features/workspace/server-api';
import { approvedPublicOrigin, validPortalSession } from '@/features/projects/ProjectProxySecurity';
import { parseProjectCreation } from '@/features/projects/ProjectCreationContract';
import { projectIdPattern } from '@/features/projects/ProjectLiveContract';

const headers={'Cache-Control':'no-store'};
const fail=(message:string,status:number)=>NextResponse.json({message},{status,headers});
export async function POST(request:NextRequest){
  const origin=approvedPublicOrigin(),upstream=approvedInternalOrigin();
  if(!origin||!upstream)return fail('Project creation unavailable.',503);
  if(request.headers.get('origin')!==origin||
    request.headers.get('sec-fetch-site')==='cross-site')return fail('Origin not permitted.',403);
  const sid=request.cookies.get('vsph.portal.sid')?.value;
  if(!validPortalSession(sid))return fail('Sign in again.',401);
  if(!request.headers.get('content-type')?.startsWith('application/json')||
    Number(request.headers.get('content-length')||0)>8192)return fail('Invalid request.',400);
  let body:unknown;
  try{
    const raw=await request.text();
    if(raw.length>8192)return fail('Invalid request.',400);
    body=JSON.parse(raw);
  }catch{return fail('Invalid JSON.',400);}
  const project=parseProjectCreation(body);
  if(!project)return fail('Invalid project details.',400);
  try{
    const response=await fetch(upstream+'/api/projects',{
      method:'POST',
      headers:{Cookie:'vsph.portal.sid='+sid,Origin:origin,
        'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify(project),cache:'no-store',redirect:'manual',
      signal:AbortSignal.timeout(8000)
    });
    if(response.status===401)return fail('Sign in again.',401);
    if(response.status===403)return fail('Portfolio administration required.',403);
    if(response.status===400||response.status===422||response.status===409)
      return fail('Project creation rejected. Check the key, organization, and dates.',400);
    if(response.status!==201)return fail('Project could not be created.',503);
    const value:unknown=await response.json().catch(()=>null);
    if(!value||typeof value!=='object'||!('id' in value)||
      typeof value.id!=='string'||!projectIdPattern.test(value.id))
      return fail('Creation confirmation unavailable. Refresh the portfolio before retrying.',503);
    return NextResponse.json({id:value.id},{status:201,headers});
  }catch{return fail('Project service unavailable.',503);}
}

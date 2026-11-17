import { type NextRequest, NextResponse } from 'next/server';
import { approvedInternalOrigin } from '@/features/workspace/server-api';
import { projectMutation } from '@/features/projects/ProjectMutationContract';
import { approvedPublicOrigin, validPortalSession } from '@/features/projects/ProjectProxySecurity';

type Context={params:Promise<{id:string;operation:string}>};
const noStore={'Cache-Control':'no-store'};
function failure(message:string,status:number){
  return NextResponse.json({message},{status,headers:noStore});
}
/** Server-only CSRF-protected write proxy. No browser-visible backend credentials. */
export async function POST(request:NextRequest,{params}:Context){
  const publicUrl=approvedPublicOrigin(),upstream=approvedInternalOrigin();
  if(!publicUrl||!upstream)return failure('Project changes are unavailable.',503);
  if(request.headers.get('origin')!==publicUrl||
    request.headers.get('sec-fetch-site')==='cross-site')
    return failure('Origin not permitted.',403);
  const session=request.cookies.get('vsph.portal.sid')?.value;
  if(!validPortalSession(session))
    return failure('Sign in again.',401);
  if(!request.headers.get('content-type')?.startsWith('application/json')||
    Number(request.headers.get('content-length')||0)>8192)
    return failure('Invalid request.',400);
  const {id,operation}=await params;
  let body:unknown;
  try{
    const raw=await request.text();
    if(raw.length>8192)return failure('Invalid request.',400);
    body=JSON.parse(raw);
  }catch{return failure('Invalid JSON.',400);}
  const command=projectMutation(id,operation,body);
  if(!command)return failure('Invalid project operation.',400);
  try{
    const response=await fetch(upstream+command.path,{
      method:command.method,headers:{
        Cookie:'vsph.portal.sid='+session,Origin:publicUrl,
        Accept:'application/json','Content-Type':'application/json'
      },
      body:JSON.stringify(command.body),cache:'no-store',redirect:'manual',
      signal:AbortSignal.timeout(8000)
    });
    if(response.status===401)return failure('Sign in again.',401);
    if(response.status===403)return failure('Project permission denied.',403);
    if(response.status===409)return failure(
      'Someone changed this project first. Refresh and retry.',409);
    if(response.status===400||response.status===422)
      return failure('Project change rejected. Check your inputs.',400);
    if(response.status!==200&&response.status!==201)
      return failure('Project change could not be saved.',503);
    return NextResponse.json({ok:true},{headers:noStore});
  }catch{return failure('Project service unavailable.',503);}
}

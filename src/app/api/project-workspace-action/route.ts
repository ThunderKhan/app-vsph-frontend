import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {projectWorkspaceMutation,projectWorkspaceWriteConfirmed} from '@/features/projects/ProjectWorkspaceContract';
import {readBoundedRequestText} from '@/features/workspace/BoundedRequestBody';
const headers={'Cache-Control':'no-store'};
const fail=(status:number,message:string)=>NextResponse.json({message},{status,headers});
/** Project role, assignment, version and closure are recomputed by PostgreSQL. */
export async function POST(request:NextRequest){
 const origin=approvedPublicOrigin(),upstream=approvedInternalOrigin();
 if(!origin||!upstream)return fail(503,'Project workspace unavailable.');
 if(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site')
   return fail(403,'Origin not permitted.');
 const session=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(session))return fail(401,'Sign in again.');
 if(!request.headers.get('content-type')?.startsWith('application/json')||
   Number(request.headers.get('content-length')||0)>8192)return fail(400,'Invalid request body.');
 let data:unknown;
 try{const body=await readBoundedRequestText(request,8192);if(body===null)return fail(400,'Workspace request too long.');
  data=JSON.parse(body);}catch{return fail(400,'Invalid JSON.');}
 const operation=projectWorkspaceMutation(data);
 if(!operation)return fail(400,'Invalid project workspace fields or version.');
 try{
  const response=await fetch(upstream+operation.path,{
   method:'POST',cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(8000),
   headers:{Cookie:'vsph.portal.sid='+session,Origin:origin,
     Accept:'application/json','Content-Type':'application/json'},
   body:JSON.stringify(operation.body)});
  if(response.status===401)return fail(401,'Sign in again.');
  if(response.status===403)return fail(403,'Current project role or assignment denied.');
  if(response.status===409)return fail(409,'Project version changed. Reload before retrying.');
  if(response.status===400||response.status===422)return fail(400,'Invalid project workspace state or record.');
  if(response.status!==200)return fail(503,'Workspace change not confirmed. Reload before retrying.');
  const confirmation:unknown=await response.json().catch(()=>null);
  if(!projectWorkspaceWriteConfirmed(confirmation))
    return fail(502,'Invalid workspace confirmation. Reload to reconcile.');
  return NextResponse.json({ok:true},{headers});
 }catch{return fail(503,'Workspace service unavailable. No change was confirmed.');}
}

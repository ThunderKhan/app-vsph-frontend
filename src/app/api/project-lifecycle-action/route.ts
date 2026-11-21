import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {projectLifecycleMutation,projectLifecycleConfirmed} from '@/features/projects/ProjectLifecycleContract';
const headers={'Cache-Control':'no-store'};
const fail=(message:string,status:number)=>NextResponse.json({message},{status,headers});
/** Fixed project lifecycle RPC. User/owner authorization, dependency inspection and version locks remain backend-enforced. */
export async function POST(request:NextRequest){
 const origin=approvedPublicOrigin(),upstream=approvedInternalOrigin();
 if(!origin||!upstream)return fail('Project lifecycle service unavailable.',503);
 if(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site')
   return fail('Origin not permitted.',403);
 const session=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(session))return fail('Sign in again.',401);
 if(!request.headers.get('content-type')?.startsWith('application/json')||
   Number(request.headers.get('content-length')||0)>2048)return fail('Invalid request.',400);
 let raw:unknown;
 try{const body=await request.text();if(body.length>2048)return fail('Project lifecycle request too long.',400);raw=JSON.parse(body);}
 catch{return fail('Invalid JSON.',400);}
 const command=projectLifecycleMutation(raw);
 if(!command)return fail('Review the current project version, exact key and confirmation.',400);
 try{
  const response=await fetch(upstream+command.path,{
   method:'POST',cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(8000),
   headers:{Cookie:'vsph.portal.sid='+session,Origin:origin,'Content-Type':'application/json',Accept:'application/json'},
   body:JSON.stringify(command.body),
  });
  if(response.status===401)return fail('Sign in again.',401);
  if(response.status===403)return fail('Only the current platform owner can change project lifecycle.',403);
  if(response.status===409)return fail('Project changed. Reload and review the current version.',409);
  if(response.status===400||response.status===422)return fail('Project has retained dependencies, or the requested lifecycle change was denied.',400);
  if(response.status!==200)return fail('Project lifecycle was not confirmed. Refresh before retrying.',503);
  const reply:unknown=await response.json().catch(()=>null);
  if(!projectLifecycleConfirmed(reply,command.operation,command.projectId,command.body.key))
    return fail('Invalid lifecycle confirmation. Review the project before retrying.',502);
  return NextResponse.json({ok:true,operation:command.operation},{headers});
 }catch{return fail('Project service unavailable. No lifecycle change was confirmed.',503);}
}

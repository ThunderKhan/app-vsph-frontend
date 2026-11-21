import {readBoundedRequestText} from '@/features/workspace/BoundedRequestBody';
import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {employeeLifecycleMutation,confirmedLifecycleResult} from '@/features/operations/EmployeeLifecycleContract';
const headers={'Cache-Control':'no-store'};
const fail=(message:string,status:number)=>NextResponse.json({message},{status,headers});
export async function POST(request:NextRequest){
 const origin=approvedPublicOrigin(),upstream=approvedInternalOrigin();
 if(!origin||!upstream)return fail('Employee lifecycle service unavailable.',503);
 if(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site')
   return fail('Origin not permitted.',403);
 const session=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(session))return fail('Sign in again.',401);
 if(!request.headers.get('content-type')?.startsWith('application/json')||
   Number(request.headers.get('content-length')||0)>2048)return fail('Invalid request.',400);
 let body:unknown;
 try{const raw=await readBoundedRequestText(request,2048);if(raw===null||raw.length>2048)return fail('Request too long.',400);
   body=JSON.parse(raw);}catch{return fail('Invalid JSON.',400);}
 const action=employeeLifecycleMutation(body);
 if(!action)return fail('Review current version, confirmation and an 8–500 character reason.',400);
 try{
  const response=await fetch(upstream+action.path,{method:'POST',cache:'no-store',
    redirect:'manual',signal:AbortSignal.timeout(8000),
    headers:{Cookie:'vsph.portal.sid='+session,Origin:origin,'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify(action.body)});
  if(response.status===401)return fail('Sign in again.',401);
  if(response.status===403)return fail('Employee governance permission denied.',403);
  if(response.status===409)return fail('Employee changed. Refresh before proceeding.',409);
  if(response.status===400||response.status===422)return fail('Invalid employee state or authorization.',400);
  if(response.status!==200)return fail('Operation not confirmed. Refresh before retrying.',503);
  const result:unknown=await response.json().catch(()=>null);
  const employeeId=action.path.split('/')[3];
  if(!confirmedLifecycleResult(result,action.operation,employeeId))
    return fail('Unexpected backend confirmation. Verify current employee state before retrying.',502);
  return NextResponse.json({ok:true,operation:action.operation},{headers});
 }catch{return fail('Employee service unavailable. No change has been confirmed.',503);}
}

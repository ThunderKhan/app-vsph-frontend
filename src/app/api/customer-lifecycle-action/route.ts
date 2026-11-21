import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {customerLifecycleMutation,customerLifecycleConfirmed} from '@/features/operations/CustomerLifecycleContract';
const headers={'Cache-Control':'no-store'};
const fail=(message:string,status:number)=>NextResponse.json({message},{status,headers});
/** Fixed organization status or combined entitlement transaction. No browser-constructed upstream path. */
export async function POST(request:NextRequest){
 const origin=approvedPublicOrigin(),upstream=approvedInternalOrigin();
 if(!origin||!upstream)return fail('Customer lifecycle service unavailable.',503);
 if(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site')
   return fail('Origin not permitted.',403);
 const token=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(token))return fail('Sign in again.',401);
 if(!request.headers.get('content-type')?.startsWith('application/json')||
   Number(request.headers.get('content-length')||0)>4096)return fail('Invalid request.',400);
 let raw:unknown;
 try{const body=await request.text();if(body.length>4096)return fail('Request too long.',400);
  raw=JSON.parse(body);}catch{return fail('Invalid JSON.',400);}
 const command=customerLifecycleMutation(raw);
 if(!command)return fail('Review the organization lifecycle, subscription terms and required confirmation.',400);
 try{
  const response=await fetch(upstream+command.path,{method:'POST',cache:'no-store',
   redirect:'manual',signal:AbortSignal.timeout(8000),
   headers:{Cookie:'vsph.portal.sid='+token,Origin:origin,'Content-Type':'application/json',Accept:'application/json'},
   body:JSON.stringify(command.body)});
  if(response.status===401)return fail('Sign in again.',401);
  if(response.status===403)return fail('Platform-owner permission denied.',403);
  if(response.status===409)return fail('Organization version or entitlement changed. Reload before retrying.',409);
  if(response.status===400||response.status===422)return fail('Invalid transition or subscription terms.',400);
  if(response.status!==200)return fail('Lifecycle operation was not confirmed. Refresh before retrying.',503);
  const body:unknown=await response.json().catch(()=>null);
  if(!customerLifecycleConfirmed(body,command.version))
    return fail('Invalid lifecycle confirmation. Refresh before retrying.',502);
  return NextResponse.json({ok:true},{headers});
 }catch{return fail('Lifecycle service unavailable. No change has been confirmed.',503);}
}

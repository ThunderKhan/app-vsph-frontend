import {readBoundedRequestText} from '@/features/workspace/BoundedRequestBody';
import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {organizationMutation,validOrganizationId} from '@/features/organizations/OrganizationContract';
const headers={'Cache-Control':'no-store'};
const fail=(status:number,message:string)=>NextResponse.json({message},{status,headers});
export async function POST(request:NextRequest){
 const origin=approvedPublicOrigin(),upstream=approvedInternalOrigin();
 if(!origin||!upstream)return fail(503,'Organization service unavailable.');
 if(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site')return fail(403,'Origin not permitted.');
 const token=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(token))return fail(401,'Sign in again.');
 if(!request.headers.get('content-type')?.startsWith('application/json')||
   Number(request.headers.get('content-length')||0)>4096)return fail(400,'Invalid request body.');
 let raw:unknown;
 try{const text=await readBoundedRequestText(request,4096);if(text===null||text.length>4096)return fail(400,'Request too long.');raw=JSON.parse(text);}
 catch{return fail(400,'Invalid JSON.');}
 const cmd=organizationMutation(raw);
 if(!cmd)return fail(400,'Invalid organization action or required confirmation.');
 const key=request.headers.get('Idempotency-Key');
 if(cmd.key&&(!key||!validOrganizationId(key)))return fail(400,'Valid invitation idempotency key required.');
 try{
   const response=await fetch(upstream+cmd.path,{
     method:'POST',cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(8000),
     headers:{Cookie:'vsph.portal.sid='+token,Origin:origin,'Content-Type':'application/json',
       Accept:'application/json',...(cmd.key?{'Idempotency-Key':key!}:{})},
     body:JSON.stringify(cmd.body),
   });
   if(response.status===401)return fail(401,'Sign in again.');
   if(response.status===403)return fail(403,'Organization administration permission denied.');
   if(response.status===409)return fail(409,'Organization record changed. Reload before trying again.');
   if(response.status===400||response.status===422)return fail(400,'Organization operation rejected. Review the current record.');
   if(response.status!==200&&response.status!==202)return fail(503,'Organization operation was not confirmed.');
   return NextResponse.json({ok:true,queued:response.status===202},{headers});
 }catch{return fail(503,'Organization service unavailable. Confirm the prior result before retrying.');}
}

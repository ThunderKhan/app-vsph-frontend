import {readBoundedRequestText} from '@/features/workspace/BoundedRequestBody';
import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {ownWorkMutation,validOwnWorkId} from '@/features/employee-work/OwnWorkContract';
const headers={'Cache-Control':'no-store'};
const failure=(message:string,status:number)=>NextResponse.json({message},{status,headers});
export async function POST(request:NextRequest){
 const origin=approvedPublicOrigin(),upstream=approvedInternalOrigin();
 if(!origin||!upstream)return failure('Employee self-service unavailable.',503);
 if(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site')return failure('Origin not permitted.',403);
 const token=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(token))return failure('Sign in again.',401);
 if(!request.headers.get('content-type')?.startsWith('application/json')||
   Number(request.headers.get('content-length')||0)>2048)return failure('Invalid body.',400);
 let raw:unknown;
 try{const text=await readBoundedRequestText(request,2048);if(text===null||text.length>2048)return failure('Request too long.',400);raw=JSON.parse(text);}
 catch{return failure('Invalid JSON.',400);}
 const action=ownWorkMutation(raw);
 if(!action)return failure('Invalid employee self-service operation.',400);
 const key=request.headers.get('Idempotency-Key');
 if(action.needsKey && (!key||!validOwnWorkId(key)))return failure('Idempotency key required.',400);
 try{
   const response=await fetch(upstream+action.path,{
     method:'POST',cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(8000),
     headers:{Cookie:'vsph.portal.sid='+token,Origin:origin,'Content-Type':'application/json',
       Accept:'application/json',...(action.needsKey?{'Idempotency-Key':key!}:{})},
     body:JSON.stringify(action.body),
   });
   if(response.status===401)return failure('Sign in again.',401);
   if(response.status===403)return failure('Current employee permission required.',403);
   if(response.status===409)return failure('Work record changed. Refresh before trying again.',409);
   if(response.status===400||response.status===422)return failure('Review the current employee record and required fields.',400);
   if(response.status!==200)return failure('Operation could not be confirmed. Refresh before retrying.',503);
   return NextResponse.json({ok:true},{headers});
 }catch{return failure('Employee service unavailable. The operation was not confirmed.',503);}
}

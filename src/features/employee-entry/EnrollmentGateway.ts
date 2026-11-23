import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {readBoundedRequestText} from '@/features/workspace/BoundedRequestBody';
import {confirmedTemporaryReplace,invitationPayload,publicProofResult,
 sanitizedCredentialError,temporaryCredentialPayload,temporaryCredentialStatus,
 type PublicProofAction,type PublicProofKind} from './EnrollmentGatewayContract';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
const fail=(status:number,message:string)=>NextResponse.json({message},{status,headers});
function originValid(request:NextRequest,origin:string){
 return request.headers.get('origin')===origin&&
   request.headers.get('sec-fetch-site')!=='cross-site';
}
function responseError(response:Response,raw:unknown){
 const allowed=[400,401,403,404,409,422,428,429].includes(response.status);
 const safe=sanitizedCredentialError(raw);
 const result=NextResponse.json(allowed?safe:{message:'Account enrollment service unavailable.'},
   {status:allowed?response.status:503,headers});
 if(response.status===429){
  const retry=response.headers.get('retry-after');
  if(retry&&/^\d{1,4}$/.test(retry))result.headers.set('Retry-After',retry);
 }
 return result;
}
/**
 * Unauthenticated one-time invitation inspection/acceptance.
 * The backend verifies hashed capability, expiry, identity, single-use state
 * and authorization; this gateway never attempts token validation locally.
 */
export async function publicInvitation(request:NextRequest,kind:PublicProofKind,action:PublicProofAction){
 const origin=approvedPublicOrigin(),upstream=approvedInternalOrigin();
 if(!origin||!upstream)return fail(503,'Invitation service unavailable.');
 if(!originValid(request,origin))return fail(403,'Origin not permitted.');
 if(!request.headers.get('content-type')?.startsWith('application/json')||
   Number(request.headers.get('content-length')||0)>4096)return fail(400,'Invalid invitation request.');
 let payload:unknown;
 try{const raw=await readBoundedRequestText(request,4096);
   if(raw===null)return fail(400,'Invitation request too large.');payload=JSON.parse(raw);
 }catch{return fail(400,'Invalid invitation JSON.');}
 const body=invitationPayload(payload,kind,action);
 if(!body)return fail(400,'Invalid invitation proof or enrollment fields.');
 const endpoint=kind==='employee'?'/api/employee-enrollment/':'/api/invitations/';
 const rawPortal=request.cookies.get('vsph.portal.sid')?.value;
 const cookie=kind==='customer'&&validPortalSession(rawPortal)?'vsph.portal.sid='+rawPortal:'';
 try{
  const response=await fetch(upstream+endpoint+action,{
   method:'POST',cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(10000),
   headers:{Origin:origin,Accept:'application/json','Content-Type':'application/json',
      ...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body),
  });
  const result:unknown=await response.json().catch(()=>null);
  if(response.status!==200)return responseError(response,result);
  const verified=publicProofResult(result,kind,action);
  if(!verified)return fail(502,'Invitation response could not be verified.');
  return NextResponse.json(verified,{headers});
 }catch{return fail(503,'Invitation service unavailable. Verify the current invitation before retrying.');}
}
const setupName='vsph.employee.setup';
export async function temporaryStatus(request:NextRequest){
 const upstream=approvedInternalOrigin();
 if(!upstream)return fail(503,'Employee credential service unavailable.');
 const token=request.cookies.get(setupName)?.value;
 if(!validPortalSession(token))return fail(401,'Temporary sign-in expired. Please sign in again.');
 try{
  const response=await fetch(upstream+'/api/employee-credentials/status',{
   method:'GET',cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(8000),
   headers:{Cookie:setupName+'='+token,Accept:'application/json'},
  });
  const value:unknown=await response.json().catch(()=>null);
  if(response.status!==200)return responseError(response,value);
  const status=temporaryCredentialStatus(value);
  return status?NextResponse.json(status,{headers}):
    fail(502,'Temporary account status could not be verified.');
 }catch{return fail(503,'Temporary sign-in status unavailable.');}
}
export async function temporaryReplace(request:NextRequest){
 const origin=approvedPublicOrigin(),upstream=approvedInternalOrigin();
 if(!origin||!upstream)return fail(503,'Employee credential service unavailable.');
 if(!originValid(request,origin))return fail(403,'Origin not permitted.');
 const token=request.cookies.get(setupName)?.value;
 if(!validPortalSession(token))return fail(401,'Temporary sign-in expired.');
 if(!request.headers.get('content-type')?.startsWith('application/json')||
   Number(request.headers.get('content-length')||0)>1024)return fail(400,'Invalid password replacement.');
 let body:unknown;
 try{const raw=await readBoundedRequestText(request,1024);
  if(raw===null)return fail(400,'Password request too large.');body=JSON.parse(raw);
 }catch{return fail(400,'Invalid JSON.');}
 const fields=temporaryCredentialPayload(body);
 if(!fields)return fail(400,'Review your new personal password and confirmation.');
 try{
  const response=await fetch(upstream+'/api/employee-credentials/replace',{
   method:'POST',cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(10000),
   headers:{Cookie:setupName+'='+token,Origin:origin,
      Accept:'application/json','Content-Type':'application/json'},
   body:JSON.stringify(fields),
  });
  const raw:unknown=await response.json().catch(()=>null);
  if(response.status!==200)return responseError(response,raw);
  if(!confirmedTemporaryReplace(raw))return fail(502,'Personal password replacement was not confirmed.');
  const result=NextResponse.json({message:'Your personal password is set. Sign in again to open your employee workspace.'},{headers});
  result.cookies.set({name:setupName,value:'',httpOnly:true,sameSite:'lax',
    secure:origin.startsWith('https:'),path:'/',expires:new Date(0)});
  return result;
 }catch{return fail(503,'Password replacement outcome uncertain. Try signing in before requesting recovery.');}
}

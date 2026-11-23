import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {readBoundedRequestText} from '@/features/workspace/BoundedRequestBody';
import {authenticationCookie,confirmedAuthResult,safeAuthError,validateAuthMutation} from './AuthProxyContract';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','Pragma':'no-cache'};
const failure=(status:number,message:string)=>NextResponse.json({message},{status,headers});
const token=/^[A-Za-z0-9_-]{32,128}$/;
const appCookie=/^vsph\.[a-z][a-z0-9_]{1,39}\.sid$/;
const sessionOptions=(secure:boolean)=>({
 httpOnly:true as const,secure,sameSite:'lax' as const,path:'/'
});
/** Credential material never leaves the fixed backend and is never logged. */
export async function authenticate(request:NextRequest,kind:'portal'|'application'){
 const origin=approvedPublicOrigin(),upstream=approvedInternalOrigin();
 if(!origin||!upstream)return failure(503,'Sign-in service unavailable.');
 if(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site')
   return failure(403,'Origin not permitted.');
 if(!request.headers.get('content-type')?.startsWith('application/json')||
   Number(request.headers.get('content-length')||0)>8192)
   return failure(400,'Invalid sign-in request.');
 const portalCookie=request.cookies.get('vsph.portal.sid')?.value;
 if(kind==='application'&&!validPortalSession(portalCookie))
   return failure(401,'Sign in to VSPH before opening an application.');
 let payload:unknown;
 try{const raw=await readBoundedRequestText(request,8192);
   if(raw===null)return failure(400,'Sign-in request is too large.');
   payload=JSON.parse(raw);
 }catch{return failure(400,'Invalid sign-in JSON.');}
 const credentials=validateAuthMutation(payload,kind);
 if(!credentials)return failure(400,'Review the email, password and authenticator fields.');
 const setup=request.cookies.get('vsph.employee.setup')?.value;
 const cookieHeader=kind==='application'?'vsph.portal.sid='+portalCookie:
   setup&&token.test(setup)?'vsph.employee.setup='+setup:'';
 const endpoint=kind==='portal'?'/api/auth/login':'/api/auth/app-login';
 try{
  const upstreamResponse=await fetch(upstream+endpoint,{method:'POST',
    cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(10000),
    headers:{Origin:origin,Accept:'application/json','Content-Type':'application/json',
      ...(cookieHeader?{Cookie:cookieHeader}:{})},
    body:JSON.stringify(credentials),
  });
  if(upstreamResponse.status!==200){
    const error:unknown=await upstreamResponse.json().catch(()=>null);
    const safe=safeAuthError(error);
    const allowed=[400,401,403,404,409,422,428,429].includes(upstreamResponse.status);
    const status=allowed?upstreamResponse.status:503;
    const response=NextResponse.json(allowed?safe:{
      message:'Authentication backend unavailable. No session was created.'
    },{status,headers});
    if(status===429){
      const retry=upstreamResponse.headers.get('retry-after');
      if(retry&&/^\d{1,4}$/.test(retry))response.headers.set('Retry-After',retry);
    }
    return response;
  }
  const result:unknown=await upstreamResponse.json().catch(()=>null);
  const confirmed=confirmedAuthResult(result,kind,credentials.app);
  if(!confirmed)return failure(502,'Sign-in confirmation was invalid. No browser session was issued.');
  const cookieName=confirmed==='temporary'?'vsph.employee.setup':
    confirmed==='portal'?'vsph.portal.sid':'vsph.'+credentials.app!.toLowerCase()+'.sid';
  const cookieValue=authenticationCookie(upstreamResponse.headers,cookieName);
  if(!cookieValue)return failure(502,'Sign-in cookie not confirmed. No browser session was issued.');
  const secure=origin.startsWith('https:');
  const body=confirmed==='temporary'?{passwordChangeRequired:true,redirect:'/employee-password'}:
    confirmed==='application'?{redirect:'/apps/'+credentials.app!.toLowerCase()+'/home',message:'Application signed in.'}:
    {message:'Signed in.'};
  const response=NextResponse.json(body,{headers});
  // Only issue cookies that the original backend proved with a valid session token.
  response.cookies.set({...sessionOptions(secure),name:cookieName,value:cookieValue,
    maxAge:confirmed==='temporary'?600:4*3600});
  // A new portal/temporary identity cannot reuse app cookies tied to the old session.
  if(kind==='portal'){
    for(const previous of request.cookies.getAll()){
      if(previous.name===cookieName)continue;
      if(previous.name==='vsph.employee.setup'||previous.name==='vsph.portal.sid'||
        appCookie.test(previous.name))
        response.cookies.set({...sessionOptions(secure),name:previous.name,value:'',
          expires:new Date(0)});
    }
  }
  return response;
 }catch{
  return failure(503,'Sign-in could not be verified. No browser session was issued.');
 }
}

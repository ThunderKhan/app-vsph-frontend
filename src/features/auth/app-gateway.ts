import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {readBoundedRequestText} from '@/features/workspace/BoundedRequestBody';
import {appCode,confirmedAppRecord,parseAppRecords,parseAppWorkspaceContext,validatedAppRecord} from './AppWorkspaceContract';

const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
const fail=(status:number,message:string)=>NextResponse.json({message},{status,headers});
function context(request:NextRequest,rawCode:string){
 const code=rawCode.toUpperCase();
 if(!appCode(code))return null;
 const portal=request.cookies.get('vsph.portal.sid')?.value;
 const app=request.cookies.get('vsph.'+code.toLowerCase()+'.sid')?.value;
 if(!validPortalSession(portal)||!validPortalSession(app))return {code,authorized:false} as const;
 return {code,authorized:true,portal:portal!,app:app!} as const;
}
async function fetchApp(request:NextRequest,rawCode:string,path:'context'|'records'){
 const scope=context(request,rawCode);
 if(!scope)return fail(400,'Invalid application.');
 if(!scope.authorized)return fail(401,'Sign in to the portal and application.');
 const upstream=approvedInternalOrigin();
 if(!upstream)return fail(503,'Application service unavailable.');
 try{
  const response=await fetch(upstream+'/api/apps/'+scope.code+'/'+path,{
    method:'GET',cache:'no-store',redirect:'manual',
    headers:{Cookie:'vsph.portal.sid='+scope.portal+'; vsph.'+scope.code.toLowerCase()+'.sid='+scope.app,
      Accept:'application/json'},signal:AbortSignal.timeout(8000),
  });
  if(response.status===401)return fail(401,'Application session expired. Sign in again.');
  if(response.status===403)return fail(403,'Current application access was revoked.');
  if(response.status!==200)return fail(503,'Application data unavailable.');
  const raw:unknown=await response.json().catch(()=>null);
  if(path==='context'){
    const value=parseAppWorkspaceContext(raw,scope.code);
    return value?NextResponse.json(value,{headers}):fail(502,'Invalid application identity response.');
  }
  const records=parseAppRecords(raw,scope.code);
  return records!==null?NextResponse.json({records},{headers}):fail(502,'Invalid application records response.');
 }catch{return fail(503,'Application service unavailable.');}
}
export const getAppContext=(request:NextRequest,app:string)=>fetchApp(request,app,'context');
export const getAppRecords=(request:NextRequest,app:string)=>fetchApp(request,app,'records');

export async function postAppRecord(request:NextRequest,rawCode:string){
 const scope=context(request,rawCode);
 if(!scope)return fail(400,'Invalid application.');
 if(!scope.authorized)return fail(401,'Sign in to the portal and application.');
 const origin=approvedPublicOrigin(),upstream=approvedInternalOrigin();
 if(!origin||!upstream)return fail(503,'Application service unavailable.');
 if(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site')
   return fail(403,'Origin not permitted.');
 if(!request.headers.get('content-type')?.startsWith('application/json')||
   Number(request.headers.get('content-length')||0)>2048)return fail(400,'Invalid record request.');
 let data:unknown;
 try{const raw=await readBoundedRequestText(request,2048);if(raw===null)
   return fail(400,'Record request too large.');
   data=JSON.parse(raw);
 }catch{return fail(400,'Invalid JSON.');}
 const record=validatedAppRecord(data,scope.code);
 if(!record)return fail(400,'Invalid product record fields.');
 try{
  const response=await fetch(upstream+'/api/apps/'+scope.code+'/records',{
    method:'POST',cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(8000),
    headers:{Cookie:'vsph.portal.sid='+scope.portal+'; vsph.'+scope.code.toLowerCase()+'.sid='+scope.app,
      Origin:origin,Accept:'application/json','Content-Type':'application/json'},
    body:JSON.stringify(record),
  });
  if(response.status===401)return fail(401,'Application session expired.');
  if(response.status===403)return fail(403,'Record creation or product role denied.');
  if(response.status===400||response.status===422)return fail(400,'Record data rejected.');
  if(response.status!==201)return fail(503,'Record creation not confirmed.');
  const result:unknown=await response.json().catch(()=>null);
  if(!confirmedAppRecord(result))return fail(502,'Record creation confirmation invalid.');
  return NextResponse.json({ok:true},{status:201,headers});
 }catch{return fail(503,'Record creation not confirmed.');}
}
export async function logoutApp(request:NextRequest){
 const origin=approvedPublicOrigin(),upstream=approvedInternalOrigin();
 if(!origin||!upstream)return fail(503,'App logout unavailable.');
 if(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site')
   return fail(403,'Origin not permitted.');
 if(!request.headers.get('content-type')?.startsWith('application/json')||
   Number(request.headers.get('content-length')||0)>1024)return fail(400,'Invalid logout request.');
 let body:unknown;
 try{const raw=await readBoundedRequestText(request,1024);if(raw===null)return fail(400,'Request too large.');
  body=JSON.parse(raw);}catch{return fail(400,'Invalid JSON.');}
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==1||
  !Object.hasOwn(body,'app'))return fail(400,'Select an application to sign out.');
 const code=(body as {app:unknown}).app;
 if(!appCode(code))return fail(400,'Invalid application code.');
 const portal=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(portal))return fail(401,'Portal session required.');
 const name='vsph.'+code.toLowerCase()+'.sid';
 const session=request.cookies.get(name)?.value;
 if(session!==undefined&&!validPortalSession(session))return fail(400,'Invalid app session.');
 try{
  const response=await fetch(upstream+'/api/auth/app-logout',{
   method:'POST',cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(8000),
   headers:{Cookie:'vsph.portal.sid='+portal+(session?'; '+name+'='+session:''),
     Origin:origin,Accept:'application/json','Content-Type':'application/json'},
   body:JSON.stringify({app:code}),
  });
  if(response.status===401)return fail(401,'Portal session expired.');
  if(response.status!==200)return fail(503,'App logout could not be verified.');
  const data:unknown=await response.json().catch(()=>null);
  if(!data||typeof data!=='object'||!('message' in data)||
    data.message!=='Application signed out.')return fail(502,'App logout confirmation invalid.');
  const result=NextResponse.json({ok:true},{headers});
  result.cookies.set({name,value:'',httpOnly:true,path:'/',sameSite:'lax',
    secure:origin.startsWith('https:'),expires:new Date(0)});
  return result;
 }catch{return fail(503,'Application logout not confirmed.');}
}

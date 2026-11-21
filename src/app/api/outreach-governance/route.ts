import {readBoundedRequestText} from '@/features/workspace/BoundedRequestBody';
import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {outreachMutation} from '@/features/operations/OutreachAccessContract';
const headers={'Cache-Control':'no-store'};
const fail=(status:number,message:string)=>NextResponse.json({message},{status,headers});
export async function POST(request:NextRequest){
 const origin=approvedPublicOrigin(),upstream=approvedInternalOrigin();
 if(!origin||!upstream)return fail(503,'Outreach governance unavailable.');
 if(request.headers.get('origin')!==origin||
   request.headers.get('sec-fetch-site')==='cross-site')return fail(403,'Origin not permitted.');
 const token=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(token))return fail(401,'Sign in again.');
 if(!request.headers.get('content-type')?.startsWith('application/json')||
   Number(request.headers.get('content-length')||0)>1024)return fail(400,'Invalid grant request.');
 let raw:unknown;
 try{const body=await readBoundedRequestText(request,1024);if(body===null||body.length>1024)return fail(400,'Request too large.');raw=JSON.parse(body);}
 catch{return fail(400,'Invalid JSON.');}
 const action=outreachMutation(raw);
 if(!action)return fail(400,'Review current Outreach role and account.');
 try{
   const response=await fetch(upstream+'/api/admin-management/outreach-access/'+action.userId,{
    method:action.method,cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(8000),
    headers:{Cookie:'vsph.portal.sid='+token,Origin:origin,Accept:'application/json',
      ...(action.method==='PUT'?{'Content-Type':'application/json'}:{})},
    ...(action.method==='PUT'?{body:JSON.stringify({role:action.role})}:{})});
   if(response.status===401)return fail(401,'Sign in again.');
   if(response.status===403)return fail(403,'Owner authorization required.');
   if(response.status===409)return fail(409,'Outreach grant changed. Refresh current access.');
   if(![200,204].includes(response.status))return fail(503,'Outreach operation was not confirmed.');
   return NextResponse.json({ok:true},{headers});
 }catch{return fail(503,'Outreach governance service unavailable.');}
}

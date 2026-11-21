import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
const headers={'Cache-Control':'no-store'};
const fail=(status:number,message:string)=>NextResponse.json({message},{status,headers});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request:NextRequest){
 const origin=approvedPublicOrigin(),upstream=approvedInternalOrigin();
 if(!origin||!upstream)return fail(503,'HR governance unavailable.');
 if(request.headers.get('origin')!==origin||
    request.headers.get('sec-fetch-site')==='cross-site')return fail(403,'Origin not permitted.');
 const token=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(token))return fail(401,'Sign in again.');
 if(!request.headers.get('content-type')?.startsWith('application/json')||
     Number(request.headers.get('content-length')||0)>1024)return fail(400,'Invalid action.');
 let v:unknown;try{const t=await request.text();if(t.length>1024)return fail(400,'Invalid action.');
    v=JSON.parse(t);}catch{return fail(400,'Invalid JSON.');}
 if(!v||typeof v!=='object'||Array.isArray(v))return fail(400,'Invalid action.');
 const data=v as Record<string,unknown>;
 if(Object.keys(data).length!==4||data.action!=='revoke_hr'||typeof data.id!=='string'||
    !uuid.test(data.id)||!Number.isSafeInteger(data.version)||
    (data.version as number)<1||data.confirmed!==true)return fail(400,'Review the current HR authority and employee version.');
 try{
   const response=await fetch(upstream+'/api/employees/'+data.id+'/revoke_hr',{
     method:'POST',cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(8000),
     headers:{Cookie:'vsph.portal.sid='+token,Origin:origin,
       'Content-Type':'application/json',Accept:'application/json'},
     body:JSON.stringify({version:data.version,confirmed:true}),
   });
   if(response.status===401)return fail(401,'Sign in again.');
   if(response.status===403)return fail(403,'Only the current platform owner may revoke HR authority.');
   if(response.status===409)return fail(409,'Roster record changed. Reload and review.');
   if(response.status!==200)return fail(503,'HR authority change was not confirmed.');
   return NextResponse.json({ok:true},{headers});
 }catch{return fail(503,'HR authority service unavailable.');}
}

import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {calendarMutation} from '@/features/calendar/CalendarContract';
const headers={'Cache-Control':'no-store'};
const fail=(status:number,message:string)=>NextResponse.json({message},{status,headers});
export async function POST(request:NextRequest){
 const origin=approvedPublicOrigin(),upstream=approvedInternalOrigin();
 if(!origin||!upstream)return fail(503,'Calendar unavailable.');
 if(request.headers.get('origin')!==origin||
    request.headers.get('sec-fetch-site')==='cross-site')return fail(403,'Origin not permitted.');
 const cookie=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(cookie))return fail(401,'Sign in again.');
 if(!request.headers.get('content-type')?.startsWith('application/json')||
    Number(request.headers.get('content-length')||0)>4096)return fail(400,'Invalid calendar request.');
 let raw:unknown;
 try{const body=await request.text();if(body.length>4096)return fail(400,'Calendar request too long.');
   raw=JSON.parse(body);}catch{return fail(400,'Invalid JSON.');}
 const action=calendarMutation(raw);
 if(!action)return fail(400,'Review the event fields, date range and current version.');
 try{
   const response=await fetch(upstream+action.path,{
     method:action.method,cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(8000),
     headers:{Cookie:'vsph.portal.sid='+cookie,Origin:origin,
       'Content-Type':'application/json',Accept:'application/json'},
     body:JSON.stringify(action.body),
   });
   if(response.status===401)return fail(401,'Sign in again.');
   if(response.status===403)return fail(403,'Event access denied.');
   if(response.status===409)return fail(409,'Event changed. Reload before retrying.');
   if(response.status===400||response.status===422)return fail(400,'Review current event details.');
   if(![200,201,204].includes(response.status))return fail(503,'Event operation could not be confirmed.');
   return NextResponse.json({ok:true},{headers});
 }catch{return fail(503,'Calendar service unavailable. The event was not confirmed.');}
}

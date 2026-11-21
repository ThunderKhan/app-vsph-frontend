import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {deliveryCommand} from '@/features/projects/DeliveryMutationContract';
const headers={'Cache-Control':'no-store'};
const fail=(status:number,message:string)=>NextResponse.json({message},{status,headers});
/** Server-owned GitHub App proxy; project manager/owner permissions enforced upstream. */
export async function POST(request:NextRequest){
 const origin=approvedPublicOrigin(),upstream=approvedInternalOrigin();
 if(!origin||!upstream)return fail(503,'GitHub integration unavailable.');
 if(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site')
   return fail(403,'Origin not permitted.');
 const session=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(session))return fail(401,'Sign in again.');
 if(!request.headers.get('content-type')?.startsWith('application/json')||
    Number(request.headers.get('content-length')||0)>2048)return fail(400,'Invalid request body.');
 let raw:unknown;
 try{const txt=await request.text();if(txt.length>2048)return fail(400,'Delivery request too long.');
   raw=JSON.parse(txt);}catch{return fail(400,'Invalid JSON.');}
 const command=deliveryCommand(raw);
 if(!command)return fail(400,'Invalid delivery operation or required IDs.');
 try{
  const response=await fetch(upstream+command.path,{method:'POST',cache:'no-store',
    redirect:'manual',signal:AbortSignal.timeout(10000),
    headers:{Cookie:'vsph.portal.sid='+session,Origin:origin,Accept:'application/json',
      'Content-Type':'application/json'},
    body:JSON.stringify(command.body)});
  if(response.status===401)return fail(401,'Sign in again.');
  if(response.status===403)return fail(403,'GitHub installation or current project authorization denied.');
  if(response.status===409)return fail(409,'Delivery connection changed. Reload before retrying.');
  if(response.status===400||response.status===422)return fail(400,'Requested provider or project record denied.');
  if(response.status!==200)return fail(503,'Delivery operation unconfirmed. Refresh before retrying.');
  const result:unknown=await response.json().catch(()=>null);
  if(!result||typeof result!=='object'||Array.isArray(result))
    return fail(502,'Delivery confirmation unavailable. Refresh before retrying.');
  return NextResponse.json({ok:true,requested:command.action},{headers});
 }catch{return fail(503,'Delivery provider or service unavailable. No update confirmed.');}
}

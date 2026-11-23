import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {trustedOutreachStartUrl} from '@/features/outreach/OutreachLaunchContract';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
const fail=(status:number,message:string)=>new NextResponse(message,{
 status,headers:{...headers,'Content-Type':'text/plain; charset=utf-8'}
});
export async function GET(request:NextRequest){
 const approved=trustedOutreachStartUrl(process.env.OUTREACH_SSO_START_URL);
 const upstream=approvedInternalOrigin();
 if(!approved||!upstream)return fail(503,'Outreach launch is not configured on this frontend.');
 const cookie=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(cookie))return fail(401,'Sign in to VSPH before launching Outreach.');
 try{
  // The Express backend makes the current active-employee/grant/registry decision.
  const result=await fetch(upstream+'/apps/outreach/launch',{
   method:'GET',cache:'no-store',redirect:'manual',
   headers:{Cookie:'vsph.portal.sid='+cookie,Accept:'text/html'},
   signal:AbortSignal.timeout(8000)
  });
  if(result.status===401)return fail(401,'Your portal session has expired.');
  if(result.status===403)return fail(403,'Your current Outreach grant or employment access was denied.');
  if(result.status===503)return fail(503,'The Outreach receiver or SSO configuration is unavailable.');
  if(result.status!==303)return fail(503,'Outreach launch could not be authorized.');
  // Exact fixed destination match prevents following arbitrary upstream Location headers.
  if(result.headers.get('location')!==approved)return fail(502,'Untrusted Outreach launch destination rejected.');
  const response=NextResponse.redirect(approved,303);
  for(const [key,value] of Object.entries(headers))response.headers.set(key,value);
  return response;
 }catch{return fail(503,'Outreach launch could not be verified.');}
}

import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {readBoundedRequestText} from '@/features/workspace/BoundedRequestBody';
import {parseOwnerTransferRequest,parseOwnerMfaFactors,confirmedOwnerTransfer} from '@/features/organizations/OwnerTransferContract';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
const fail=(status:number,message:string,code?:string,factors?:{id:string;name:string}[])=>
 NextResponse.json({message,...(code?{code}:{}),...(factors?{factors}:{})},{status,headers});
/**
 * Single-request owner transfer ceremony.
 * Password/OTP are verified by the existing backend. The ephemeral authorization
 * proof is used immediately inside this server request and never returned to a browser.
 */
export async function POST(request:NextRequest){
 const origin=approvedPublicOrigin(),upstream=approvedInternalOrigin();
 if(!origin||!upstream)return fail(503,'Ownership transfer is unavailable.');
 if(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site')
   return fail(403,'Origin not permitted.');
 const session=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(session))return fail(401,'Sign in again.');
 if(!request.headers.get('content-type')?.startsWith('application/json')||
   Number(request.headers.get('content-length')||0)>8192)return fail(400,'Invalid transfer request.');
 let body:unknown;
 try{const raw=await readBoundedRequestText(request,8192);if(raw===null)return fail(400,'Request too large.');
   body=JSON.parse(raw);}catch{return fail(400,'Invalid transfer request.');}
 const input=parseOwnerTransferRequest(body);
 if(!input)return fail(400,'Review the target, versions and current-account verification.');
 const {organizationId,targetUserId,organizationVersion,ownerVersion,targetVersion,
   password,totpCode,totpFactorId}=input;
 const intent={targetUserId,organizationVersion,ownerVersion,targetVersion};
 const endpoint=upstream+'/api/organizations/'+organizationId+'/ownership/';
 const verifiedHeaders={Cookie:'vsph.portal.sid='+session,Origin:origin,
    'Content-Type':'application/json',Accept:'application/json'};
 try{
  const reauth=await fetch(endpoint+'reauthenticate',{
    method:'POST',cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(10000),
    headers:verifiedHeaders,body:JSON.stringify({...intent,password,
      ...(totpCode?{totpCode,totpFactorId}:{})})
  });
  if(reauth.status!==200){
    const rawError:unknown=await reauth.json().catch(()=>null);
    const code=rawError&&typeof rawError==='object'&&'code' in rawError&&typeof rawError.code==='string'?
      rawError.code:'';
    if(code==='MFA_REQUIRED'){
      const factors=rawError&&typeof rawError==='object'&&'factors' in rawError?
        parseOwnerMfaFactors(rawError.factors):[];
      return fail(428,'Verify your enrolled authenticator and re-enter your current password.',
        'MFA_REQUIRED',factors);
    }
    if(['MFA_INVALID','INVALID_CREDENTIALS','IDENTITY_MISMATCH'].includes(code))
      return fail(422,'Your current account identity could not be verified.',code);
    if(reauth.status===401)return fail(401,'Sign in again.');
    if(reauth.status===403)return fail(403,'Ownership verification denied.');
    if(reauth.status===409)return fail(409,'Owner or target changed. Refresh the review.');
    return fail(503,'Current-account verification was not confirmed.');
  }
  const authorization:unknown=await reauth.json().catch(()=>null);
  if(!authorization||typeof authorization!=='object'||!('proof' in authorization)||
     typeof authorization.proof!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(authorization.proof))
    return fail(502,'Ownership proof response was invalid.');
  const final=await fetch(endpoint+'transfer',{
    method:'POST',cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(10000),
    headers:{...verifiedHeaders,'X-VSPH-Step-Up':authorization.proof},
    body:JSON.stringify({...intent,confirmed:true}),
  });
  if(final.status===401)return fail(401,'Sign in again.');
  if(final.status===403)return fail(403,'Transfer authorization expired or was denied.');
  if(final.status===409)return fail(409,'Owner or target changed. Refresh the review.');
  if(final.status!==200)return fail(503,'Transfer not confirmed. Check the current owner before retrying.');
  const outcome:unknown=await final.json().catch(()=>null);
  if(!confirmedOwnerTransfer(outcome,input))
    return fail(502,'Transfer outcome not verified. Check the current owner before retrying.');
  return NextResponse.json({ok:true,ownerId:targetUserId},{headers});
 }catch{return fail(503,'Transfer outcome uncertain. Review the current owner before retrying.');}
}

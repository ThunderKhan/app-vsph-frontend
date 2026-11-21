import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {identityMutation} from '@/features/employee-work/IdentityContract';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
const fail=(status:number,message:string)=>NextResponse.json({message},{status,headers});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request:NextRequest){
 const origin=approvedPublicOrigin(),upstream=approvedInternalOrigin();
 if(!origin||!upstream)return fail(503,'Account link service unavailable.');
 if(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site')
   return fail(403,'Origin not permitted.');
 const token=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(token))return fail(401,'Sign in again.');
 if(!request.headers.get('content-type')?.startsWith('application/json')||
    Number(request.headers.get('content-length')||0)>8192)return fail(400,'Invalid account-link request.');
 let raw:unknown;
 try{const value=await request.text();if(value.length>8192)return fail(400,'Invalid account-link request.');
  raw=JSON.parse(value);}catch{return fail(400,'Invalid JSON.');}
 const action=identityMutation(raw);
 if(!action)return fail(400,'Review and confirm current employee identity details.');
 const key=request.headers.get('Idempotency-Key');
 if(action.key&&(!key||!uuid.test(key)))return fail(400,'A UUID idempotency key is required.');
 try{
  const response=await fetch(upstream+action.path,{method:'POST',cache:'no-store',
    redirect:'manual',signal:AbortSignal.timeout(8000),
    headers:{Cookie:'vsph.portal.sid='+token,Origin:origin,'Content-Type':'application/json',
      Accept:'application/json',...(action.key?{'Idempotency-Key':key!}:{})},
    body:JSON.stringify(action.body)});
  if(response.status===401){
    // MFA continuation information is limited to safe factor identifiers and labels.
    const rawError:unknown=await response.json().catch(()=>null);
    if(rawError&&typeof rawError==='object'&&'code' in rawError&&
       rawError.code==='MFA_REQUIRED'){
      const factorRows='factors' in rawError&&Array.isArray(rawError.factors)?
        rawError.factors.slice(0,12).filter((f:unknown)=>f!==null&&typeof f==='object'&&
          'id' in f&&typeof f.id==='string'&&uuid.test(f.id)&&
          'name' in f&&typeof f.name==='string'&&f.name.length<=100)
          .map((f:unknown)=>({id:(f as {id:string}).id,name:(f as {name:string}).name})):[];
      return NextResponse.json({code:'MFA_REQUIRED',factors:factorRows,message:'Authenticator verification required.'},
        {status:401,headers});
    }
    return fail(401,'Identity verification failed or your session expired.');
  }
  if(response.status===403)return fail(403,'Identity operation not permitted.');
  if(response.status===409)return fail(409,'Identity request changed. Refresh before trying again.');
  if(response.status===400||response.status===422)return fail(400,'Current identity proof or request details were rejected.');
  if(response.status!==200)return fail(503,'Identity operation was not confirmed. Refresh before retrying.');
  return NextResponse.json({ok:true},{headers});
 }catch{return fail(503,'Identity service unavailable. No change has been confirmed.');}
}

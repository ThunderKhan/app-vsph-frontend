import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {validateFinanceWrite,financeWriteConfirmed} from '@/features/operations/FinanceManageContract';
import {readBoundedRequestText} from '@/features/workspace/BoundedRequestBody';
const headers={'Cache-Control':'no-store'};
const fail=(message:string,status:number)=>NextResponse.json({message},{status,headers});
/** Strict owner-finance mutation gateway; the backend rechecks all authority and ledger rules. */
export async function POST(request:NextRequest){
 const origin=approvedPublicOrigin(),upstream=approvedInternalOrigin();
 if(!origin||!upstream)return fail('Finance service unavailable.',503);
 if(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site')
   return fail('Origin not permitted.',403);
 const cookie=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(cookie))return fail('Sign in again.',401);
 if(!request.headers.get('content-type')?.startsWith('application/json')||
   Number(request.headers.get('content-length')||0)>4096)return fail('Invalid request body.',400);
 let data:unknown;
 try{const raw=await readBoundedRequestText(request,4096);if(raw===null)return fail('Finance request too large.',400);data=JSON.parse(raw);}
 catch{return fail('Invalid JSON.',400);}
 const mutation=validateFinanceWrite(data);
 if(!mutation)return fail('Review the finance amount, dates, reference and confirmation.',400);
 try{
  const response=await fetch(upstream+mutation.path,{method:'POST',cache:'no-store',
   redirect:'manual',signal:AbortSignal.timeout(8000),
   headers:{Cookie:'vsph.portal.sid='+cookie,Origin:origin,'Content-Type':'application/json',
     Accept:'application/json',...(mutation.idempotencyKey?{'Idempotency-Key':mutation.idempotencyKey}:{})},
   body:JSON.stringify(mutation.body)});
  if(response.status===401)return fail('Sign in again.',401);
  if(response.status===403)return fail('Only the active platform owner may manage finance.',403);
  if(response.status===409)return fail('Finance record changed or conflicts with the current ledger. Reload before retrying.',409);
  if(response.status===400||response.status===422)return fail('Finance record rejected. Review current details.',400);
  if(response.status!==200&&response.status!==201)return fail('Financial operation not confirmed. Reconcile the ledger before retrying.',503);
  const raw:unknown=await response.json().catch(()=>null);
  if(!financeWriteConfirmed(raw,mutation.action))
   return fail('Financial confirmation invalid. Reconcile current ledger before retrying.',502);
  return NextResponse.json({ok:true,action:mutation.action,replayed:
     raw&&typeof raw==='object'&&'replayed' in raw&&raw.replayed===true},{headers});
 }catch{return fail('Finance service unavailable. The operation was not confirmed.',503);}
}

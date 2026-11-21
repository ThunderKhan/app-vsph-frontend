import {type NextRequest,NextResponse} from 'next/server';
import {portalApi} from '@/features/workspace/server-api';
import {parseOwnerTransferPreview} from '@/features/organizations/OwnerTransferContract';
const headers={'Cache-Control':'no-store'};
const fail=(status:number,message:string)=>NextResponse.json({message},{status,headers});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Preview is always recomputed by the legacy owner-only backend. */
export async function GET(request:NextRequest){
 const params=request.nextUrl.searchParams,keys=[...params.keys()];
 if(keys.length!==2||new Set(keys).size!==2||
    keys.some(k=>!['organizationId','targetUserId'].includes(k)))
   return fail(400,'Choose an active organization administrator.');
 const orgId=params.get('organizationId')||'',targetId=params.get('targetUserId')||'';
 if(!uuid.test(orgId)||!uuid.test(targetId))return fail(400,'Invalid organization or administrator.');
 const result=await portalApi('/api/organizations/'+orgId+'/ownership/preview?targetUserId='+targetId);
 if(result.kind==='unauthorized')return fail(401,'Sign in again.');
 if(result.kind==='forbidden')return fail(403,'Current ownership permission denied.');
 if(result.kind!=='ok')return fail(503,'Ownership preview unavailable.');
 const preview=parseOwnerTransferPreview(result.value,orgId,targetId);
 if(!preview)return fail(502,'Ownership preview could not be verified.');
 return NextResponse.json(preview,{headers});
}

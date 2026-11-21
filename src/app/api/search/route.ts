import {NextRequest,NextResponse} from 'next/server';
import {portalApi} from '@/features/workspace/server-api';
import {parseSearchPage,validatedSearchParams} from '@/features/search/SearchContract';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const failure=(status:number,message:string)=>NextResponse.json({message},{status,headers});
export async function GET(request:NextRequest){
  const params=validatedSearchParams(request.nextUrl.searchParams);
  if(!params)return failure(400,'Use 2–100 characters and valid search filters.');
  const result=await portalApi('/api/search?'+params.toString());
  if(result.kind==='unauthorized')return failure(401,'Your session has expired. Sign in again.');
  if(result.kind==='forbidden')return failure(403,'Search is not available for this account.');
  if(result.kind!=='ok')return failure(503,'Search is unavailable. Retry after the dependency recovers.');
  const page=parseSearchPage(result.value);
  if(!page)return failure(502,'Search returned an invalid response.');
  return NextResponse.json(page,{headers});
}

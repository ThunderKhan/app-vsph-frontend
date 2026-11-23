import {type NextRequest,NextResponse} from 'next/server';
import {portalApi} from '@/features/workspace/server-api';
import {parseRepositoryDiscovery} from '@/features/projects/DeliveryMutationContract';
const headers={'Cache-Control':'no-store'};
const fail=(status:number,message:string)=>NextResponse.json({message},{headers,status});
export async function GET(request:NextRequest){
 const params=request.nextUrl.searchParams,keys=[...params.keys()];
 const id=params.get('projectId'),installation=params.get('installationId'),page=params.get('page')||'1';
 if(keys.length<2||keys.length>3||new Set(keys).size!==keys.length||
   keys.some(k=>!['projectId','installationId','page'].includes(k))||
   !id||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||
   !installation||!/^[1-9][0-9]{0,14}$/.test(installation)||
   !/^[1-9][0-9]?$/.test(page)||Number(page)>50)
   return fail(400,'Choose a valid approved installation and repository page.');
 const path='/api/projects/'+id+'/delivery/repositories?'+
   new URLSearchParams({installationId:installation,page}).toString();
 const result=await portalApi(path);
 if(result.kind==='unauthorized')return fail(401,'Sign in again.');
 if(result.kind==='forbidden')return fail(403,'Repository discovery permission denied.');
 if(result.kind!=='ok')return fail(503,'Repository discovery unavailable.');
 const model=parseRepositoryDiscovery(result.value);
 if(!model)return fail(502,'Invalid repository discovery response.');
 return NextResponse.json(model,{headers});
}

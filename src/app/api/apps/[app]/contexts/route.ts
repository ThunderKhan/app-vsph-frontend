import {NextResponse} from 'next/server';
import {portalApi} from '@/features/workspace/server-api';
import {applicationLoginContext} from '@/features/auth/AuthProxyContract';
const headers={'Cache-Control':'no-store'};
const fail=(status:number,message:string)=>NextResponse.json({message},{status,headers});
/** Current signed-in account and explicit product grants are resolved in the backend. */
export async function GET(_request:Request,{params}:{params:Promise<{app:string}>}){
 const {app}=await params,code=app.toUpperCase();
 if(!/^[A-Z][A-Z0-9_]{1,39}$/.test(code))return fail(400,'Invalid application code.');
 const response=await portalApi('/api/apps/'+code+'/contexts');
 if(response.kind==='unauthorized')return fail(401,'Sign in to the portal first.');
 if(response.kind==='forbidden')return fail(403,'Product access denied.');
 if(response.kind!=='ok')return fail(503,'Application identity and context unavailable.');
 const data=applicationLoginContext(response.value,code);
 if(!data)return fail(502,'Application identity or assigned workspace could not be verified.');
 if(!data.organizations.length)return fail(403,'No active customer organization is assigned.');
 return NextResponse.json(data,{headers});
}

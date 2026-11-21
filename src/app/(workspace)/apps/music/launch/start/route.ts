import {type NextRequest,NextResponse} from 'next/server';
import {portalApi} from '@/features/workspace/server-api';
import {parseMusicLaunch} from '@/features/music/MusicLaunchContract';

const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(status:number,message:string)=>new NextResponse(message,{
 status,headers:{...headers,'Content-Type':'text/plain; charset=utf-8'}
});

/**
 * Each Music launch is authorized again with the current portal session.
 * Do not trust a prior client-rendered configuration or a caller-supplied URL.
 * The Music receiver begins its own state + PKCE exchange after this redirect.
 */
export async function GET(request:NextRequest){
 const params=request.nextUrl.searchParams,keys=[...params.keys()];
 if(keys.length!==1||keys[0]!=='organizationId')return fail(400,'Choose a valid Music workspace.');
 const requested=params.get('organizationId')||'';
 if(!uuid.test(requested))return fail(400,'Choose a valid Music workspace.');
 const response=await portalApi('/api/sso/config/MUSIC');
 if(response.kind==='unauthorized')return fail(401,'Sign in again to open Music.');
 if(response.kind==='forbidden')return fail(403,'Music entitlement denied.');
 if(response.kind!=='ok')return fail(503,'Music integration unavailable.');
 const config=parseMusicLaunch(response.value,process.env.MUSIC_SSO_START_URL);
 if(!config)return fail(503,'Music integration is not configured or authorized.');
 const organization=config.organizations.find(o=>o.id.toLowerCase()===requested.toLowerCase());
 if(!organization)return fail(403,'Music access denied for this organization.');
 const destination=new URL(config.startUrl);
 destination.searchParams.set('organization_id',organization.id);
 const redirect=NextResponse.redirect(destination.toString(),303);
 for(const [key,value] of Object.entries(headers))redirect.headers.set(key,value);
 return redirect;
}

import {type NextRequest,NextResponse} from 'next/server';
import {portalApi} from '@/features/workspace/server-api';
import {calendarReadParams,parseCalendarPage} from '@/features/calendar/CalendarContract';
const headers={'Cache-Control':'no-store'};
const fail=(status:number,message:string)=>NextResponse.json({message},{status,headers});
export async function GET(request:NextRequest){
 const params=calendarReadParams(request.nextUrl.searchParams);
 if(!params)return fail(400,'Choose a valid calendar date range.');
 const result=await portalApi('/api/hrms/calendar?'+params.toString());
 if(result.kind==='unauthorized')return fail(401,'Sign in again.');
 if(result.kind==='forbidden')return fail(403,'Current internal calendar permission required.');
 if(result.kind!=='ok')return fail(503,'Calendar unavailable.');
 const data=parseCalendarPage(result.value);
 if(!data)return fail(502,'Invalid calendar response.');
 return NextResponse.json(data,{headers});
}

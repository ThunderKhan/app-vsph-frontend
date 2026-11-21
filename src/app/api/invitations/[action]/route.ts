import {type NextRequest,NextResponse} from 'next/server';
import {publicInvitation} from '@/features/employee-entry/EnrollmentGateway';
type Props={params:Promise<{action:string}>};
export async function POST(request:NextRequest,{params}:Props){
 const {action}=await params;
 if(action!=='inspect'&&action!=='accept')return NextResponse.json({
  message:'Unsupported customer invitation operation.'},{status:404});
 return publicInvitation(request,'customer',action);
}

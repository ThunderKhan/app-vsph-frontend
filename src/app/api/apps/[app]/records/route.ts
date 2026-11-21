import {type NextRequest} from 'next/server';
import {getAppRecords,postAppRecord} from '@/features/auth/app-gateway';
type Props={params:Promise<{app:string}>};
export const GET=async(request:NextRequest,{params}:Props)=>
 getAppRecords(request,(await params).app);
export const POST=async(request:NextRequest,{params}:Props)=>
 postAppRecord(request,(await params).app);

import {type NextRequest} from 'next/server';
import {getAppContext} from '@/features/auth/app-gateway';
export const GET=async(request:NextRequest,{params}:{params:Promise<{app:string}>})=>
 getAppContext(request,(await params).app);

import {type NextRequest} from 'next/server';
import {logoutApp} from '@/features/auth/app-gateway';
export const POST=(request:NextRequest)=>logoutApp(request);

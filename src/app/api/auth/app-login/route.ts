import {type NextRequest} from 'next/server';
import {authenticate} from '@/features/auth/auth-gateway';
/** Requires an existing portal session and backend-verified application access. */
export const POST=(request:NextRequest)=>authenticate(request,'application');

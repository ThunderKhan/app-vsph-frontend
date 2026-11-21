import {type NextRequest} from 'next/server';
import {authenticate} from '@/features/auth/auth-gateway';
/** The legacy portal session remains the only authentication authority. */
export const POST=(request:NextRequest)=>authenticate(request,'portal');

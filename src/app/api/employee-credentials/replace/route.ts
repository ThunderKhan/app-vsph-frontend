import {type NextRequest} from 'next/server';
import {temporaryReplace} from '@/features/employee-entry/EnrollmentGateway';
export const POST=(request:NextRequest)=>temporaryReplace(request);

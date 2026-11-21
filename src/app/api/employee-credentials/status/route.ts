import {type NextRequest} from 'next/server';
import {temporaryStatus} from '@/features/employee-entry/EnrollmentGateway';
export const GET=(request:NextRequest)=>temporaryStatus(request);

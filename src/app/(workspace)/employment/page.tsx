import type {Metadata} from 'next';
import Link from 'next/link';
import {portalApi} from '@/features/workspace/server-api';
import {parsePersonalIdentity} from '@/features/employee-work/IdentityContract';
import {EmploymentWorkspace} from '@/features/employee-work/EmploymentWorkspace';
import '../employee-identity-live.css';
export const metadata:Metadata={title:'My employment | VSPH',robots:{index:false,follow:false}};
export default async function EmploymentPage(){
 const data=await portalApi('/api/employee-identity/mine');
 const model=data.kind==='ok'?parsePersonalIdentity(data.value):null;
 if(!model)return <main className="workspace-content identity-live" id="mainContent">
  <h1>My employment</h1><p role="alert">Your current employment or account-link requests could not be verified.</p>
  <Link href="/dashboard">Return to dashboard</Link>
 </main>;
 return <EmploymentWorkspace data={model}/>;
}

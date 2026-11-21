import type {Metadata} from 'next';
import Link from 'next/link';
import {portalApi} from '@/features/workspace/server-api';
import {parseManagerLink} from '@/features/employee-work/IdentityContract';
import {EmployeeIdentityManager} from '@/features/employee-work/EmployeeIdentityManager';
import '../../../employee-identity-live.css';
export const metadata:Metadata={title:'Employee account & access | VSPH',robots:{index:false,follow:false}};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function EmployeeAccountLinkPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!uuid.test(id))return <main className="workspace-content identity-live" id="mainContent">
  <p role="alert">Invalid employee identifier.</p></main>;
 const response=await portalApi('/api/employee-identity/employees/'+id);
 const data=response.kind==='ok'?parseManagerLink(response.value):null;
 if(!data||data.employee.id!==id)return <main className="workspace-content identity-live" id="mainContent">
   <h1>Employee account &amp; access</h1>
   <p role="alert">Current workforce authority or employee identity status could not be verified.</p>
   <Link href="/employees">Return to employees</Link>
 </main>;
 return <EmployeeIdentityManager data={data}/>;
}

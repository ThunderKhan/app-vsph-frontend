import type {Metadata} from 'next';
import Link from 'next/link';
import {portalApi} from '@/features/workspace/server-api';
import {parseCustomerLifecycle} from '@/features/operations/CustomerLifecycleContract';
import {CustomerLifecycleWorkspace} from '@/features/operations/CustomerLifecycleWorkspace';
import '../../../../customers-live.css';
import '../../../../customer-lifecycle.css';
export const metadata:Metadata={title:'Customer lifecycle | VSPH',robots:{index:false,follow:false}};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function CustomerLifecyclePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!uuid.test(id))return <main className="workspace-content customer-live-workspace" id="mainContent">
   <p role="alert">Invalid customer identifier.</p>
 </main>;
 const [detail,impact]=await Promise.all([
   portalApi('/api/admin-management/customers/'+id),
   portalApi('/api/admin-management/customers/'+id+'/impact')
 ]);
 const model=detail.kind==='ok'&&impact.kind==='ok'?
   parseCustomerLifecycle(detail.value,impact.value):null;
 if(!model||model.organization.id.toLowerCase()!==id.toLowerCase())
   return <main className="workspace-content customer-live-workspace" id="mainContent">
     <h1>Customer lifecycle unavailable</h1>
     <p role="alert">Current platform-owner authority, organization version, or lifecycle preview could not be verified.</p>
     <Link href={'/admin/customers/'+id}>Back to customer</Link>
   </main>;
 return <CustomerLifecycleWorkspace model={model}/>;
}

import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {portalApi} from '@/features/workspace/server-api';
import {portalIdentity} from '@/features/workspace/contracts';
import {isProjectId,parseProjectDetail} from '@/features/projects/ProjectDetailContract';
import {parseDeliveryData} from '@/features/projects/EngineeringDeliveryContract';
import {EngineeringDeliveryWorkspace} from '@/features/projects/EngineeringDeliveryWorkspace';
import '../../../engineering-delivery.css';
export const metadata:Metadata={title:'Engineering delivery | VSPH',robots:{index:false,follow:false}};
export default async function EngineeringDeliveryPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!isProjectId(id))notFound();
 const [detail,delivery,identity]=await Promise.all([
   portalApi('/api/projects/'+id),portalApi('/api/projects/'+id+'/delivery'),portalApi('/api/auth/me')
 ]);
 if(detail.kind==='unauthorized'||delivery.kind==='unauthorized'||identity.kind==='unauthorized')redirect('/login');
 const project=detail.kind==='ok'?parseProjectDetail(detail.value,id):null;
 const records=delivery.kind==='ok'?parseDeliveryData(delivery.value):null;
 const actor=identity.kind==='ok'?portalIdentity(identity.value):null;
 if(!project||!records||!actor||project.role==='client')
   return <main className="workspace-content engineering-delivery" id="mainContent">
     <h1>Engineering delivery unavailable</h1>
     <p role="alert">Your current project role or GitHub delivery records could not be verified.</p>
     <Link href="/projects">Back to Projects</Link>
   </main>;
 return <EngineeringDeliveryWorkspace project={project} delivery={records}
   platformOwner={actor.platformRole==='super_admin'}/>;
}

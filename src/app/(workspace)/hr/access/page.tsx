import type {Metadata} from 'next';
import Link from 'next/link';
import {portalApi} from '@/features/workspace/server-api';
import {hrPermissions} from '@/features/workspace/contracts';
import {loadEmployeeRoster} from '@/features/operations/employee-server';
import {HrAccessWorkspace} from '@/features/employee-work/HrAccessWorkspace';
import '../../../(preview)/hrms.css';
import '../../hr-access-live.css';
export const metadata:Metadata={title:'HR access governance | VSPH',
 robots:{index:false,follow:false}};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function HrAccessPage({searchParams}:{searchParams:Promise<{
 search?:string|string[];afterId?:string|string[]}>}){
 const query=await searchParams;
 const search=query.search||'',after=query.afterId||'';
 if(typeof search!=='string'||search.length>80||/[\u0000-\u001f\u007f]/.test(search)||
   typeof after!=='string'||(after&&!uuid.test(after)))
   return <main className="workspace-content hr-page" id="mainContent" tabIndex={-1}><p role="alert">Invalid employee access filters.</p></main>;
 const access=await portalApi('/api/hrms/access');
 const flags=access.kind==='ok'?hrPermissions(access.value):null;
 if(!flags||!flags.governHr)return <main className="workspace-content hr-page" id="mainContent" tabIndex={-1}>
   <h1>HR access governance</h1><p role="alert">Current platform-owner HR governance permission could not be verified.</p>
   <Link href="/dashboard">Return to dashboard</Link>
 </main>;
 const roster=await loadEmployeeRoster({status:'all',search,afterId:after||null});
 if(!roster||roster.role!=='owner')return <main className="workspace-content hr-page" id="mainContent" tabIndex={-1}>
   <p role="alert">Employee access records are unavailable. No previous roster records are displayed.</p>
 </main>;
 return <HrAccessWorkspace employees={roster.employees} hasMore={roster.hasMore}
   nextCursor={roster.nextCursor} search={search} after={after}/>;
}

import type {Metadata} from 'next';
import Link from 'next/link';
import {portalApi} from '@/features/workspace/server-api';
import {parseOwnWork} from '@/features/employee-work/OwnWorkContract';
import {parseNotificationInbox} from '@/features/operations/NotificationLiveContract';
import {MyWorkWorkspace} from '@/features/employee-work/MyWorkWorkspace';
import '../../(preview)/hrms.css';
import '../my-work-live.css';
export const metadata:Metadata={title:'My work | VSPH',robots:{index:false,follow:false}};
export default async function MyWorkPage({searchParams}:{searchParams:Promise<{afterTaskId?:string|string[]}>}){
 const params=await searchParams;
 const cursor=params.afterTaskId;
 if(cursor!==undefined&&(typeof cursor!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cursor)))
   return <main className="workspace-content hr-page" id="mainContent" tabIndex={-1}><p role="alert">Invalid task cursor.</p></main>;
 const result=await portalApi('/api/hrms/me'+(cursor?'?afterTaskId='+cursor:''));
 const model=result.kind==='ok'?parseOwnWork(result.value):null;
 if(!model)return <main className="workspace-content hr-page" id="mainContent" tabIndex={-1}>
   <h1>My work unavailable</h1><p role="alert">Your current employee identity, session, or workforce service could not be verified.</p>
   <Link href="/dashboard">Return to dashboard</Link>
 </main>;
 const notices=await portalApi('/api/notifications');
 const inbox=notices.kind==='ok'?parseNotificationInbox(notices.value):null;
 return <MyWorkWorkspace data={model} notifications={inbox?.notifications||null} hasCursor={Boolean(cursor)}/>;
}

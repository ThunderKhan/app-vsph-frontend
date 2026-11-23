import type {Metadata} from 'next';
import Link from 'next/link';
import {portalApi} from '@/features/workspace/server-api';
import {archivedWorkers} from '@/features/operations/EmployeeLifecycleContract';
import {ArchivedEmployeeList} from '@/features/operations/ArchivedEmployeeList';
import '../../employees-live.css';
import '../../employee-lifecycle.css';
export const metadata:Metadata={title:'Archived employees | VSPH',robots:{index:false,follow:false}};
export default async function ArchivedEmployeesPage(){
 const result=await portalApi('/api/employees/archived');
 const records=result.kind==='ok'?archivedWorkers(result.value):null;
 if(records===null)return <main className="workspace-content employee-live-workspace" id="mainContent" tabIndex={-1}>
  <h1>Archived employees unavailable</h1>
  <p role="alert">Current platform-owner authorization or the archived employee directory could not be verified.</p>
  <Link href="/employees">Return to employee management</Link>
 </main>;
 return <ArchivedEmployeeList records={records}/>;
}

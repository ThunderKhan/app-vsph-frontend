import type {Metadata} from 'next';
import Link from 'next/link';
import {portalApi} from '@/features/workspace/server-api';
import {parseFinanceOptions,parseRecentFinance} from '@/features/operations/FinanceManageContract';
import {FinanceManageWorkspace} from '@/features/operations/FinanceManageWorkspace';
import '../../../finance-live.css';
import '../../../finance-manage.css';
export const metadata:Metadata={title:'Manage finance ledger | VSPH',robots:{index:false,follow:false}};
export default async function FinanceManagePage(){
 const [report,options]=await Promise.all([
   portalApi('/api/finance'),portalApi('/api/finance/options')
 ]);
 const ledger=report.kind==='ok'?parseRecentFinance(report.value):null;
 const selections=options.kind==='ok'?parseFinanceOptions(options.value):null;
 if(!ledger||!selections)return <main className="workspace-content finance-live-workspace" id="mainContent">
   <h1>Finance management unavailable</h1>
   <p role="alert">Current platform owner permission, the ledger or available customer records could not be verified.</p>
   <Link href="/admin/finance">Return to finance overview</Link>
 </main>;
 return <FinanceManageWorkspace {...ledger} {...selections}/>;
}

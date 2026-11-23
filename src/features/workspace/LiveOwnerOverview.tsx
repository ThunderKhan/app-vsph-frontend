import Link from 'next/link';
import type {OwnerOperations} from './OwnerOperationsContract';
import type {FinanceOverview} from '@/features/operations/FinanceOverviewContract';
import {rupeesFromPaise} from '@/features/operations/FinanceOverviewContract';
function Detail({value}:{value:number|null}){
 return <strong>{value===null?'—':new Intl.NumberFormat('en-IN').format(value)}</strong>;
}
function FinancePanel({finance}:{finance:FinanceOverview|null}){
 if(!finance)return <section className="owner-live-panel owner-live-finance">
   <h2>Recorded finance</h2>
   <p role="alert">Finance ledger unavailable. No balances are estimated.</p>
   <Link href="/admin/finance">Open Finance</Link>
 </section>;
 const monthlyMax=finance.monthly.reduce((max,m)=>BigInt(m.collectedPaise)>max?BigInt(m.collectedPaise):max,BigInt(0));
 return <section className="owner-live-panel owner-live-finance">
   <div className="owner-live-panel-top"><h2>Recorded finance</h2><Link href="/admin/finance">Manage finance</Link></div>
   <p className="owner-live-muted">Manual cash receipts only · as of {finance.asOf}</p>
   <dl className="owner-live-facts">
    {([['Cash collected',finance.summary.collectedPaise],
       ['Invoiced',finance.summary.invoicedPaise],
       ['Outstanding',finance.summary.outstandingPaise],
       ['Past due',finance.summary.pastDuePaise]] as const).map(([name,value])=>
       <div key={name}><dt>{name}</dt><dd>{rupeesFromPaise(value)}</dd></div>)}
   </dl>
   <h3>Six-month receipts</h3>
   <ol className="owner-live-months">{finance.monthly.map(m=>{
     const ratio=monthlyMax===BigInt(0)?0:Number(BigInt(m.collectedPaise)*BigInt(10000)/monthlyMax)/100;
     return <li key={m.monthStart}><span>{m.monthStart.slice(0,7)}</span>
       <span className="owner-live-track" aria-hidden="true"><span style={{width:ratio+'%'}}/></span>
       <strong>{rupeesFromPaise(m.collectedPaise)}</strong></li>;
   })}</ol>
   <p className="owner-live-muted">{finance.summary.issuedInvoices} issued invoices ·
     {finance.summary.voidInvoices} void invoices. These are recorded ledger entries, not bank reconciliations.</p>
 </section>;
}
export function LiveOwnerOverview({operations,finance}:{
 operations:OwnerOperations|null;finance:FinanceOverview|null;
}){
 const o=operations;
 const customers=o?.customers.status==='ready'?o.customers:null;
 const delivery=o?.delivery.status==='ready'?o.delivery:null;
 const workforce=o?.workforce.status==='ready'?o.workforce:null;
 const products=o?.products.status==='ready'?o.products:null;
 const attention=o?.attention.status==='ready'?o.attention:null;
 const activity=o?.activity.status==='ready'?o.activity:null;
 const nonCancelled=delivery?delivery.tasks-delivery.cancelled:0;
 return <section className="owner-live-overview" aria-labelledby="ownerOverviewTitle">
   <header className="owner-live-header"><div>
     <p className="owner-live-kicker">YOUR BUSINESS, AT A GLANCE</p>
     <h1 id="ownerOverviewTitle">Company overview</h1>
     <p>Recorded internal operations · each section is independently permission-checked.</p>
   </div><Link href="/dashboard">Refresh overview</Link></header>
   {!o&&<p role="alert">Operating records unavailable. No synthetic metrics are displayed.</p>}
   <div className="owner-live-grid">
     <section className="owner-live-panel owner-live-hero">
       <h2>Operating snapshot</h2>
       <dl className="owner-live-facts">
        <div><dt>Active customers</dt><dd><Detail value={customers?.active??null}/></dd></div>
        <div><dt>Active projects</dt><dd><Detail value={delivery?.active??null}/></dd></div>
        <div><dt>Active employees</dt><dd><Detail value={workforce?.active??null}/></dd></div>
        <div><dt>Active products</dt><dd><Detail value={products?.active??null}/></dd></div>
       </dl>
       <p className="owner-live-muted">{o?'Observed '+new Date(o.observedAt).toLocaleString('en-IN'):
         'Current operating snapshot unavailable'}</p>
     </section>
     <FinancePanel finance={finance}/>
     <section className="owner-live-panel">
       <div className="owner-live-panel-top"><h2>Project delivery</h2><Link href="/projects">Open projects</Link></div>
       {delivery?<><p>{delivery.done} of {nonCancelled} noncancelled tasks completed ·
          {delivery.blocked} blocked · {delivery.completed} completed projects</p>
         <progress value={nonCancelled?delivery.done:0} max={nonCancelled||1}
           aria-label="Recorded task completion"/>
         <ul>{delivery.recent.map(x=><li key={x.id}>
           <Link href={'/projects/'+x.id}>{x.name}</Link><small> · {x.kind}</small>
         </li>)}</ul>
         {!delivery.recent.length&&<p>No recent active projects.</p>}</>:
         <p role="status">Delivery records unavailable.</p>}
     </section>
     <section className="owner-live-panel">
       <div className="owner-live-panel-top"><h2>Customers</h2><Link href="/admin/customers">Customer directory</Link></div>
       {customers?<dl className="owner-live-facts">
         <div><dt>Total</dt><dd><Detail value={customers.total}/></dd></div>
         <div><dt>Active</dt><dd><Detail value={customers.active}/></dd></div>
         <div><dt>Suspended</dt><dd><Detail value={customers.suspended}/></dd></div>
       </dl>:<p>Customer counts unavailable.</p>}
     </section>
     <section className="owner-live-panel">
       <div className="owner-live-panel-top"><h2>Workforce</h2><Link href="/employees">Employee directory</Link></div>
       {workforce?<dl className="owner-live-facts">
          <div><dt>Roster</dt><dd><Detail value={workforce.total}/></dd></div>
          <div><dt>Active</dt><dd><Detail value={workforce.active}/></dd></div>
          <div><dt>Onboarding</dt><dd><Detail value={workforce.onboarding}/></dd></div>
       </dl>:<p>Workforce counts unavailable.</p>}
     </section>
     <section className="owner-live-panel">
       <div className="owner-live-panel-top"><h2>Product registry</h2><Link href="/admin/products">Product catalog</Link></div>
       {products?<><p>{products.active} active products of {products.total} registered</p>
          <ul>{products.catalog.map(p=><li key={p.id}>{p.name} · {p.code}</li>)}</ul></>:
          <p>Product registry unavailable.</p>}
     </section>
     <section className="owner-live-panel">
       <h2>Needs attention</h2>
       {attention?<><p><strong>{attention.overdueTasks}</strong> overdue open tasks ·
          <strong>{attention.overdueMilestones}</strong> overdue milestones</p>
          <ul>{attention.upcoming.map(m=><li key={m.id}>
            <Link href={'/projects/'+m.projectId}>{m.title}</Link> · Due {m.dueOn}
          </li>)}</ul></>:<p>Due-date records unavailable.</p>}
     </section>
     <section className="owner-live-panel">
       <h2>Recent project activity</h2>
       {activity?<ol>{activity.items.map((x,i)=><li key={i}>
         <Link href={'/projects/'+x.projectId}>{x.action}</Link> ·
         {new Date(x.createdAt).toLocaleString('en-IN')}</li>)}</ol>:
         <p>Recent activity unavailable.</p>}
     </section>
   </div>
 </section>;
}

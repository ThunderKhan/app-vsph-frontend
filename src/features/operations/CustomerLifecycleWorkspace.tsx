'use client';
import Link from 'next/link';
import {useState,type FormEvent} from 'react';
import type {CustomerLifecycleData,CustomerEntitlement,LifecycleStatus} from './CustomerLifecycleContract';
import {entitlementDateInput,entitlementDateValue} from './CustomerEntitlementDates';
type Terms={planCode:string;subscriptionStatus:string;accessStatus:string;startsAt:string;endsAt:string};
const fromProduct=(product:CustomerEntitlement):Terms=>({
 planCode:product.planCode||'standard',subscriptionStatus:product.subscriptionStatus||'active',
 accessStatus:product.accessStatus,startsAt:entitlementDateInput(product.startsAt),
 endsAt:entitlementDateInput(product.endsAt)
});
export function CustomerLifecycleWorkspace({model}:{model:CustomerLifecycleData}){
 const {organization,products,impact}=model;
 const [status,setStatus]=useState<LifecycleStatus>(organization.status);
 const [reviewStatus,setReviewStatus]=useState(false);
 const [productId,setProductId]=useState(products[0]?.id||'');
 const chosen=products.find(p=>p.id===productId);
 const [terms,setTerms]=useState<Terms>(products.length?fromProduct(products[0]):{
  planCode:'standard',subscriptionStatus:'active',accessStatus:'enabled',startsAt:'',endsAt:''});
 const [reviewTerms,setReviewTerms]=useState(false),[busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const changeTerms=(key:keyof Terms,value:string)=>{setTerms(v=>({...v,[key]:value}));setReviewTerms(false);};
 async function submit(action:Record<string,unknown>){
   if(busy)return;
   setBusy(true);setMessage('Submitting reviewed organization change…');
   try{
     const response=await fetch('/api/customer-lifecycle-action',{method:'POST',
       credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({organizationId:organization.id,version:organization.version,
         confirmed:true,...action})});
     if(response.status===401){window.location.assign('/login');return;}
     const raw:unknown=await response.json().catch(()=>null);
     if(!response.ok||!raw||typeof raw!=='object'||!('ok' in raw)||raw.ok!==true)
       throw Error(raw&&typeof raw==='object'&&'message' in raw&&typeof raw.message==='string'?
         raw.message:'Organization change unconfirmed. Reload before retrying.');
     window.location.reload();
   }catch(error){setMessage(error instanceof Error?error.message:'Lifecycle change unconfirmed.');}
   finally{setBusy(false);}
 }
 function submitStatus(e:FormEvent<HTMLFormElement>){
   e.preventDefault();if(status===organization.status||organization.status==='closed')return;
   if(!reviewStatus){setReviewStatus(true);return;}
   void submit({action:'status',status});
 }
 function submitTerms(e:FormEvent<HTMLFormElement>){
   e.preventDefault();if(!chosen||organization.status==='closed')return;
   const start=entitlementDateValue(terms.startsAt,chosen.startsAt);
   const end=entitlementDateValue(terms.endsAt,chosen.endsAt);
   if(!start.valid||!end.valid||
     (start.value&&end.value&&Date.parse(end.value)<=Date.parse(start.value))){
      setMessage('Review entitlement dates; the end must follow the start.');return;
   }
   if(terms.subscriptionStatus==='trial'&&(!end.value||Date.parse(end.value)<=Date.now())){
      setMessage('A trial requires a future ending date.');return;
   }
   if(!reviewTerms){setReviewTerms(true);return;}
   void submit({action:'entitlement',applicationId:chosen.id,
     planCode:terms.planCode,subscriptionStatus:terms.subscriptionStatus,
     accessStatus:terms.accessStatus,startsAt:start.value,endsAt:end.value});
 }
 const currentStatus=organization.status;
 return <main className="workspace-content customer-live-workspace customer-lifecycle" id="mainContent" tabIndex={-1}>
   <nav className="customer-live-breadcrumb"><Link href="/admin/customers">Customers</Link>
     <span>/</span><Link href={'/admin/customers/'+organization.id}>{organization.name}</Link>
     <span>/ Lifecycle</span></nav>
   <header className="customer-live-heading"><div><h1>Customer lifecycle</h1>
     <p>{organization.name} · {currentStatus} · Owner-only · version {organization.version}</p>
   </div><Link href={'/admin/customers/'+organization.id+'/lifecycle'}>Refresh</Link></header>
   {message&&<p role="alert">{message}</p>}
   <section className="customer-live-panel">
     <h2>Current impact preview</h2><p>Live backend count before any change.</p>
     <dl className="customer-lifecycle-stats">
       <div><dt>Active members</dt><dd>{impact.activeMembers}</dd></div>
       <div><dt>Current product sessions</dt><dd>{impact.productSessions}</dd></div>
       <div><dt>Pending invitations</dt><dd>{impact.pendingInvitations}</dd></div>
     </dl>
     <p>Suspension or closure revokes customer product sessions, Music launch codes,
       and pending invitations. Reactivation does not restore revoked sessions,
       invitation capabilities or project memberships. Closure is terminal.</p>
   </section>
   <section className="customer-live-panel">
     <h2>Organization status</h2>
     <form onSubmit={submitStatus}>
       <label>Status<select value={status} disabled={busy||currentStatus==='closed'}
         onChange={e=>{setStatus(e.target.value as LifecycleStatus);setReviewStatus(false);setMessage('');}}>
         {(['active','suspended','closed'] as const).map(x=>
           <option key={x} value={x}>{x}</option>)}
       </select></label>
       {reviewStatus&&<p role="status">Review: change {organization.name} from {currentStatus} to
         <strong> {status}</strong>. This revokes sessions/invitations when suspending or closing.
         Closed organizations cannot be reactivated by this workflow.</p>}
       <button type="submit" disabled={busy||status===currentStatus||currentStatus==='closed'}>
         {busy?'Saving…':reviewStatus?'Confirm lifecycle change':'Review lifecycle change'}</button>
     </form>
   </section>
   <section className="customer-live-panel">
     <h2>Product grant and subscription terms</h2>
     <p>Apply the product grant and subscription terms in one audited transaction.
       Existing product sessions are revoked. This is not invoice or payment processing.
       The chooser includes only products currently linked to this organization.</p>
     {!products.length?<p>No linked products are available for entitlement changes.</p>:
     <form onSubmit={submitTerms} onChange={()=>setReviewTerms(false)}>
       <label>Linked product<select value={productId} disabled={busy}
         onChange={e=>{const id=e.target.value;setProductId(id);
           const product=products.find(p=>p.id===id);
           if(product)setTerms(fromProduct(product));setReviewTerms(false);}}>
         {products.map(p=><option key={p.id} value={p.id}>{p.name} · {p.code}</option>)}
       </select></label>
       {chosen&&<p>Current grant: {chosen.accessStatus}. Subscription: {chosen.subscriptionStatus||'none'}.
         Existing start: {chosen.startsAt||'none'}, end: {chosen.endsAt||'none'}.</p>}
       <div className="customer-lifecycle-grid">
         <label>Plan code<input required maxLength={60} pattern="[a-z0-9][a-z0-9_-]{0,59}"
           value={terms.planCode} disabled={busy} onChange={e=>changeTerms('planCode',e.target.value)}/></label>
         <label>Subscription status<select value={terms.subscriptionStatus} disabled={busy}
           onChange={e=>changeTerms('subscriptionStatus',e.target.value)}>
           {['trial','active','past_due','cancelled','expired'].map(x=><option key={x}>{x}</option>)}
         </select></label>
         <label>Grant status<select value={terms.accessStatus} disabled={busy}
           onChange={e=>changeTerms('accessStatus',e.target.value)}>
           {['enabled','suspended','revoked'].map(x=><option key={x}>{x}</option>)}
         </select></label>
         <label>Start date/time (blank: no start date)<input type="datetime-local" value={terms.startsAt}
           disabled={busy} onChange={e=>changeTerms('startsAt',e.target.value)}/></label>
         <label>End date/time (blank: no end)<input type="datetime-local" value={terms.endsAt}
           disabled={busy} onChange={e=>changeTerms('endsAt',e.target.value)}/></label>
       </div>
       {reviewTerms&&<p role="status">Review combined product change for {chosen?.name}: 
         {terms.planCode}, subscription {terms.subscriptionStatus}, grant {terms.accessStatus}.
         Current product sessions will be revoked.</p>}
       <button type="submit" disabled={busy||currentStatus==='closed'}>
         {busy?'Saving…':reviewTerms?'Confirm entitlement transaction':'Review entitlement change'}</button>
     </form>}
   </section>
 </main>;
}

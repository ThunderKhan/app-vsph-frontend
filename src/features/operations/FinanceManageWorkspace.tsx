'use client';
import Link from 'next/link';
import {useRef,useState,type FormEvent} from 'react';
import {rupeesFromPaise} from './FinanceOverviewContract';
import type {FinanceOption,FinanceProject,InvoiceRow,ReceiptRow} from './FinanceManageContract';
const today=()=>new Date().toISOString().slice(0,10);
function amountToPaise(value:string):number|null{
 if(!/^[0-9]{1,10}(?:\.[0-9]{1,2})?$/.test(value))return null;
 const [whole,dec='']=value.split('.');
 const paise=BigInt(whole)*100n+BigInt(dec.padEnd(2,'0'));
 return paise>0n&&paise<=1000000000000n?Number(paise):null;
}
type Intent='invoice'|'receipt';
type Correction={action:'void'|'reverse';id:string;reference:string;version?:number};
type Pending={signature:string;key:string};
export function FinanceManageWorkspace({organizations,projects,invoices,receipts}:{
 organizations:FinanceOption[];projects:FinanceProject[];
 invoices:InvoiceRow[];receipts:ReceiptRow[];
}){
 const [invoice,setInvoice]=useState({reference:'',organizationId:'',projectId:'',amount:'',issuedOn:today(),dueOn:today()});
 const [receipt,setReceipt]=useState({invoiceId:'',reference:'',amount:'',receivedOn:today()});
 const [invoiceReview,setInvoiceReview]=useState(false),[receiptReview,setReceiptReview]=useState(false);
 const [correction,setCorrection]=useState<Correction|null>(null);
 const [reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const pending=useRef<Record<Intent,Pending|null>>({invoice:null,receipt:null});
 const resetInvoice=()=>{setInvoiceReview(false);pending.current.invoice=null;};
 const resetReceipt=()=>{setReceiptReview(false);pending.current.receipt=null;};
 const outstanding=invoices.filter(i=>i.status==='issued'&&BigInt(i.amountPaise)>BigInt(i.collectedPaise));
 const selectedInvoice=outstanding.find(i=>i.id===receipt.invoiceId);
 const changeInvoice=(key:keyof typeof invoice,value:string)=>{
   resetInvoice();setInvoice(s=>({...s,[key]:value,...(key==='organizationId'?{projectId:''}:{})}));
 };
 const changeReceipt=(key:keyof typeof receipt,value:string)=>{resetReceipt();setReceipt(s=>({...s,[key]:value}));};
 async function mutate(action:Record<string,unknown>,intent?:Intent){
  if(busy)return;
  setBusy(true);setMessage('Submitting finance operation…');
  try{
   const payload={...action};
   if(intent){
    const signature=JSON.stringify(action);
    if(pending.current[intent]?.signature!==signature)
      pending.current[intent]={signature,key:crypto.randomUUID()};
    payload.key=pending.current[intent]!.key;
   }
   const response=await fetch('/api/finance-command',{method:'POST',
      credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)});
   if(response.status===401){window.location.assign('/login');return;}
   const raw:unknown=await response.json().catch(()=>null);
   if(!response.ok||!raw||typeof raw!=='object'||!('ok' in raw)||raw.ok!==true){
     const error=raw&&typeof raw==='object'&&'message' in raw&&typeof raw.message==='string'?
       raw.message:'Finance change was not confirmed. Reconcile the ledger before retrying.';
     throw Error(error);
   }
   if(intent)pending.current[intent]=null;
   window.location.reload();
  }catch(e){
   setMessage(e instanceof Error?e.message:'Finance operation not confirmed. Review ledger before retrying.');
  }finally{setBusy(false);}
 }
 function submitInvoice(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  const amountPaise=amountToPaise(invoice.amount);
  if(amountPaise===null||!invoice.organizationId||invoice.dueOn<invoice.issuedOn){
    setMessage('Enter valid invoice details and a positive INR amount.');return;
  }
  if(!invoiceReview){setInvoiceReview(true);setMessage('Review the invoice before creating it.');return;}
  void mutate({action:'invoice',reference:invoice.reference.trim(),
    organizationId:invoice.organizationId,projectId:invoice.projectId||null,
    amountPaise,issuedOn:invoice.issuedOn,dueOn:invoice.dueOn},'invoice');
 }
 function submitReceipt(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  const amountPaise=amountToPaise(receipt.amount);
  if(!selectedInvoice||amountPaise===null||BigInt(amountPaise)>
    BigInt(selectedInvoice.amountPaise)-BigInt(selectedInvoice.collectedPaise)){
    setMessage('Select an outstanding invoice and enter an amount no greater than its remaining balance.');return;
  }
  if(!receiptReview){setReceiptReview(true);setMessage('Review the cash receipt before recording it.');return;}
  void mutate({action:'receipt',invoiceId:receipt.invoiceId,reference:receipt.reference.trim(),
    amountPaise,receivedOn:receipt.receivedOn},'receipt');
 }
 function openCorrection(action:Correction){
   setCorrection(action);setReason('');setConfirmed(false);setMessage('');
 }
 function saveCorrection(){
   if(!correction||!confirmed||reason.trim().length<8||reason.trim().length>300)return;
   void mutate({action:correction.action,id:correction.id,reason:reason.trim(),confirmed:true,
     ...(correction.action==='void'?{version:correction.version}:{})});
 }
 return <main className="workspace-content finance-live-workspace finance-manage" id="mainContent" tabIndex={-1}>
   <nav className="finance-live-breadcrumb" aria-label="Breadcrumb">
      <Link href="/admin/finance">Finance</Link> / Manage ledger
   </nav>
   <header className="finance-live-heading"><div><h1>Manage finance ledger</h1>
      <p>Platform owner · Manually recorded invoices and cash receipts</p>
    </div><div className="finance-live-actions">
      <Link href="/admin/finance/journal">Full journal</Link>
      <Link href="/admin/finance/manage">Refresh</Link>
    </div></header>
   <p>Financial entries are recorded business events, not bank-verified settlements. The
     backend enforces current permissions, invoice balances, and audited corrections.</p>
   {message&&<p role="alert" className="finance-manage-message">{message}</p>}
   <div className="finance-manage-grid">
     <section className="finance-live-panel">
       <h2>Create invoice</h2>
       <form onSubmit={submitInvoice} onChange={resetInvoice}>
         <label>Invoice reference<input required minLength={3} maxLength={80} value={invoice.reference}
           onChange={e=>changeInvoice('reference',e.target.value)} placeholder="INV-2026-001"/></label>
         <label>Customer organization<select required value={invoice.organizationId}
           onChange={e=>changeInvoice('organizationId',e.target.value)}>
           <option value="">Select customer</option>
           {organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
         </select></label>
         <label>Customer project (optional)<select value={invoice.projectId}
           onChange={e=>changeInvoice('projectId',e.target.value)}>
           <option value="">No linked project</option>
           {projects.filter(p=>p.organizationId===invoice.organizationId)
             .map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
         </select></label>
         <label>Amount (INR)<input required inputMode="decimal" pattern="[0-9]{1,10}(\.[0-9]{1,2})?"
            value={invoice.amount} onChange={e=>changeInvoice('amount',e.target.value)}
            placeholder="1250.00"/></label>
         <div className="finance-manage-grid">
           <label>Issue date<input type="date" required value={invoice.issuedOn}
             onChange={e=>changeInvoice('issuedOn',e.target.value)}/></label>
           <label>Due date<input type="date" required min={invoice.issuedOn} value={invoice.dueOn}
             onChange={e=>changeInvoice('dueOn',e.target.value)}/></label>
         </div>
         {invoiceReview&&<p role="status">Confirm invoice {invoice.reference} for {invoice.amount} INR.
           This records an invoice, not a payment.</p>}
         <button type="submit" disabled={busy||!organizations.length}>
           {busy?'Saving…':invoiceReview?'Confirm invoice creation':'Review invoice'}</button>
       </form>
     </section>
     <section className="finance-live-panel">
       <h2>Record cash receipt</h2>
       <p>Choose from the latest 50 invoices with an outstanding balance.</p>
       <form onSubmit={submitReceipt} onChange={resetReceipt}>
         <label>Invoice<select required value={receipt.invoiceId}
             onChange={e=>changeReceipt('invoiceId',e.target.value)}>
           <option value="">Select outstanding invoice</option>
           {outstanding.map(i=><option key={i.id} value={i.id}>
             {i.reference} · {rupeesFromPaise((BigInt(i.amountPaise)-BigInt(i.collectedPaise)).toString())} due
           </option>)}
         </select></label>
         <label>Receipt reference<input required minLength={3} maxLength={100} value={receipt.reference}
           onChange={e=>changeReceipt('reference',e.target.value)} placeholder="RCPT-2026-001"/></label>
         <label>Cash received (INR)<input required inputMode="decimal"
           pattern="[0-9]{1,10}(\.[0-9]{1,2})?" value={receipt.amount}
           onChange={e=>changeReceipt('amount',e.target.value)}/></label>
         <label>Received on<input type="date" required max={today()} value={receipt.receivedOn}
           onChange={e=>changeReceipt('receivedOn',e.target.value)}/></label>
         {receiptReview&&<p role="status">Confirm receipt {receipt.reference} for {receipt.amount} INR.
           Recording a receipt does not verify bank settlement.</p>}
         <button type="submit" disabled={busy||!outstanding.length}>
           {busy?'Saving…':receiptReview?'Confirm cash receipt':'Review receipt'}</button>
       </form>
     </section>
   </div>
   <section className="finance-live-panel">
     <h2>Recent invoices and corrections</h2>
     <p>Latest 50 invoices only. The journal contains broader historical records.
       Invoices with active receipts cannot be voided.</p>
     {!invoices.length&&<p>No invoices recorded.</p>}
     <div className="finance-manage-table" role="region" tabIndex={0}
       aria-label="Recent invoices, horizontally scrollable">
       <table><thead><tr>{['Reference','Customer / project','Invoiced','Collected','Status','Action']
          .map(x=><th key={x} scope="col">{x}</th>)}</tr></thead>
         <tbody>{invoices.map(i=><tr key={i.id}>
           <td><strong>{i.reference}</strong><small>Due {i.dueOn}</small></td>
           <td>{i.organizationName}<small>{i.projectName||'No linked project'}</small></td>
           <td>{rupeesFromPaise(i.amountPaise)}</td><td>{rupeesFromPaise(i.collectedPaise)}</td>
           <td>{i.status}</td><td>{i.status==='issued'&&BigInt(i.collectedPaise)===0n?
             <button type="button" disabled={busy} onClick={()=>openCorrection({action:'void',
               id:i.id,reference:i.reference,version:i.version})}>Void</button>:'—'}</td>
         </tr>)}</tbody>
       </table>
     </div>
   </section>
   <section className="finance-live-panel">
     <h2>Recent receipts and reversals</h2><p>Latest 50 recorded receipts only.</p>
     {!receipts.length&&<p>No receipts recorded.</p>}
     <div className="finance-manage-table" role="region" tabIndex={0}
       aria-label="Recent receipts, horizontally scrollable">
       <table><thead><tr>{['Receipt','Invoice','Amount','Received on','Status','Action']
         .map(x=><th scope="col" key={x}>{x}</th>)}</tr></thead>
         <tbody>{receipts.map(p=><tr key={p.id}>
           <td>{p.reference}</td><td>{p.invoiceReference}</td>
           <td>{rupeesFromPaise(p.amountPaise)}</td><td>{p.receivedOn}</td>
           <td>{p.reversed?'Reversed':'Recorded'}</td><td>{p.reversed?'—':
             <button type="button" disabled={busy} onClick={()=>openCorrection({
               action:'reverse',id:p.id,reference:p.reference})}>Reverse</button>}</td>
         </tr>)}</tbody>
       </table>
     </div>
   </section>
   {correction&&<section className="finance-live-panel finance-manage-correction" aria-label="Correction review">
     <h2>{correction.action==='void'?'Void invoice':'Reverse receipt'} · {correction.reference}</h2>
     <p>This correction changes the ledger and is audited. It cannot be undone by
       editing or deleting its historical record.</p>
     <label>Correction reason (8–300 characters)<textarea rows={3} minLength={8} maxLength={300}
        disabled={busy} value={reason} onChange={e=>{setReason(e.target.value);setConfirmed(false);}}/></label>
     <label className="finance-manage-confirm">
       <input type="checkbox" checked={confirmed} disabled={busy}
         onChange={e=>setConfirmed(e.target.checked)}/>
       I reviewed the original entry and confirm this correction.
     </label>
     <div className="finance-live-actions">
       <button type="button" disabled={busy} onClick={()=>setCorrection(null)}>Cancel</button>
       <button type="button" disabled={busy||!confirmed||reason.trim().length<8}
         onClick={saveCorrection}>{busy?'Saving…':'Confirm correction'}</button>
     </div>
   </section>}
 </main>;
}

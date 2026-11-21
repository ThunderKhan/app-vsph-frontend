/** Owner-only finance entry and correction contracts. No card, bank or payroll integration. */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const record=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const positive=(x:unknown):x is number=>Number.isSafeInteger(x)&&(x as number)>0&&(x as number)<=1000000000000;
const day=(x:unknown):x is string=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 !Number.isNaN(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
const id=(x:unknown):x is string=>typeof x==='string'&&uuid.test(x);
const nonEmpty=(x:unknown,n:number):x is string=>typeof x==='string'&&!!x.trim()&&x.length<=n;
const exact=(obj:Record<string,unknown>,keys:string[])=>Object.keys(obj).length===keys.length&&keys.every(k=>Object.hasOwn(obj,k));
const amount=(x:unknown):string|null=>typeof x==='string'&&/^(0|[1-9]\d{0,12})$/.test(x)?x:
  typeof x==='number'&&Number.isSafeInteger(x)&&x>=0&&x<=1000000000000?String(x):null;
export type FinanceOption={id:string;name:string};
export type FinanceProject=FinanceOption&{organizationId:string};
export type InvoiceRow={id:string;reference:string;organizationName:string;projectName:string|null;
 amountPaise:string;collectedPaise:string;status:'issued'|'void';version:number;issuedOn:string;dueOn:string};
export type ReceiptRow={id:string;invoiceId:string;invoiceReference:string;reference:string;
 amountPaise:string;receivedOn:string;reversed:boolean};
export function parseFinanceOptions(raw:unknown):{organizations:FinanceOption[];projects:FinanceProject[]}|null{
 if(!record(raw)||!Array.isArray(raw.organizations)||raw.organizations.length>250||
   !Array.isArray(raw.projects)||raw.projects.length>250)return null;
 const organizations:FinanceOption[]=[],projects:FinanceProject[]=[];
 const seenOrg=new Set<string>(),seenProject=new Set<string>();
 for(const o of raw.organizations){
   if(!record(o)||!id(o.id)||!nonEmpty(o.name,150)||seenOrg.has(o.id))return null;
   seenOrg.add(o.id);organizations.push({id:o.id,name:o.name});
 }
 for(const p of raw.projects){
   if(!record(p)||!id(p.id)||!nonEmpty(p.name,150)||!id(p.customer_organization_id)||
     seenProject.has(p.id))return null;
   seenProject.add(p.id);projects.push({id:p.id,name:p.name,organizationId:p.customer_organization_id});
 }
 return {organizations,projects};
}
export function parseRecentFinance(raw:unknown):{invoices:InvoiceRow[];receipts:ReceiptRow[]}|null{
 if(!record(raw)||!Array.isArray(raw.invoices)||raw.invoices.length>50||
   !Array.isArray(raw.payments)||raw.payments.length>50)return null;
 const invoices:InvoiceRow[]=[],receipts:ReceiptRow[]=[];
 const seenInvoices=new Set<string>(),seenPayments=new Set<string>();
 for(const x of raw.invoices){
  if(!record(x)||!id(x.id)||seenInvoices.has(x.id)||!nonEmpty(x.reference,80)||
     !nonEmpty(x.organization_name,150)||
     !(x.project_name===null||nonEmpty(x.project_name,150))||
     amount(x.amount_paise)===null||amount(x.collected_paise)===null||
     !['issued','void'].includes(String(x.status))||
     !Number.isSafeInteger(x.version)||(x.version as number)<1||
     !day(x.issued_on)||!day(x.due_on))return null;
  seenInvoices.add(x.id);
  invoices.push({id:x.id,reference:x.reference,organizationName:x.organization_name,
    projectName:x.project_name as string|null,amountPaise:amount(x.amount_paise)!,
    collectedPaise:amount(x.collected_paise)!,status:x.status as InvoiceRow['status'],
    version:x.version as number,issuedOn:x.issued_on,dueOn:x.due_on});
 }
 for(const x of raw.payments){
  if(!record(x)||!id(x.id)||seenPayments.has(x.id)||!id(x.invoice_id)||
     !nonEmpty(x.invoice_reference,80)||!nonEmpty(x.payment_reference,100)||
     amount(x.amount_paise)===null||!day(x.received_on)||typeof x.reversed!=='boolean')return null;
  seenPayments.add(x.id);
  receipts.push({id:x.id,invoiceId:x.invoice_id,invoiceReference:x.invoice_reference,
    reference:x.payment_reference,amountPaise:amount(x.amount_paise)!,receivedOn:x.received_on,
    reversed:x.reversed});
 }
 return {invoices,receipts};
}
export type FinanceWrite={
 path:string;body:Record<string,unknown>;idempotencyKey:string|null;
 action:'invoice'|'receipt'|'void'|'reverse';
};
export function validateFinanceWrite(value:unknown):FinanceWrite|null{
 if(!record(value)||typeof value.action!=='string')return null;
 if(value.action==='invoice'){
  if(!exact(value,['action','key','reference','organizationId','projectId','amountPaise','issuedOn','dueOn'])||
    !id(value.key)||typeof value.reference!=='string'||
    !/^[A-Za-z0-9][A-Za-z0-9/_-]{2,79}$/.test(value.reference)||
    !id(value.organizationId)||!(value.projectId===null||id(value.projectId))||
    !positive(value.amountPaise)||!day(value.issuedOn)||!day(value.dueOn)||
    value.dueOn<value.issuedOn)return null;
  return {path:'/api/finance/invoices',idempotencyKey:value.key,action:'invoice',
    body:{reference:value.reference,organizationId:value.organizationId,projectId:value.projectId,
      amountPaise:value.amountPaise,issuedOn:value.issuedOn,dueOn:value.dueOn}};
 }
 if(value.action==='receipt'){
  if(!exact(value,['action','invoiceId','key','reference','amountPaise','receivedOn'])||
     !id(value.invoiceId)||!id(value.key)||typeof value.reference!=='string'||
     !/^[A-Za-z0-9][A-Za-z0-9/_-]{2,99}$/.test(value.reference)||
     !positive(value.amountPaise)||!day(value.receivedOn)||
     value.receivedOn>new Date().toISOString().slice(0,10))return null;
  return {path:'/api/finance/invoices/'+value.invoiceId+'/payments',action:'receipt',
   idempotencyKey:null,body:{idempotencyKey:value.key,reference:value.reference,
     amountPaise:value.amountPaise,receivedOn:value.receivedOn}};
 }
 if(value.action==='void'){
  if(!exact(value,['action','id','version','reason','confirmed'])||
    !id(value.id)||!Number.isSafeInteger(value.version)||(value.version as number)<1||
    (value.version as number)>999999999||value.confirmed!==true||
    typeof value.reason!=='string'||value.reason.trim().length<8||
    value.reason.trim().length>300||/[\u0000-\u001f\u007f]/.test(value.reason))return null;
  return {path:'/api/finance/invoices/'+value.id+'/void',action:'void',idempotencyKey:null,
    body:{version:value.version,reason:value.reason.trim(),confirmed:true}};
 }
 if(value.action==='reverse'){
  if(!exact(value,['action','id','reason','confirmed'])||!id(value.id)||
    value.confirmed!==true||typeof value.reason!=='string'||value.reason.trim().length<8||
    value.reason.trim().length>300||/[\u0000-\u001f\u007f]/.test(value.reason))return null;
  return {path:'/api/finance/payments/'+value.id+'/reverse',action:'reverse',idempotencyKey:null,
    body:{reason:value.reason.trim(),confirmed:true}};
 }
 return null;
}
export function financeWriteConfirmed(raw:unknown,action:FinanceWrite['action']):boolean{
 if(!record(raw)||!id(raw.id))return false;
 if(action==='invoice')return Number.isSafeInteger(raw.version)&&(raw.version as number)>0&&typeof raw.replayed==='boolean';
 if(action==='receipt')return id(raw.invoiceId)&&typeof raw.replayed==='boolean';
 if(action==='void')return raw.status==='void'&&Number.isSafeInteger(raw.version)&&(raw.version as number)>0;
 return raw.reversed===true;
}

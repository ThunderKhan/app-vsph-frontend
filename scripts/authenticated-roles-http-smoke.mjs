/**
 * Production Next.js authenticated read smoke with isolated role-aware backend.
 * Exercises actual SSR after a syntactically valid cookie; no real users or DB.
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as sleep} from 'node:timers/promises';
const port=47057,origin='http://127.0.0.1:'+port;
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ownerSid='o'.repeat(48),employeeSid='e'.repeat(48),unknownSid='u'.repeat(48);
const calls=[];
const respond=(res,status,body)=>{
 res.writeHead(status,{'Cache-Control':'no-store','Content-Type':'application/json'});
 res.end(JSON.stringify(body));
};
const backend=http.createServer((req,res)=>{
 const sid=req.headers.cookie?.replace(/^vsph\.portal\.sid=/,'');
 const role=sid===ownerSid?'owner':sid===employeeSid?'employee':null;
 calls.push({url:req.url,role});
 if(!role)return respond(res,401,{message:'Invalid session'});
 if(req.method!=='GET')return respond(res,405,{message:'Read-only smoke'});
 if(req.url==='/api/auth/me')
   return respond(res,200,{user:{id,name:role==='owner'?'Owner Example':'Worker Example',
      email:role+'@example.invalid',platformRole:role==='owner'?'super_admin':null}});
 if(req.url==='/api/hrms/access')
   return respond(res,200,{employee:role==='employee',management:false,
      governHr:false,pendingLink:false});
 if(req.url==='/api/admin-management/dashboard'){
   if(role!=='owner')return respond(res,403,{message:'Owner only'});
   return respond(res,200,{
     observedAt:'2026-11-21T06:00:00Z',
     customers:{status:'ready',total:3,active:2,suspended:1},
     delivery:{status:'unavailable'},
     workforce:{status:'unavailable'},
     products:{status:'unavailable'},
     attention:{status:'unavailable'},
     activity:{status:'unavailable'},
   });
 }
 if(req.url==='/api/finance/overview'){
   if(role!=='owner')return respond(res,403,{message:'Owner only'});
   return respond(res,200,{
    summary:{invoicedPaise:40000,collectedPaise:10000,
      outstandingPaise:30000,pastDuePaise:1000,
      issuedInvoices:2,voidInvoices:0,clients:1,projects:0},
    monthly:[{month_start:'2026-11-01',collected_paise:10000}],
    asOf:'2026-11-21',currency:'INR',basis:'manual_cash_receipts',
   });
 }
 if(req.url==='/api/hrms/me'){
   if(role!=='employee')return respond(res,403,{message:'Employee only'});
   return respond(res,200,{employee:{name:'Worker Example',jobTitle:'Engineer',
      department:'Engineering',status:'active'},
     workDate:'2026-11-21',tasks:[{
       id,title:'Review release plan',project_name:'Internal Project',
       project_status:'active',project_version:3,status:'in_progress',
       priority:'normal',due_on:'2026-11-25',
     }],leave:[],attendance:[]});
 }
 if(req.url==='/api/hrms/me/activity'){
   if(role!=='employee')return respond(res,403,{message:'Employee only'});
   return respond(res,200,{windowStart:'2025-11-22',windowEnd:'2026-11-21',
      timeZone:'Asia/Kolkata',source:'employee.task_status',total:2,
      days:[{date:'2026-11-20',count:2}],
      projects:[{name:'Internal Project',count:2}]});
 }
 if(req.url==='/api/employees/archived'){
   if(role!=='owner')return respond(res,403,{message:'Owner only'});
   return respond(res,200,{employees:[{
     id,full_name:'Confidential Former Employee',email:'former@example.invalid',
     department:'Engineering',job_title:'Developer',version:2,
     removed_at:'2026-11-19T00:00:00Z',
     removal_reason:'Offboarded per verified request',
   }]});
 }
 return respond(res,404,{message:'Not in isolated role fixture'});
});
await new Promise((resolve,reject)=>{
 backend.once('error',reject);backend.listen(0,'127.0.0.1',resolve);
});
const addr=backend.address();
assert.ok(addr&&typeof addr!=='string');
const next=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',String(port)],{
 env:{...process.env,NODE_ENV:'production',VSPH_PUBLIC_ORIGIN:origin,
 VSPH_INTERNAL_API_ORIGIN:'http://127.0.0.1:'+addr.port},
 stdio:['ignore','pipe','pipe'],
});
let logs='';
next.stdout.on('data',b=>{logs+=b.toString();});
next.stderr.on('data',b=>{logs+=b.toString();});
async function load(path,session){
 const res=await fetch(origin+path,{
  headers:session?{Cookie:'vsph.portal.sid='+session}:{},
  redirect:'manual'
 });
 return {status:res.status,html:await res.text(),location:res.headers.get('location')};
}
try{
 let ready=false;
 for(let i=0;i<100;i++){
   if(next.exitCode!==null)throw Error('Next exited: '+logs);
   try{if((await fetch(origin+'/login')).status===200){ready=true;break;}}catch{}
   await sleep(200);
 }
 assert.ok(ready,'Next did not start: '+logs);
 const anonymous=await load('/dashboard');
 assert.ok([302,303,307,308].includes(anonymous.status));
 assert.match(anonymous.location||'',/\/login/);
 const owner=await load('/dashboard',ownerSid);
 assert.equal(owner.status,200,'Owner SSR should render');
 assert.match(owner.html,/Company overview/);
 assert.match(owner.html,/Cash collected/);
 assert.match(owner.html,/₹100\.00|\u20b9100\.00/, 'Numeric Postgres totals must render as exact INR paise');
 assert.doesNotMatch(owner.html,/Finance ledger unavailable/);
 assert.match(owner.html,/Owner Example/);
 assert.match(owner.html,/href="\/admin\?tab=audit(?:&amp;|&)view=removals"/,
   'Owner audit logs menu must be a working server-rendered link');
 assert.doesNotMatch(owner.html,/Worker Example|Confidential Former Employee/);
 const employee=await load('/dashboard',employeeSid);
 assert.equal(employee.status,200,'Employee SSR should render');
 assert.match(employee.html,/My dashboard/);
 assert.match(employee.html,/Review release plan/);
 assert.match(employee.html,/Task completion activity/);
 assert.doesNotMatch(employee.html,/Owner Example|Cash collected|Confidential Former Employee/);
 assert.doesNotMatch(employee.html,/href="\/admin\?tab=audit/,
   'Audit navigation must not be exposed to an ordinary employee');
 const restricted=await load('/employees/archived',employeeSid);
 assert.doesNotMatch(restricted.html,/Confidential Former Employee|former@example.invalid/);
 const archived=await load('/employees/archived',ownerSid);
 assert.equal(archived.status,200);
 assert.match(archived.html,/Confidential Former Employee/);
 const invalid=await load('/dashboard',unknownSid);
 assert.doesNotMatch(invalid.html,/Cash collected|Review release plan|Confidential Former Employee/);
 assert.equal(calls.filter(x=>x.url==='/api/admin-management/dashboard'&&x.role!=='owner').length,0);
 assert.equal(calls.filter(x=>x.url==='/api/hrms/me'&&x.role!=='employee').length,0);
 console.log('Authenticated migration SSR smoke passed (owner/employee isolated records, private archive, missing and expired sessions).');
} finally{
 next.kill('SIGTERM');
 backend.close();
 if(next.exitCode===null){
   await Promise.race([once(next,'exit').catch(()=>{}),sleep(3000)]);
   if(next.exitCode===null)next.kill('SIGKILL');
 }
}

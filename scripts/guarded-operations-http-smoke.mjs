/**
 * Production Next.js HTTP smoke for high-impact migration mutation gateways.
 * Disposable in-process fake backend, fake session, no DB/provider connections.
 * Tests actual request validation, Origin/session fail-closed behavior, and
 * exact forwarding to the legacy API without trusting browser-supplied paths.
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as sleep} from 'node:timers/promises';

const port=47056,origin='http://127.0.0.1:'+port;
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const key='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const sid='a'.repeat(48),upstreamCalls=[];
const respond=(res,status,value)=>{
 res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});
 res.end(JSON.stringify(value));
};
const backend=http.createServer(async(req,res)=>{
 let body='';
 for await(const chunk of req)body+=chunk.toString('utf8');
 let parsed=null;
 try{parsed=body?JSON.parse(body):null;}
 catch{return respond(res,400,{message:'Malformed test request'});}
 upstreamCalls.push({path:req.url,method:req.method,origin:req.headers.origin,
   cookie:req.headers.cookie,key:req.headers['idempotency-key']||null,body:parsed});
 if(req.headers.cookie!=='vsph.portal.sid='+sid||req.headers.origin!==origin)
   return respond(res,403,{message:'Mock rejected origin or session'});
 const path=req.url;
 if(path==='/api/employees/'+id+'/remove'){
   if(parsed.version===9)return respond(res,409,{message:'Stale employee'});
   return respond(res,200,parsed.reason==='Malformed backend confirmation'?
     {removed:true,id:'not-a-uuid'}:
     {id,removed:true,removedAt:'2026-11-21T12:00:00Z'});
 }
 if(path==='/api/admin-management/customers/'+id+'/lifecycle/status')
   return respond(res,200,{version:parsed.version+1,
     impact:{activeMembers:2,productSessions:1,pendingInvitations:0}});
 if(path==='/api/projects/'+id+'/lifecycle/archive')
   return respond(res,200,{id,archived:true});
 if(path==='/api/finance/invoices')
   return respond(res,201,{id,version:2,replayed:false});
 if(path==='/api/projects/'+id+'/delivery/connections')
   return respond(res,200,{saved:true});
 if(path==='/api/hrms/me/leave')
   return respond(res,200,{id,status:'pending'});
 return respond(res,404,{message:'Unrecognized mock path'});
});
await new Promise((resolve,reject)=>{
 backend.once('error',reject);backend.listen(0,'127.0.0.1',resolve);
});
const address=backend.address();
assert.ok(address&&typeof address!=='string');
const apiOrigin='http://127.0.0.1:'+address.port;
const next=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',String(port)],{
 env:{...process.env,NODE_ENV:'production',VSPH_PUBLIC_ORIGIN:origin,VSPH_INTERNAL_API_ORIGIN:apiOrigin},
 stdio:['ignore','pipe','pipe'],
});
let logs='';
next.stdout.on('data',chunk=>{logs+=chunk.toString();});
next.stderr.on('data',chunk=>{logs+=chunk.toString();});
async function post(path,body,{cookie=sid,site='same-origin',requestOrigin=origin,headers={}}={}){
 const h={'Content-Type':'application/json',Origin:requestOrigin,'Sec-Fetch-Site':site,
   ...(cookie?{Cookie:'vsph.portal.sid='+cookie}:{}),...headers};
 const result=await fetch(origin+path,{method:'POST',headers:h,body:JSON.stringify(body),redirect:'manual'});
 const raw=await result.text();
 let data=null;
 try{data=raw?JSON.parse(raw):null;}catch{data=raw;}
 return {status:result.status,data,headers:result.headers};
}
function last(){return upstreamCalls.at(-1);}
async function rejected(path,body){
 const count=upstreamCalls.length;
 const [noCookie,wrongOrigin,crossSite]=await Promise.all([
   post(path,body,{cookie:null}),
   post(path,body,{requestOrigin:'https://attacker.invalid'}),
   post(path,body,{site:'cross-site'}),
 ]);
 assert.equal(noCookie.status,401,path+' anonymous');
 assert.equal(wrongOrigin.status,403,path+' foreign Origin');
 assert.equal(crossSite.status,403,path+' cross-site');
 assert.equal(upstreamCalls.length,count,path+' rejected requests reached backend');
}
try{
 let ready=false;
 for(let i=0;i<100;i++){
   if(next.exitCode!==null)throw Error('Next exited: '+logs);
   try{if((await fetch(origin+'/login')).status===200){ready=true;break;}}catch{}
   await sleep(200);
 }
 assert.ok(ready,'Next did not start: '+logs);
 const remove={operation:'remove',id,version:2,reason:'Verified employment departure',confirmed:true};
 const customer={action:'status',organizationId:id,version:1,status:'suspended',confirmed:true};
 const archive={operation:'archive',projectId:id,version:2,key:'TEST-APP',confirmed:true};
 const invoice={action:'invoice',key,reference:'INV-2026-001',organizationId:id,
   projectId:null,amountPaise:15000,issuedOn:'2026-11-21',dueOn:'2026-12-21'};
 const connection={action:'connect',projectId:id,installationId:77,repositoryId:88};
 const leave={action:'leave',startOn:'2026-12-10',endOn:'2026-12-12',
   kind:'annual',reason:'Planned family leave'};
 const cases=[
   ['/api/employee-lifecycle-action',remove],
   ['/api/customer-lifecycle-action',customer],
   ['/api/project-lifecycle-action',archive],
   ['/api/finance-command',invoice],
   ['/api/github-delivery-action',connection],
   ['/api/my-work-action',leave],
 ];
 for(const [path,body] of cases)await rejected(path,body);
 for(const [path,body] of cases){
   const n=upstreamCalls.length;
   const invalid=await post(path,{...body,unreviewedPrivilege:'owner'},
     path==='/api/my-work-action'?{headers:{'Idempotency-Key':key}}:{});
   assert.equal(invalid.status,400,path+' unexpected fields');
   assert.equal(upstreamCalls.length,n,path+' malformed payload reached backend');
 }
 for(const [path,body] of cases){
   const request=await post(path,body,
     path==='/api/my-work-action'?{headers:{'Idempotency-Key':key}}:{});
   assert.equal(request.status,200,path+' valid operation: '+JSON.stringify(request.data));
   assert.equal(request.data?.ok,true,path+' confirmed result');
   assert.match(request.headers.get('cache-control')||'',/no-store/);
 }
 assert.equal(upstreamCalls.length,cases.length);
 const paths=[
   '/api/employees/'+id+'/remove',
   '/api/admin-management/customers/'+id+'/lifecycle/status',
   '/api/projects/'+id+'/lifecycle/archive',
   '/api/finance/invoices',
   '/api/projects/'+id+'/delivery/connections',
   '/api/hrms/me/leave',
 ];
 assert.deepEqual(upstreamCalls.map(x=>x.path),paths);
 for(const row of upstreamCalls){
   assert.equal(row.method,'POST');
   assert.equal(row.origin,origin);
   assert.equal(row.cookie,'vsph.portal.sid='+sid);
 }
 assert.deepEqual(upstreamCalls[0].body,{version:2,reason:remove.reason,confirmed:true});
 assert.deepEqual(upstreamCalls[1].body,{status:'suspended',version:1,confirmed:true});
 assert.deepEqual(upstreamCalls[2].body,{version:2,key:'TEST-APP',confirmed:true});
 assert.deepEqual(upstreamCalls[3].body,{
   reference:invoice.reference,organizationId:id,projectId:null,amountPaise:15000,
   issuedOn:invoice.issuedOn,dueOn:invoice.dueOn,
 });
 assert.equal(upstreamCalls[3].key,key,'invoice idempotency header must be forwarded');
 assert.deepEqual(upstreamCalls[4].body,{installationId:77,repositoryId:88});
 assert.deepEqual(upstreamCalls[5].body,{
   startOn:leave.startOn,endOn:leave.endOn,kind:'annual',reason:leave.reason,
 });
 assert.equal(upstreamCalls[5].key,key,'leave idempotency header must be forwarded');
 // Chunked uploads without Content-Length must not be fully buffered by the route.
 const priorToOverflow=upstreamCalls.length;
 for(const target of ['/api/finance-command','/api/employee-lifecycle-action']){
   const streamed=new ReadableStream({start(controller){
      controller.enqueue(new TextEncoder().encode('{"payload":"'+ 'x'.repeat(6000)+'"}'));
      controller.close();
   }});
   const overflow=await fetch(origin+target,{method:'POST',
     headers:{Origin:origin,'Sec-Fetch-Site':'same-origin',
       'Content-Type':'application/json',Cookie:'vsph.portal.sid='+sid},
     body:streamed,duplex:'half',redirect:'manual'});
   assert.equal(overflow.status,400,target+' oversized chunked body');
 }
 assert.equal(upstreamCalls.length,priorToOverflow,'Oversized chunked data must not reach backend');

 const before=upstreamCalls.length;
 assert.equal((await post('/api/employee-lifecycle-action',{...remove,version:9})).status,409);
 assert.equal((await post('/api/employee-lifecycle-action',
   {...remove,reason:'Malformed backend confirmation'})).status,502);
 assert.equal(upstreamCalls.length,before+2);
 console.log('High-impact migration gateways HTTP smoke passed: 401/403/400/409/502, six confirmed 200 paths, strict upstream payloads and idempotency keys.');
} finally{
 next.kill('SIGTERM');
 backend.close();
 if(next.exitCode===null){
   await Promise.race([once(next,'exit').catch(()=>{}),sleep(3000)]);
   if(next.exitCode===null)next.kill('SIGKILL');
 }
}

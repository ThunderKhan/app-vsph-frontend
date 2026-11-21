/**
 * Production Next.js authentication HTTP acceptance against an isolated Express-shaped
 * identity server. No real accounts, secrets, provider sessions or hosted DB involved.
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as sleep} from 'node:timers/promises';

const port=47058,origin='http://127.0.0.1:'+port;
const sid='p'.repeat(43),appSid='c'.repeat(43),temporarySid='t'.repeat(43);
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const userId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const calls=[];
let appEnabled=true;
const respond=(res,status,data,cookie)=>{
 res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store',
   ...(cookie?{'Set-Cookie':cookie}:{})});
 res.end(JSON.stringify(data));
};
const backend=http.createServer(async(req,res)=>{
 let body='';
 for await(const chunk of req)body+=chunk.toString('utf8');
 let payload=null;
 try{payload=body?JSON.parse(body):null;}catch{return respond(res,400,{message:'Invalid JSON'});}
 calls.push({method:req.method,path:req.url,origin:req.headers.origin||null,
   cookie:req.headers.cookie||null,payload});
 if(req.method==='GET'&&req.url==='/api/employee-credentials/status'){
   if(req.headers.cookie!=='vsph.employee.setup='+temporarySid)
      return respond(res,401,{message:'Temporary setup expired'});
   return respond(res,200,{name:'New Employee',email:'worker@example.invalid',privateToken:'never expose'});
 }
 if(req.method==='GET'&&req.url==='/api/apps/CRM/contexts'){
   if(req.headers.cookie!=='vsph.portal.sid='+sid)
     return respond(res,401,{message:'Sign in first'});
   return respond(res,200,{
     email:'worker@example.invalid',
     application:{code:'CRM',name:'CRM',status:'active'},
     organizations:[{id,name:'Customer A',role:'manager'}],
   });
 }
 const authorizedApp=req.headers.cookie==='vsph.portal.sid='+sid+'; vsph.crm.sid='+appSid;
 if(req.method==='GET'&&req.url==='/api/auth/me'){
  if(req.headers.cookie?.includes('vsph.portal.sid='+sid))return respond(res,200,{user:{id:userId,name:'Worker',email:'worker@example.invalid',platformRole:null}});
  return respond(res,401,{message:'Invalid session'});
 }
 if(req.method==='GET'&&req.url==='/api/hrms/access')return respond(res,200,{employee:false,management:false,governHr:false,pendingLink:false});
 if(req.method==='GET'&&req.url==='/api/apps/CRM/context'){
  if(!authorizedApp)return respond(res,401,{message:'Application session required'});
  if(!appEnabled)return respond(res,403,{message:'Revoked application role'});
  return respond(res,200,{application:{code:'CRM',name:'CRM',status:'active'},
   organization:{id,name:'Customer A'},user:{name:'Worker'},role:'manager',
   capabilities:{createRecords:true},integration:{recordsConfigured:true,
     heading:'CRM Contacts',externalHealth:'unverified'}});
 }
 if(req.method==='GET'&&req.url==='/api/apps/CRM/records'){
  if(!authorizedApp)return respond(res,401,{message:'Application session required'});
  if(!appEnabled)return respond(res,403,{message:'Revoked application role'});
  return respond(res,200,{records:[{id:userId,name:'Contact A',email:'person@example.invalid',company:'Customer A'}]});
 }
 if(req.method!=='POST'||req.headers.origin!==origin)
   return respond(res,403,{message:'Origin denied'});
 if(req.url==='/api/employee-enrollment/inspect'){
   if(payload?.id!==id||payload?.token!=='x'.repeat(43))
      return respond(res,400,{message:'Invalid private enrollment'});
   return respond(res,200,{name:'New Employee',email:'worker@example.invalid',
     expiresAt:'2026-12-01T00:00:00Z',privateToken:'never expose'});
 }
 if(req.url==='/api/employee-enrollment/accept'){
   if(payload?.id!==id||payload?.token!=='x'.repeat(43)||payload?.confirmed!==true)
      return respond(res,400,{message:'Invalid employee proof'});
   return respond(res,200,{message:'Your employee account is ready. Sign in with your work email and the password you just chose.'});
 }
 if(req.url==='/api/invitations/inspect'){
   if(payload?.invitationId!==id||payload?.token!=='x'.repeat(43))
      return respond(res,400,{message:'Invalid invitation'});
   return respond(res,200,{newIdentity:true,email:'worker@example.invalid',privateToken:'never expose'});
 }
 if(req.url==='/api/invitations/accept'){
   if(payload?.invitationId!==id||payload?.token!=='x'.repeat(43))
      return respond(res,400,{message:'Invalid customer invitation'});
   return respond(res,200,{message:'Invitation accepted for this customer workspace. Sign in to continue.'});
 }
 if(req.url==='/api/employee-credentials/replace'){
   if(req.headers.cookie!=='vsph.employee.setup='+temporarySid)
      return respond(res,401,{message:'Temporary setup expired'});
   if(payload?.password==='reject-password')
      return respond(res,400,{code:'PASSWORD_REJECTED',message:'Choose a different valid personal password.'});
   if(payload?.password!=='new-personal-password'||payload?.confirmed!==true)
      return respond(res,400,{message:'Invalid request'});
   return respond(res,200,{message:'Your personal password is set. Sign in again to open your employee workspace.'});
 }
 if(req.url==='/api/auth/login'){
   if(payload?.email!=='worker@example.invalid')
     return respond(res,401,{message:'Invalid credentials',code:'INVALID_CREDENTIALS'});
   if(payload.password==='mfa')
     return respond(res,401,{message:'Enter authenticator',code:'MFA_REQUIRED',
       factors:[{id,name:'Authenticator'}]});
   if(payload.password==='temporary')
     return respond(res,200,{passwordChangeRequired:true,redirect:'/employee-password'},
       'vsph.employee.setup='+temporarySid+'; Path=/; Max-Age=600; HttpOnly; SameSite=Lax');
   if(payload.password==='missing-cookie')
     return respond(res,200,{user:{id:userId,name:'Worker',email:'worker@example.invalid'}});
   if(payload.password==='correct')
     return respond(res,200,{user:{id:userId,name:'Worker',email:'worker@example.invalid'}},
       'vsph.portal.sid='+sid+'; Path=/; Max-Age=14400; HttpOnly; SameSite=Lax');
   return respond(res,401,{message:'Invalid credentials',code:'INVALID_CREDENTIALS'});
 }
 if(req.url==='/api/apps/CRM/records'){
  if(!authorizedApp)return respond(res,401,{message:'Application session required'});
  if(!appEnabled)return respond(res,403,{message:'Revoked application role'});
  if(!payload||payload.name!=='New Contact'||payload.email!=='new@example.invalid')return respond(res,400,{message:'Invalid contact'});
  return respond(res,201,{record:{id:userId,...payload}});
 }
 if(req.url==='/api/auth/app-logout'){
  if(!req.headers.cookie?.includes('vsph.portal.sid='+sid))return respond(res,401,{message:'Sign in first'});
  return respond(res,200,{message:'Application signed out.'});
 }
 if(req.url==='/api/auth/app-login'){
   if(req.headers.cookie!=='vsph.portal.sid='+sid)
     return respond(res,401,{message:'Portal session required'});
   if(payload?.app!=='CRM'||payload?.organizationId!==id||
      payload?.password!=='correct')
     return respond(res,403,{message:'Application access denied'});
   return respond(res,200,{message:'Application signed in.',redirect:'/apps/crm/home'},
     'vsph.crm.sid='+appSid+'; Path=/; Max-Age=14400; HttpOnly; SameSite=Lax');
 }
 return respond(res,404,{message:'Unsupported mock path'});
});
await new Promise((resolve,reject)=>{backend.once('error',reject);backend.listen(0,'127.0.0.1',resolve);});
const address=backend.address();assert.ok(address&&typeof address!=='string');
const upstream='http://127.0.0.1:'+address.port;
const next=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',String(port)],{
 env:{...process.env,NODE_ENV:'production',VSPH_PUBLIC_ORIGIN:origin,VSPH_INTERNAL_API_ORIGIN:upstream},
 stdio:['ignore','pipe','pipe'],
});
let logs='';
next.stdout.on('data',data=>{logs+=data.toString();});
next.stderr.on('data',data=>{logs+=data.toString();});
async function post(path,payload,{requestOrigin=origin,cookie,site='same-origin'}={}){
 const response=await fetch(origin+path,{method:'POST',cache:'no-store',redirect:'manual',
  headers:{'Content-Type':'application/json',Origin:requestOrigin,'Sec-Fetch-Site':site,
    ...(cookie?{Cookie:'vsph.portal.sid='+cookie}:{})},
  body:JSON.stringify(payload)});
 const json=await response.json().catch(()=>null);
 return {status:response.status,json,cookie:response.headers.get('set-cookie'),
   cache:response.headers.get('cache-control')};
}
const login={email:'worker@example.invalid',password:'correct'};
try{
 let ready=false;
 for(let i=0;i<100;i++){
  if(next.exitCode!==null)throw Error('Next exited: '+logs);
  try{if((await fetch(origin+'/login')).status===200){ready=true;break;}}catch{}
  await sleep(200);
 }
 assert.ok(ready,'Production Next did not start: '+logs);
 const before=calls.length;
 const originDenied=await post('/api/auth/login',login,{requestOrigin:'https://attacker.invalid'});
 assert.equal(originDenied.status,403);
 assert.equal((await post('/api/auth/login',{...login,platformRole:'super_admin'})).status,400);
 assert.equal((await post('/api/auth/login',{...login,totpCode:'123456'})).status,400);
 assert.equal(calls.length,before,'Rejected login never reached backend');

 const failure=await post('/api/auth/login',{...login,password:'wrong'});
 assert.equal(failure.status,401);assert.equal(failure.json?.code,'INVALID_CREDENTIALS');
 assert.equal(failure.cookie,null);
 const challenge=await post('/api/auth/login',{...login,password:'mfa'});
 assert.equal(challenge.status,401);assert.equal(challenge.json?.code,'MFA_REQUIRED');
 assert.equal(challenge.json?.factors?.[0].id,id);
 assert.equal(challenge.cookie,null);
 const untrusted=await post('/api/auth/login',{...login,password:'missing-cookie'});
 assert.equal(untrusted.status,502);assert.equal(untrusted.cookie,null,
   'Never invent a session cookie from an upstream success body');

 const portal=await post('/api/auth/login',login);
 assert.equal(portal.status,200);assert.match(portal.cookie||'',/vsph\.portal\.sid=/);
 assert.match(portal.cookie||'',/httponly/i);assert.match(portal.cookie||'',/samesite=lax/i);
 assert.equal(portal.json?.message,'Signed in.');assert.match(portal.cache||'',/no-store/);
 const temporary=await post('/api/auth/login',{...login,password:'temporary'});
 assert.equal(temporary.status,200);
 assert.equal(temporary.json?.redirect,'/employee-password');
 assert.match(temporary.cookie||'',/vsph\.employee\.setup=/);
 assert.doesNotMatch(temporary.cookie||'',/vsph\.portal\.sid=[a-zA-Z0-9_-]{43}/);

 const noContext=await fetch(origin+'/api/apps/CRM/contexts',{redirect:'manual'});
 assert.equal(noContext.status,401);
 const withContext=await fetch(origin+'/api/apps/crm/contexts',{
   headers:{Cookie:'vsph.portal.sid='+sid},redirect:'manual'});
 assert.equal(withContext.status,200);
 const context=await withContext.json();
 assert.equal(context.application.name,'CRM');assert.equal(context.organizations[0].id,id);
 assert.equal(context.email,'worker@example.invalid');
 assert.ok(!('applicationSecret' in context));
 const noPortal=await post('/api/auth/app-login',{...login,app:'CRM',organizationId:id});
 assert.equal(noPortal.status,401);assert.equal(noPortal.cookie,null);
 const appLogin=await post('/api/auth/app-login',{...login,app:'CRM',organizationId:id},{cookie:sid});
 assert.equal(appLogin.status,200);assert.equal(appLogin.json?.redirect,'/apps/crm/home');
 assert.match(appLogin.cookie||'',/vsph\.crm\.sid=/);
 assert.match(appLogin.cookie||'',/httponly/i);
 assert.equal((await post('/api/auth/app-login',{...login,app:'CRM',organizationId:userId},
  {cookie:sid})).status,403,'Unauthorized organization denied by backend');


 const proof={id,token:'x'.repeat(43)};
 const beforeProof=calls.length;
 const deniedProof=await post('/api/employee-enrollment/inspect',proof,
   {requestOrigin:'https://attacker.invalid'});
 assert.equal(deniedProof.status,403);
 assert.equal((await post('/api/employee-enrollment/inspect',{...proof,actorId:userId})).status,400);
 assert.equal(calls.length,beforeProof);
 const inspected=await post('/api/employee-enrollment/inspect',proof);
 assert.equal(inspected.status,200);assert.equal(inspected.json?.name,'New Employee');
 assert.equal('privateToken' in inspected.json,false);
 const enrolled=await post('/api/employee-enrollment/accept',{
   ...proof,password:'enrollment-pass-phrase',confirmed:true});
 assert.equal(enrolled.status,200);
 assert.match(enrolled.json?.message||'',/employee account is ready/);
 const customerProof={invitationId:id,token:'x'.repeat(43)};
 const customerInspect=await post('/api/invitations/inspect',customerProof);
 assert.equal(customerInspect.status,200);assert.equal(customerInspect.json?.newIdentity,true);
 assert.equal('privateToken' in customerInspect.json,false);
 const customerAccept=await post('/api/invitations/accept',
   {...customerProof,password:'enrollment-pass-phrase'});
 assert.equal(customerAccept.status,200);
 assert.match(customerAccept.json?.message||'',/Invitation accepted/);
 const tempBefore=await fetch(origin+'/api/employee-credentials/status',{redirect:'manual'});
 assert.equal(tempBefore.status,401,'No temporary employee identity without setup cookie');
 const temporaryStatus=await fetch(origin+'/api/employee-credentials/status',{
   redirect:'manual',headers:{Cookie:'vsph.employee.setup='+temporarySid}});
 assert.equal(temporaryStatus.status,200);
 const temporaryProjection=await temporaryStatus.json();
 assert.equal(temporaryProjection.name,'New Employee');
 assert.equal('privateToken' in temporaryProjection,false);
 const personalPassword=async(password,cookie=temporarySid)=>fetch(
   origin+'/api/employee-credentials/replace',{
    method:'POST',cache:'no-store',redirect:'manual',
    headers:{Origin:origin,'Sec-Fetch-Site':'same-origin','Content-Type':'application/json',
      Cookie:'vsph.employee.setup='+cookie},
    body:JSON.stringify({password,confirmed:true})});
 const rejectedPersonal=await personalPassword('reject-password');
 assert.equal(rejectedPersonal.status,400);
 assert.equal((await rejectedPersonal.json())?.code,'PASSWORD_REJECTED');
 const replaced=await personalPassword('new-personal-password');
 assert.equal(replaced.status,200);
 assert.equal((await replaced.json())?.message,
   'Your personal password is set. Sign in again to open your employee workspace.');
 assert.match(replaced.headers.get('set-cookie')||'',/vsph\.employee\.setup=/);
 assert.match(replaced.headers.get('set-cookie')||'',/expires=/i);
 const missingCredential=await personalPassword('new-personal-password','wrong');
 assert.equal(missingCredential.status,401);

 const combinedCookie='vsph.portal.sid='+sid+'; vsph.crm.sid='+appSid;
 const requestApp=async(path,{cookie=combinedCookie,method='GET',data=null,
   requestOrigin=origin}={})=>{
   const res=await fetch(origin+path,{method,redirect:'manual',cache:'no-store',
     headers:{Cookie:cookie,...(method==='POST'?{Origin:requestOrigin,
       'Sec-Fetch-Site':'same-origin','Content-Type':'application/json'}:{})},
     ...(method==='POST'?{body:JSON.stringify(data)}:{})});
   return {status:res.status,body:await res.json().catch(()=>null),
     cookies:res.headers.get('set-cookie'),headers:res.headers};
 };
 const productHome=await fetch(origin+'/apps/crm/home',{
   headers:{Cookie:combinedCookie},redirect:'manual'});
 assert.equal(productHome.status,200,'Second-stage sign-in must land on a migrated app home');
 const productHtml=await productHome.text();
 assert.match(productHtml,/VSPH APPLICATION WORKSPACE/);
 assert.match(productHtml,/Application workspace|CRM/);
 assert.equal((await requestApp('/api/apps/CRM/context',{cookie:'vsph.portal.sid='+sid})).status,401,
   'Second stage requires product session, not only portal cookie');
 const current=await requestApp('/api/apps/CRM/context');
 assert.equal(current.status,200);
 assert.equal(current.body?.organization.id,id);
 assert.equal(current.body?.application.code,'CRM');
 const rows=await requestApp('/api/apps/CRM/records');
 assert.equal(rows.status,200);
 assert.equal(rows.body?.records?.[0]?.first,'Contact A');
 assert.equal(rows.body?.records?.[0]?.third,'Customer A');
 assert.ok(!('secret' in rows.body.records[0]));
 assert.equal((await requestApp('/api/apps/CRM/records',{
   method:'POST',data:{name:'New Contact',email:'new@example.invalid',company:'Customer A'},
   requestOrigin:'https://attacker.invalid'})).status,403);
 assert.equal((await requestApp('/api/apps/CRM/records',{
   method:'POST',data:{name:'New Contact',email:'new@example.invalid',company:'Customer A',
     organizationId:userId}})).status,400);
 const created=await requestApp('/api/apps/CRM/records',{method:'POST',
   data:{name:'New Contact',email:'new@example.invalid',company:'Customer A'}});
 assert.equal(created.status,201);assert.equal(created.body?.ok,true);
 appEnabled=false;
 assert.equal((await requestApp('/api/apps/CRM/context')).status,403);
 assert.equal((await requestApp('/api/apps/CRM/records')).status,403);
 appEnabled=true;
 const done=await requestApp('/api/auth/app-logout',{method:'POST',data:{app:'CRM'}});
 assert.equal(done.status,200);assert.equal(done.body?.ok,true);
 assert.match(done.cookies||'',/vsph\.crm\.sid=/);
 assert.doesNotMatch(done.cookies||'',/vsph\.portal\.sid=/,'App logout must not clear portal session');
 assert.ok(calls.some(c=>c.path==='/api/apps/CRM/context'&&c.cookie===combinedCookie));

 assert.ok(calls.some(c=>c.path==='/api/auth/login'&&c.origin===origin));
 assert.ok(calls.some(c=>c.path==='/api/auth/app-login'&&c.cookie==='vsph.portal.sid='+sid));
 console.log('Verified portal, MFA, enrollment and application sign-in proxy over production HTTP with isolated backend.');
}finally{
 next.kill('SIGTERM');backend.close();
 if(next.exitCode===null){
  await Promise.race([once(next,'exit').catch(()=>{}),sleep(3000)]);
  if(next.exitCode===null)next.kill('SIGKILL');
 }
}

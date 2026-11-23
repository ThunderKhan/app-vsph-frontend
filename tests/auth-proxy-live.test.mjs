import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateAuthMutation,authenticationCookie,confirmedAuthResult,applicationLoginContext,safeAuthError} from '../src/features/auth/AuthProxyContract.ts';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const password='a valid password with spaces';
const portal={email:' person@example.invalid ',password};
const app={email:'person@example.invalid',password,app:'CRM',organizationId:id};
test('sign-in fields never accept browser-supplied authority, URLs or provider secrets',()=>{
 assert.equal(validateAuthMutation(portal,'portal')?.email,'person@example.invalid');
 assert.equal(validateAuthMutation({...portal,admin:true},'portal'),null);
 assert.equal(validateAuthMutation({...portal,password:''},'portal'),null);
 assert.equal(validateAuthMutation({...portal,totpCode:'123456'},'portal'),null);
 assert.equal(validateAuthMutation({...portal,totpCode:'123456',totpFactorId:id},'portal')?.totpCode,'123456');
 assert.equal(validateAuthMutation(app,'application')?.organizationId,id);
 assert.equal(validateAuthMutation({...app,app:'../CRM'},'application'),null);
 assert.equal(validateAuthMutation({...app,organizationId:'outside'},'application'),null);
 assert.equal(validateAuthMutation({...app,redirect:'https://evil.invalid'},'application'),null);
});
test('backend confirmation must match portal/temporary/app flow exactly',()=>{
 const user={id,name:'Employee',email:'person@example.invalid'};
 assert.equal(confirmedAuthResult({user},'portal'),'portal');
 assert.equal(confirmedAuthResult({passwordChangeRequired:true,redirect:'/employee-password'},'portal'),'temporary');
 assert.equal(confirmedAuthResult({redirect:'/apps/crm/home'},'application','CRM'),'application');
 assert.equal(confirmedAuthResult({redirect:'https://evil.invalid'},'application','CRM'),null);
 assert.equal(confirmedAuthResult({redirect:'/apps/music/home'},'application','CRM'),null);
 assert.equal(confirmedAuthResult({message:'signed in'},'portal'),null);
});
test('a single valid backend-issued opaque session is required before browser cookie issuance',()=>{
 const headers=new Headers();
 assert.equal(authenticationCookie(headers,'vsph.portal.sid'),null);
 headers.append('set-cookie','vsph.portal.sid='+ 'a'.repeat(43)+'; Path=/; HttpOnly');
 assert.equal(authenticationCookie(headers,'vsph.portal.sid'),'a'.repeat(43));
 headers.append('set-cookie','vsph.portal.sid='+ 'b'.repeat(43)+'; Path=/');
 assert.equal(authenticationCookie(headers,'vsph.portal.sid'),null);
 const invalid=new Headers({'set-cookie':'vsph.portal.sid=not-secret; Path=/'});
 assert.equal(authenticationCookie(invalid,'vsph.portal.sid'),null);
});
test('application organization contexts are scoped, bounded and duplicate-free',()=>{
 const valid={application:{code:'CRM',status:'active',name:'Customer workspace'},
  email:'person@example.invalid',organizations:[{id,name:'Customer',role:'manager'}]};
 assert.equal(applicationLoginContext(valid,'CRM')?.organizations[0].id,id);
 assert.equal(applicationLoginContext({...valid,application:{...valid.application,code:'MUSIC'}},'CRM'),null);
 assert.equal(applicationLoginContext({...valid,organizations:[...valid.organizations,...valid.organizations]},'CRM'),null);
 assert.equal(applicationLoginContext({...valid,organizations:[{id:'bad',name:'Unsafe',role:'owner'}]},'CRM'),null);
});
test('MFA errors expose only bounded codes and verified factor labels',()=>{
 const reply=safeAuthError({message:'Enter authenticator',code:'MFA_REQUIRED',
  factors:[{id,name:'Authenticator'}]});
 assert.equal(reply.code,'MFA_REQUIRED');
 assert.equal(reply.factors?.[0].id,id);
 assert.equal(safeAuthError({message:'x',code:'MFA_REQUIRED',
   factors:[{id:'invalid',name:'Bad'}]}).factors,undefined);
});
test('authentication bridge preserves origin, strict backend cookies and bounded request bodies',async()=>{
 const gateway=await read('src/features/auth/auth-gateway.ts');
 const login=await read('src/app/api/auth/login/route.ts');
 const appLogin=await read('src/app/api/auth/app-login/route.ts');
 const contexts=await read('src/app/api/apps/[app]/contexts/route.ts');
 assert.match(gateway,/approvedPublicOrigin/);
 assert.match(gateway,/approvedInternalOrigin/);
 assert.match(gateway,/readBoundedRequestText/);
 assert.match(gateway,/authenticationCookie/);
 assert.match(gateway,/httpOnly:true/);
 assert.match(gateway,/response.cookies.set/);
 assert.match(login,/authenticate\(request,'portal'\)/);
 assert.match(appLogin,/authenticate\(request,'application'\)/);
 assert.match(contexts,/applicationLoginContext/);
 assert.doesNotMatch(gateway+login+appLogin,/NEXT_PUBLIC_|console\.log|x-vsph-client-secret/);
});

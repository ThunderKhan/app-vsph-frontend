import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {invitationPayload,publicProofResult,temporaryCredentialPayload,
 temporaryCredentialStatus,confirmedTemporaryReplace,sanitizedCredentialError}
 from '../src/features/employee-entry/EnrollmentGatewayContract.ts';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const uuid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',secret='x'.repeat(43);
test('employee enrollment is exactly scoped to one private capability',()=>{
 const proof={id:uuid,token:secret};
 assert.deepEqual(invitationPayload(proof,'employee','inspect'),proof);
 assert.deepEqual(invitationPayload({...proof,password:'good-pass',confirmed:true},'employee','accept'),
   {...proof,password:'good-pass',confirmed:true});
 for(const data of [{...proof,token:'bad'}, {...proof,id:'bad'},
   {...proof,organizationId:uuid}])assert.equal(invitationPayload(data,'employee','inspect'),null);
 for(const data of [{...proof,password:'a',confirmed:true},
   {...proof,password:'password123'}, {...proof,password:'password123',confirmed:true,actor:uuid}])
   assert.equal(invitationPayload(data,'employee','accept'),null);
 const inspect=publicProofResult({name:'Worker',email:'worker@example.invalid',
   expiresAt:'2026-12-01T00:00:00Z',privateHash:secret},'employee','inspect');
 assert.equal(inspect.name,'Worker');
 assert.equal('privateHash' in inspect,false);
 assert.equal(publicProofResult({expiresAt:'invalid'},'employee','inspect'),null);
 assert.ok(publicProofResult({message:'Your employee account is ready. Sign in with your work email and the password you just chose.'},'employee','accept'));
 assert.equal(publicProofResult({message:'Saved'},'employee','accept'),null);
});
test('customer invitations never accept extraneous privilege fields or forged success',()=>{
 const proof={invitationId:uuid,token:secret};
 assert.deepEqual(invitationPayload(proof,'customer','inspect'),proof);
 assert.deepEqual(invitationPayload({...proof,password:'a'.repeat(12)},'customer','accept'),
   {...proof,password:'a'.repeat(12)});
 assert.deepEqual(invitationPayload(proof,'customer','accept'),proof);
 assert.equal(invitationPayload({...proof,userId:uuid},'customer','inspect'),null);
 assert.equal(publicProofResult({newIdentity:true,email:'not needed'},'customer','inspect')?.newIdentity,true);
 assert.equal(publicProofResult({newIdentity:'true'},'customer','inspect'),null);
 assert.equal(publicProofResult({message:'Invitation accepted for this customer workspace. Sign in to continue.'},'customer','accept')?.message,
  'Invitation accepted for this customer workspace. Sign in to continue.');
 assert.equal(publicProofResult({message:'Accepted'},'customer','accept'),null);
});
test('temporary employee setup requires original backend status and exact success',()=>{
 assert.deepEqual(temporaryCredentialPayload({password:'a'.repeat(12),confirmed:true}),
   {password:'a'.repeat(12),confirmed:true});
 assert.equal(temporaryCredentialPayload({password:'a'.repeat(11),confirmed:true}),null);
 assert.equal(temporaryCredentialPayload({password:'a'.repeat(12),confirmed:true,actorId:uuid}),null);
 assert.deepEqual(temporaryCredentialStatus({name:'Worker',email:'worker@example.invalid',secret:'should not leak'}),
   {name:'Worker',email:'worker@example.invalid'});
 assert.equal(temporaryCredentialStatus({name:'',email:'abc'}),null);
 assert.equal(confirmedTemporaryReplace({message:'Your personal password is set. Sign in again to open your employee workspace.'}),true);
 assert.equal(confirmedTemporaryReplace({message:'Success'}),false);
 assert.deepEqual(sanitizedCredentialError({code:'PASSWORD_REJECTED',message:'Use a different password'}),
   {message:'Use a different password',code:'PASSWORD_REJECTED'});
});
test('private invitation and temporary credential routes preserve fixed backend authority',async()=>{
 const code=await read('src/features/employee-entry/EnrollmentGateway.ts');
 const customer=await read('src/app/api/invitations/[action]/route.ts');
 const employee=await read('src/app/api/employee-enrollment/[action]/route.ts');
 const status=await read('src/app/api/employee-credentials/status/route.ts');
 const replace=await read('src/app/api/employee-credentials/replace/route.ts');
 assert.match(code,/approvedInternalOrigin/);
 assert.match(code,/approvedPublicOrigin/);
 assert.match(code,/readBoundedRequestText/);
 assert.match(code,/confirmedTemporaryReplace/);
 assert.match(code,/result.cookies.set/);
 assert.match(customer,/publicInvitation/);assert.match(employee,/publicInvitation/);
 assert.match(status,/temporaryStatus/);assert.match(replace,/temporaryReplace/);
 assert.doesNotMatch(code,/localStorage|sessionStorage|console\.log|NEXT_PUBLIC_/);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseOwnerTransferPreview,parseOwnerTransferRequest,confirmedOwnerTransfer,
 parseOwnerMfaFactors} from '../src/features/organizations/OwnerTransferContract.ts';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const org='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',target='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const preview={organizationId:org,targetUserId:target,organizationVersion:4,ownerVersion:2,
 targetVersion:7,targetName:'Approved Admin',targetEmail:'admin@example.invalid',previousOwnerRole:'admin'};
test('only exact current organization, target, and all three versions can authorize a transfer',()=>{
 assert.equal(parseOwnerTransferPreview(preview,org,target)?.targetVersion,7);
 assert.equal(parseOwnerTransferPreview({...preview,organizationVersion:0},org,target),null);
 assert.equal(parseOwnerTransferPreview(preview,target,target),null);
 const request={...preview,confirmed:true,password:'current-owner-password'};
 assert.equal(parseOwnerTransferRequest(request)?.targetUserId,target);
 for(const modified of [{...request,confirmed:false},{...request,password:''},
   {...request,adminOverride:true},{...request,ownerVersion:0},{...request,targetUserId:'wrong'},
   {...request,totpCode:'123456'},{...request,totpCode:'123456',totpFactorId:'invalid'},
   {...request,totpCode:'111',totpFactorId:org}]){
  assert.equal(parseOwnerTransferRequest(modified),null);
 }
 assert.equal(parseOwnerTransferRequest({...request,totpCode:'123456',totpFactorId:org})?.totpCode,'123456');
 assert.equal(confirmedOwnerTransfer({ownerId:target,previousOwnerRole:'admin',organizationVersion:5},preview),true);
 assert.equal(confirmedOwnerTransfer({ownerId:target,previousOwnerRole:'admin',organizationVersion:4},preview),false);
});
test('MFA factors require bounded validated IDs and labels',()=>{
 assert.deepEqual(parseOwnerMfaFactors([{id:org,name:'Authenticator'}]),
   [{id:org,name:'Authenticator'}]);
 assert.deepEqual(parseOwnerMfaFactors([{id:'spoofed',name:'Unknown'}]),[]);
});
test('single-request transfer validates same-origin/session and never exposes step-up proof',async()=>{
 const route=await read('src/app/api/owner-transfer-action/route.ts');
 const previewRoute=await read('src/app/api/owner-transfer-preview/route.ts');
 const api=await read('src/features/workspace/server-api.ts');
 const panel=await read('src/features/organizations/OwnerTransferPanel.tsx');
 const orgUi=await read('src/features/organizations/OrganizationWorkspace.tsx');
 assert.match(route,/approvedPublicOrigin/);
 assert.match(route,/validPortalSession/);
 assert.match(route,/readBoundedRequestText/);
 assert.match(route,/X-VSPH-Step-Up/);
 assert.match(route,/confirmedOwnerTransfer/);
 assert.match(route,/return NextResponse.json\(\{ok:true,ownerId:targetUserId\}/);
 assert.match(previewRoute,/parseOwnerTransferPreview/);
 assert.match(api,/permittedOwnerTransferPreview/);
 assert.match(panel,/password:'?/i);
 assert.match(panel,/MFA_REQUIRED/);
 assert.match(panel,/m.role==='admin'&&m.status==='active'/);
 assert.match(orgUi,/OwnerTransferPanel/);
 assert.doesNotMatch(panel,/localStorage|sessionStorage|X-VSPH-Step-Up|proofHash/);
 assert.doesNotMatch(route,/localStorage|sessionStorage|NEXT_PUBLIC_|console\.log/);
});

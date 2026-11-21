/** Organization ownership: backend authorizes only current sole owner -> active admin. */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const obj=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const version=(v:unknown):v is number=>Number.isSafeInteger(v)&&(v as number)>0&&(v as number)<=2147483647;
export type OwnerTransferPreview={
 organizationId:string;organizationVersion:number;ownerVersion:number;
 targetVersion:number;targetUserId:string;targetName:string;
 targetEmail:string;previousOwnerRole:'admin';
};
export function parseOwnerTransferPreview(raw:unknown,orgId:string,targetId:string):OwnerTransferPreview|null{
 if(!obj(raw)||!uuid.test(orgId)||!uuid.test(targetId)||
    raw.organizationId!==orgId||raw.targetUserId!==targetId||
    !version(raw.organizationVersion)||!version(raw.ownerVersion)||!version(raw.targetVersion)||
    typeof raw.targetName!=='string'||!raw.targetName.trim()||raw.targetName.length>150||
    typeof raw.targetEmail!=='string'||!raw.targetEmail.trim()||raw.targetEmail.length>190||
    raw.previousOwnerRole!=='admin')return null;
 return {organizationId:orgId,organizationVersion:raw.organizationVersion,
   ownerVersion:raw.ownerVersion,targetVersion:raw.targetVersion,targetUserId:targetId,
   targetName:raw.targetName,targetEmail:raw.targetEmail,previousOwnerRole:'admin'};
}
export type OwnerTransferRequest=OwnerTransferPreview & {
 password:string;confirmed:true;totpCode?:string;totpFactorId?:string;
};
export function parseOwnerTransferRequest(raw:unknown):OwnerTransferRequest|null{
 if(!obj(raw)||raw.confirmed!==true||
    typeof raw.organizationId!=='string'||typeof raw.targetUserId!=='string'||
    !uuid.test(raw.organizationId)||!uuid.test(raw.targetUserId)||
    !version(raw.organizationVersion)||!version(raw.ownerVersion)||!version(raw.targetVersion)||
    typeof raw.password!=='string'||raw.password.length<1||raw.password.length>4096||
    raw.previousOwnerRole!=='admin'||typeof raw.targetName!=='string'||
    typeof raw.targetEmail!=='string'||raw.targetName.length>150||raw.targetEmail.length>190||
    Object.keys(raw).some(k=>!['organizationId','organizationVersion','ownerVersion',
      'targetVersion','targetUserId','targetName','targetEmail','previousOwnerRole',
      'password','confirmed','totpCode','totpFactorId'].includes(k)))return null;
 const hasTotp=Object.hasOwn(raw,'totpCode'),hasFactor=Object.hasOwn(raw,'totpFactorId');
 if(hasTotp!==hasFactor||
    (hasTotp&&(typeof raw.totpCode!=='string'||!/^[0-9]{6}$/.test(raw.totpCode)||
      typeof raw.totpFactorId!=='string'||!uuid.test(raw.totpFactorId))))return null;
 const preview=parseOwnerTransferPreview(raw,raw.organizationId,raw.targetUserId);
 if(!preview)return null;
 return {...preview,password:raw.password,confirmed:true,
   ...(hasTotp?{totpCode:raw.totpCode as string,totpFactorId:raw.totpFactorId as string}:{})};
}
export function confirmedOwnerTransfer(raw:unknown,preview:OwnerTransferPreview):boolean{
 return obj(raw)&&raw.ownerId===preview.targetUserId&&
   raw.organizationVersion===preview.organizationVersion+1&&raw.previousOwnerRole==='admin';
}
export function parseOwnerMfaFactors(raw:unknown):{id:string;name:string}[]{
 if(!Array.isArray(raw)||raw.length>10)return [];
 const out:{id:string;name:string}[]=[];
 for(const item of raw){
  if(!obj(item)||typeof item.id!=='string'||!uuid.test(item.id)||
    typeof item.name!=='string'||item.name.length>100)return [];
  out.push({id:item.id,name:item.name});
 }
 return out;
}

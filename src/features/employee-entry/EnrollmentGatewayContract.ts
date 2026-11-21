/** Public invitation and temporary-credential proxy: fixed legacy request schemas. */
const obj=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const token=/^[A-Za-z0-9_-]{43}$/;
const exact=(x:Record<string,unknown>,keys:string[])=>Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const password=(x:unknown,min:number)=>typeof x==='string'&&x.length>=min&&x.length<=128;
export type PublicProofKind='employee'|'customer';
export type PublicProofAction='inspect'|'accept';
export function invitationPayload(raw:unknown,kind:PublicProofKind,action:PublicProofAction):Record<string,unknown>|null{
 if(!obj(raw))return null;
 if(kind==='employee'){
  const keys=action==='inspect'?['id','token']:['id','token','password','confirmed'];
  if(!exact(raw,keys)||typeof raw.id!=='string'||!uuid.test(raw.id)||
    typeof raw.token!=='string'||!token.test(raw.token)||
    action==='accept'&&(raw.confirmed!==true||!password(raw.password,8)))return null;
  return action==='inspect'?{id:raw.id,token:raw.token}:
    {id:raw.id,token:raw.token,password:raw.password,confirmed:true};
 }
 const keys=action==='inspect'?['invitationId','token']:Object.hasOwn(raw,'password')?
   ['invitationId','token','password']:['invitationId','token'];
 if(!exact(raw,keys)||typeof raw.invitationId!=='string'||!uuid.test(raw.invitationId)||
    typeof raw.token!=='string'||!token.test(raw.token)||
    Object.hasOwn(raw,'password')&&!password(raw.password,12))return null;
 return Object.hasOwn(raw,'password')?
   {invitationId:raw.invitationId,token:raw.token,password:raw.password}:
   {invitationId:raw.invitationId,token:raw.token};
}
export function publicProofResult(raw:unknown,kind:PublicProofKind,action:PublicProofAction):Record<string,unknown>|null{
 if(!obj(raw))return null;
 if(kind==='customer'){
  if(action==='inspect')return typeof raw.newIdentity==='boolean'?{newIdentity:raw.newIdentity}:null;
  return raw.message==='Invitation accepted for this customer workspace. Sign in to continue.'?
    {message:raw.message}:null;
 }
 if(action==='inspect'){
  if(typeof raw.name!=='string'||!raw.name.trim()||raw.name.length>150||
     typeof raw.email!=='string'||!raw.email.trim()||raw.email.length>254||
     typeof raw.expiresAt!=='string'||raw.expiresAt.length>40||
     !Number.isFinite(Date.parse(raw.expiresAt)))return null;
  return {name:raw.name,email:raw.email,expiresAt:raw.expiresAt};
 }
 return raw.message==='Your employee account is ready. Sign in with your work email and the password you just chose.'?
   {message:raw.message}:null;
}
export function temporaryCredentialPayload(raw:unknown):{password:string;confirmed:true}|null{
 return obj(raw)&&exact(raw,['password','confirmed'])&&password(raw.password,12)&&raw.confirmed===true?
   {password:raw.password as string,confirmed:true}:null;
}
export function temporaryCredentialStatus(raw:unknown):{name:string;email:string}|null{
 if(!obj(raw)||typeof raw.name!=='string'||!raw.name.trim()||raw.name.length>150||
   typeof raw.email!=='string'||!raw.email.trim()||raw.email.length>254)return null;
 return {name:raw.name,email:raw.email};
}
export const confirmedTemporaryReplace=(raw:unknown)=>
 obj(raw)&&raw.message==='Your personal password is set. Sign in again to open your employee workspace.';
export function sanitizedCredentialError(raw:unknown){
 if(!obj(raw))return {message:'The current invitation or credential request could not be verified.'};
 const code=typeof raw.code==='string'&&/^[A-Z][A-Z0-9_]{0,59}$/.test(raw.code)?raw.code:null;
 const message=typeof raw.message==='string'&&raw.message.length<=240?
   raw.message:'The current invitation or credential request could not be verified.';
 return {message,...(code?{code}:{})};
}

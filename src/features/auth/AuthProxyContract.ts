/** Fixed, credential-bearing Next.js -> legacy Express authentication contract. */
const obj=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const code=/^[A-Z][A-Z0-9_]{1,39}$/;
const session=/^[A-Za-z0-9_-]{32,128}$/;
type Identity={email:string;password:string;totpCode?:string;totpFactorId?:string};
export type AuthMutation=Identity & {app?:string;organizationId?:string};
export function validateAuthMutation(raw:unknown,kind:'portal'|'application'):AuthMutation|null{
 if(!obj(raw))return null;
 const allowed=kind==='portal'?
   ['email','password','totpCode','totpFactorId']:
   ['email','password','totpCode','totpFactorId','app','organizationId'];
 if(Object.keys(raw).some(k=>!allowed.includes(k)))return null;
 if(typeof raw.email!=='string'||raw.email.length>254||
   !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.email.trim())||
   typeof raw.password!=='string'||!raw.password||raw.password.length>4096)return null;
 const hasCode=Object.hasOwn(raw,'totpCode'),hasFactor=Object.hasOwn(raw,'totpFactorId');
 if(hasCode!==hasFactor||hasCode&&(
   typeof raw.totpCode!=='string'||!/^\d{6}$/.test(raw.totpCode)||
   typeof raw.totpFactorId!=='string'||!uuid.test(raw.totpFactorId)))return null;
 if(kind==='application'&&(
   typeof raw.app!=='string'||!code.test(raw.app)||
   typeof raw.organizationId!=='string'||!uuid.test(raw.organizationId)))return null;
 return {email:raw.email.trim().toLowerCase(),password:raw.password,
   ...(hasCode?{totpCode:raw.totpCode as string,totpFactorId:raw.totpFactorId as string}:{}),
   ...(kind==='application'?{app:raw.app as string,organizationId:raw.organizationId as string}:{})};
}
export type AuthSuccess='portal'|'temporary'|'application';
export function confirmedAuthResult(raw:unknown,kind:'portal'|'application',app?:string):AuthSuccess|null{
 if(!obj(raw))return null;
 if(kind==='application'){
  return app&&code.test(app)&&raw.redirect==='/apps/'+app.toLowerCase()+'/home'?'application':null;
 }
 if(raw.passwordChangeRequired===true&&raw.redirect==='/employee-password')return 'temporary';
 if(!obj(raw.user)||typeof raw.user.id!=='string'||!uuid.test(raw.user.id)||
   typeof raw.user.email!=='string'||typeof raw.user.name!=='string')return null;
 return 'portal';
}
/** Reject ambiguous/missing Set-Cookie; never relay upstream cookie attributes blindly. */
export function authenticationCookie(headers:Headers,name:string):string|null{
 const all=headers.getSetCookie();
 const values:string[]=[];
 for(const line of all){
  const match=/^([^=;\s]+)=([^;]*)/.exec(line);
  if(match?.[1]===name)values.push(match[2]);
 }
 return values.length===1&&session.test(values[0])?values[0]:null;
}
export function safeAuthError(raw:unknown){
 const message=obj(raw)&&typeof raw.message==='string'&&raw.message.length<=240?
   raw.message:'Authentication was not confirmed.';
 const codeValue=obj(raw)&&typeof raw.code==='string'&&/^[A-Z][A-Z0-9_]{0,49}$/.test(raw.code)?
   raw.code:undefined;
 const factors:{id:string;name:string}[]=[];
 if(obj(raw)&&Array.isArray(raw.factors)&&raw.factors.length<=10){
  for(const f of raw.factors){
   if(!obj(f)||typeof f.id!=='string'||!uuid.test(f.id)||
      typeof f.name!=='string'||f.name.length>100){factors.length=0;break;}
   factors.push({id:f.id,name:f.name});
  }
 }
 return {message,...(codeValue?{code:codeValue}:{}),...(factors.length?{factors}:{})};
}

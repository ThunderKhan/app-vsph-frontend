/** Fixed server-managed Outreach launch destination; no registry- or client-provided redirect. */
export function trustedOutreachStartUrl(raw:string|undefined):string|null{
 if(!raw)return null;
 try{
  const target=new URL(raw);
  const local=process.env.NODE_ENV!=='production'&&
    ['localhost','127.0.0.1'].includes(target.hostname);
  if(target.username||target.password||target.search||target.hash||
     target.pathname!=='/api/v1/sso/start'||
     !(target.protocol==='https:'||(local&&target.protocol==='http:')))return null;
  return target.toString();
 }catch{return null;}
}

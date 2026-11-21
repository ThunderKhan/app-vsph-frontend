/** Explicitly trusted Music SSO start, currently authorized customer contexts only. */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const object=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export type MusicWorkspace={id:string;name:string;role:string};
export type MusicLaunchConfig={startUrl:string;organizations:MusicWorkspace[]};
export function trustedMusicStartUrl(raw:string|undefined):string|null{
 if(!raw)return null;
 try{
  const u=new URL(raw);
  const local=process.env.NODE_ENV!=='production'&&['localhost','127.0.0.1'].includes(u.hostname);
  if(u.username||u.password||u.search||u.hash||u.port&&!(local&&u.protocol==='http:')||
    !(u.pathname.endsWith('/api/sso/start'))||!(u.protocol==='https:'||(local&&u.protocol==='http:')))
    return null;
  return u.toString();
 }catch{return null;}
}
export function parseMusicLaunch(raw:unknown,approvedUrl:string|undefined):MusicLaunchConfig|null{
 const expected=trustedMusicStartUrl(approvedUrl);
 if(!expected||!object(raw)||raw.enabled!==true||typeof raw.startUrl!=='string'||
    raw.startUrl!==expected||!Array.isArray(raw.organizations)||
    raw.organizations.length>100)return null;
 const organizations:MusicWorkspace[]=[],seen=new Set<string>();
 for(const x of raw.organizations){
  if(!object(x)||typeof x.id!=='string'||!uuid.test(x.id)||
     seen.has(x.id.toLowerCase())||typeof x.name!=='string'||!x.name.trim()||
     x.name.length>150||typeof x.role!=='string'||!x.role.trim()||x.role.length>40)return null;
  seen.add(x.id.toLowerCase());organizations.push({id:x.id,name:x.name,role:x.role});
 }
 return organizations.length?{startUrl:expected,organizations}:null;
}

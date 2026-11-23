/** Owner-controlled Outreach grants; does not implement cross-product SSO. */
const obj=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type OutreachUser={id:string;full_name:string;email:string;status:string};
export type OutreachGrant={user_id:string;full_name:string;email:string;role_code:string;status:string};
export const roles=['representative','manager','administrator','analyst'] as const;
export function parseOutreachUsers(v:unknown):OutreachUser[]|null{
 if(!obj(v)||!Array.isArray(v.users)||v.users.length>5000)return null;
 const rows:OutreachUser[]=[];
 for(const u of v.users){
  if(!obj(u)||typeof u.id!=='string'||!uuid.test(u.id)||
    typeof u.full_name!=='string'||u.full_name.length>150||
    typeof u.email!=='string'||u.email.length>254||
    typeof u.status!=='string')return null;
  if(u.status==='active')rows.push({id:u.id,full_name:u.full_name,email:u.email,status:u.status});
 }
 return rows;
}
export function parseOutreachGrants(v:unknown):OutreachGrant[]|null{
 if(!obj(v)||!Array.isArray(v.items)||v.items.length>5000)return null;
 const rows:OutreachGrant[]=[];
 for(const g of v.items){
  if(!obj(g)||typeof g.user_id!=='string'||!uuid.test(g.user_id)||
     !(g.full_name===null||g.full_name===undefined||
       typeof g.full_name==='string'&&g.full_name.length<=150)||
     !(g.email===null||g.email===undefined||typeof g.email==='string'&&g.email.length<=254)||
     typeof g.role_code!=='string'||!roles.includes(g.role_code as typeof roles[number])||
     typeof g.status!=='string'||g.status.length>50)return null;
  rows.push({user_id:g.user_id,full_name:typeof g.full_name==='string'?g.full_name:'',
    email:typeof g.email==='string'?g.email:'',role_code:g.role_code,status:g.status});
 }
 return rows;
}
export function outreachMutation(v:unknown):{userId:string;method:'PUT'|'DELETE';role:string|null}|null{
 if(!obj(v)||typeof v.userId!=='string'||!uuid.test(v.userId)||v.confirmed!==true)return null;
 if(v.action==='grant'&&Object.keys(v).length===4&&typeof v.role==='string'&&
    roles.includes(v.role as typeof roles[number]))return {userId:v.userId,method:'PUT',role:v.role};
 if(v.action==='revoke'&&Object.keys(v).length===3)return {userId:v.userId,method:'DELETE',role:null};
 return null;
}

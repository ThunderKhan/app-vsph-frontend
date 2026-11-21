/** Existing project_workspace_command GET/POST contracts; no client-side permissions grant authority. */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const record=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const isId=(x:unknown):x is string=>typeof x==='string'&&uuid.test(x);
const text=(x:unknown,max:number,min=1):x is string=>typeof x==='string'&&x.trim().length>=min&&x.length<=max&&!/[\u0000-\u001f\u007f]/.test(x);
const version=(x:unknown):x is number=>Number.isSafeInteger(x)&&(x as number)>=1&&(x as number)<=999999999;
const exact=(x:Record<string,unknown>,keys:string[])=>Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
export type WorkspaceRole='manager'|'contributor'|'viewer'|'client';
export type ChecklistItem={id:string;milestoneId:string;title:string;completed:boolean;assigneeId:string|null};
export type RiskItem={id:string;title:string;severity:'low'|'medium'|'high';status:'open'|'resolved'};
export type ResourceItem={id:string;label:string;url:string;category:string;shared:boolean};
export type WeeklyUpdate={id:string;summary:string;health:string;nextSteps:string;shared:boolean;createdAt:string};
export type ProjectWorkspaceData={checklist:ChecklistItem[];risks:RiskItem[];resources:ResourceItem[];
 updates:WeeklyUpdate[];role:WorkspaceRole;canManage:boolean};
export function parseProjectWorkspace(x:unknown):ProjectWorkspaceData|null{
 if(!record(x)||!['manager','contributor','viewer','client'].includes(String(x.role))||
   typeof x.canManage!=='boolean'||x.canManage!==(x.role==='manager')||
   !Array.isArray(x.checklist)||x.checklist.length>500||
   !Array.isArray(x.risks)||x.risks.length>100||
   !Array.isArray(x.resources)||x.resources.length>100||
   !Array.isArray(x.updates)||x.updates.length>30)return null;
 const checklist:ChecklistItem[]=[],risks:RiskItem[]=[],resources:ResourceItem[]=[],updates:WeeklyUpdate[]=[];
 const allIds=new Set<string>();
 const unseen=(type:string,id:string)=>{const key=type+':'+id.toLowerCase();
   if(allIds.has(key))return false;allIds.add(key);return true;};
 for(const row of x.checklist){
  if(!record(row)||!isId(row.id)||!unseen('checklist',row.id)||
    !isId(row.milestone_id)||!text(row.title,180)||typeof row.completed!=='boolean'||
    !(row.assignee_id===undefined||row.assignee_id===null||isId(row.assignee_id)))return null;
  checklist.push({id:row.id,milestoneId:row.milestone_id,title:row.title,completed:row.completed,
   assigneeId:typeof row.assignee_id==='string'?row.assignee_id:null});
 }
 for(const row of x.risks){
  if(!record(row)||!isId(row.id)||!unseen('risk',row.id)||!text(row.title,180)||
    !['low','medium','high'].includes(String(row.severity))||
    !['open','resolved'].includes(String(row.status)))return null;
  risks.push({id:row.id,title:row.title,severity:row.severity as RiskItem['severity'],
   status:row.status as RiskItem['status']});
 }
 for(const row of x.resources){
  if(!record(row)||!isId(row.id)||!unseen('resource',row.id)||!text(row.label,120)||
    typeof row.url!=='string'||!safeResourceUrl(row.url)||
    !['document','design','repository','deployment','other'].includes(String(row.category))||
    typeof row.shared!=='boolean')return null;
  resources.push({id:row.id,label:row.label,url:row.url,category:row.category as string,shared:row.shared});
 }
 for(const row of x.updates){
  if(!record(row)||!isId(row.id)||!unseen('update',row.id)||
    !text(row.summary,2500,8)||typeof row.health!=='string'||
    !['on_track','at_risk','off_track'].includes(row.health)||
    typeof row.next_steps!=='string'||row.next_steps.length>1500||
    typeof row.shared!=='boolean'||typeof row.created_at!=='string'||
    Number.isNaN(Date.parse(row.created_at)))return null;
  updates.push({id:row.id,summary:row.summary,health:row.health,nextSteps:row.next_steps,
   shared:row.shared,createdAt:row.created_at});
 }
 if(x.role==='client'&&risks.length)return null;
 return {checklist,risks,resources,updates,role:x.role as WorkspaceRole,canManage:x.canManage};
}
export function safeResourceUrl(input:string):boolean{
 if(input.length<12||input.length>1000)return false;
 try{const u=new URL(input);
  return u.protocol==='https:'&&!u.username&&!u.password&&
    /^[a-z0-9.-]+$/i.test(u.hostname)&&
    /^\/[a-zA-Z0-9._~%/?#=&-]*$/.test(u.pathname+u.search+u.hash);
 }catch{return false;}
}
const actions=['checklist-add','checklist-toggle','risk-add','risk-resolve',
 'resource-add','resource-archive','update-publish'] as const;
export type WorkspaceAction=typeof actions[number];
export function projectWorkspaceMutation(x:unknown):{path:string;body:Record<string,unknown>}|null{
 if(!record(x)||!isId(x.projectId)||!version(x.version)||
    !actions.includes(x.action as WorkspaceAction))return null;
 const prefix='/api/projects/'+x.projectId+'/workspace/';
 const action=x.action as WorkspaceAction;
 const rest={...x};delete rest.projectId;delete rest.action;
 let keys:string[]=[];
 if(action==='checklist-add'){keys=['version','milestoneId','title','assigneeId'];
   if(!isId(rest.milestoneId)||!text(rest.title,180)||!(rest.assigneeId===null||isId(rest.assigneeId)))return null;
 }else if(action==='checklist-toggle'){keys=['version','itemId','completed'];
   if(!isId(rest.itemId)||typeof rest.completed!=='boolean')return null;
 }else if(action==='risk-add'){keys=['version','title','severity'];
   if(!text(rest.title,180)||!['low','medium','high'].includes(String(rest.severity)))return null;
 }else if(action==='risk-resolve'){keys=['version','id','resolved'];
   if(!isId(rest.id)||typeof rest.resolved!=='boolean')return null;
 }else if(action==='resource-add'){keys=['version','label','url','category','shared'];
   if(!text(rest.label,120)||typeof rest.url!=='string'||!safeResourceUrl(rest.url)||
      !['document','design','repository','deployment','other'].includes(String(rest.category))||
      typeof rest.shared!=='boolean')return null;
 }else if(action==='resource-archive'){keys=['version','id'];
   if(!isId(rest.id))return null;
 }else if(action==='update-publish'){keys=['version','summary','health','nextSteps','shared'];
   if(!text(rest.summary,2500,8)||!text(rest.nextSteps,1500,0)||
     !['on_track','at_risk','off_track'].includes(String(rest.health))||
     typeof rest.shared!=='boolean')return null;
 }
 if(!exact(rest,keys))return null;
 return {path:prefix+action,body:rest};
}
export function projectWorkspaceWriteConfirmed(x:unknown):boolean{
 return record(x)&&isId(x.id)&&version(x.version);
}

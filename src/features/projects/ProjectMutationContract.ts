import { projectIdPattern } from './ProjectLiveContract';

export type ProjectAction =
  'project-edit'|'milestone-create'|'milestone-status'|'member-assign'|'member-remove'|'manager-grant'|'manager-revoke'|
  'task-create'|'task-assign'|'task-status'|'comment-create';
export type ValidatedMutation = {
  method:'POST'|'PATCH'; path:string; body:Record<string,unknown>;
};
const roles=new Set(['manager','contributor','viewer']);
const taskStates=new Set(['todo','in_progress','blocked','in_review','done','cancelled']);
const object=(x:unknown):x is Record<string,unknown>=>x!==null&&
  typeof x==='object'&&!Array.isArray(x);
const uuid=(x:unknown):x is string=>typeof x==='string'&&projectIdPattern.test(x);
const version=(x:unknown)=>Number.isSafeInteger(x)&&(x as number)>=1&&(x as number)<=999999999;
function exact(x:Record<string,unknown>,fields:string[]){
  return Object.keys(x).length===fields.length&&fields.every(k=>Object.hasOwn(x,k));
}
/** Trusted server adapter: tightly bounded operation allowlist, no arbitrary URL or method. */
export function projectMutation(id:string,action:string,input:unknown):ValidatedMutation|null{
  if(!uuid(id)||!object(input)||!version(input.version))return null;
  if(action==='project-edit'){
    if(!exact(input,['version','name','description','priority','dueOn'])||
      typeof input.name!=='string'||!input.name.trim()||input.name.length>150||
      typeof input.description!=='string'||input.description.length>5000||
      typeof input.priority!=='string'||!['low','normal','high','urgent'].includes(input.priority)||
      typeof input.dueOn!=='string'||(input.dueOn!==''&&!/^\d{4}-\d{2}-\d{2}$/.test(input.dueOn)))
      return null;
    return {method:'PATCH',path:'/api/projects/'+id,body:input};
  }
  if(action==='milestone-create'){
    if(!exact(input,['version','title','dueOn','shared'])||
      typeof input.title!=='string'||!input.title.trim()||input.title.length>200||
      typeof input.dueOn!=='string'||(input.dueOn!==''&&!/^\d{4}-\d{2}-\d{2}$/.test(input.dueOn))||
      input.shared!==false)return null;
    return {method:'POST',path:'/api/projects/'+id+'/milestones',body:input};
  }
  if(action==='milestone-status'){
    if(!exact(input,['version','milestoneId','status'])||!uuid(input.milestoneId)||
      typeof input.status!=='string'||
      !['planned','active','done','cancelled'].includes(input.status))return null;
    return {method:'PATCH',path:'/api/projects/'+id+'/milestones/'+input.milestoneId,
      body:{version:input.version,status:input.status}};
  }
  if(action==='member-assign'){
    if(!exact(input,['version','userId','role','team'])||!uuid(input.userId)||
      typeof input.role!=='string'||!roles.has(input.role)||
      typeof input.team!=='string'||input.team.length>100)return null;
    return {method:'POST',path:'/api/projects/'+id+'/workforce/assign',body:input};
  }
  if(['member-remove','manager-grant','manager-revoke'].includes(action)){
    if(!exact(input,['version','userId'])||!uuid(input.userId))return null;
    const route=action==='member-remove'?'remove':action;
    return {method:'POST',path:'/api/projects/'+id+'/workforce/'+route,body:input};
  }
  if(action==='task-create'){
    if(!exact(input,['version','title','description','priority','dueOn','assigneeId','milestoneId','shared'])||
      typeof input.title!=='string'||!input.title.trim()||input.title.length>200||
      typeof input.description!=='string'||input.description.length>5000||
      typeof input.priority!=='string'||!['low','normal','high','urgent'].includes(input.priority)||
      typeof input.dueOn!=='string'||(input.dueOn!==''&&!/^\d{4}-\d{2}-\d{2}$/.test(input.dueOn))||
      !(input.assigneeId===null||uuid(input.assigneeId))||
      !(input.milestoneId===null||uuid(input.milestoneId))||input.shared!==false)return null;
    return {method:'POST',path:'/api/projects/'+id+'/tasks',body:input};
  }
  if(action==='task-assign'){
    if(!exact(input,['version','taskId','assigneeId'])||!uuid(input.taskId)||
      !(input.assigneeId===null||uuid(input.assigneeId)))return null;
    return {method:'PATCH',path:'/api/projects/'+id+'/tasks/'+input.taskId,
      body:{version:input.version,assigneeId:input.assigneeId}};
  }
  if(action==='task-status'){
    if(!exact(input,['version','taskId','status'])||!uuid(input.taskId)||
      typeof input.status!=='string'||!taskStates.has(input.status))return null;
    return {method:'PATCH',path:'/api/projects/'+id+'/tasks/'+input.taskId,
      body:{version:input.version,status:input.status}};
  }
  if(action==='comment-create'){
    if(!exact(input,['version','body','taskId','shared'])||
      typeof input.body!=='string'||!input.body.trim()||input.body.length>4000||
      !(input.taskId===null||uuid(input.taskId))||
      input.shared!==false)return null;
    return {method:'POST',path:'/api/projects/'+id+'/comments',
      body:{version:input.version,body:input.body.trim(),taskId:input.taskId,shared:false}};
  }
  return null;
}

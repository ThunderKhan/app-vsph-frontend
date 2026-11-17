/** Strict, client-safe projection of the reviewed VSPH project_command(detail).
 * Every row here has already passed the server's identity/tenant authorization.
 */
export type LiveMember = {
  userId: string; name: string; role: 'manager'|'contributor'|'viewer'|'client';
  status: 'active'|'revoked'; team: string;
};
export type LiveTask = {
  id: string; title: string; description: string;
  status: 'todo'|'in_progress'|'blocked'|'in_review'|'done'|'cancelled';
  priority: 'low'|'normal'|'high'|'urgent';
  assigneeId: string|null; dueOn: string|null; shared: boolean;
};
export type LiveComment = {
  id: string; taskId: string|null; actorId: string;
  body: string; createdAt: string; shared: boolean;
};
export type LiveProject = {
  id: string; key: string; name: string; description: string;
  ownerId: string; version: number;
  status: 'planned'|'active'|'paused'|'completed'|'archived';
  role: LiveMember['role']; priority: LiveTask['priority'];
  members: LiveMember[]; tasks: LiveTask[]; comments: LiveComment[];
};
export const projectIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const statuses = new Set(['planned','active','paused','completed','archived']);
const roles = new Set(['manager','contributor','viewer','client']);
const tasks = new Set(['todo','in_progress','blocked','in_review','done','cancelled']);
const priorities = new Set(['low','normal','high','urgent']);
function obj(v: unknown): v is Record<string,unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}
function id(v: unknown): v is string {
  return typeof v === 'string' && projectIdPattern.test(v);
}
function date(v: unknown) {
  return v === null || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v));
}
/** No partial rendering, sample fallback, or tolerance for truncated writes. */
export function parseLiveProject(value: unknown): LiveProject|null {
  if(!obj(value)||!obj(value.project)||!Array.isArray(value.members)||
    !Array.isArray(value.tasks)||!Array.isArray(value.comments)||
    value.members.length>500||value.tasks.length>500||value.comments.length>200||
    typeof value.role!=='string'||!roles.has(value.role))return null;
  const p=value.project;
  if(!id(p.id)||!id(p.owner_id)||typeof p.key!=='string'||
    !/^[A-Z][A-Z0-9-]{1,19}$/.test(p.key)||
    typeof p.name!=='string'||!p.name.trim()||p.name.length>150||
    typeof p.description!=='string'||p.description.length>5000||
    !Number.isSafeInteger(p.version)||(p.version as number)<1||
    typeof p.status!=='string'||!statuses.has(p.status)||
    typeof p.priority!=='string'||!priorities.has(p.priority))return null;
  const members:LiveMember[]=[];
  const memberIds=new Set<string>();
  for(const m of value.members){
    if(!obj(m)||!id(m.user_id)||memberIds.has(m.user_id.toLowerCase())||
      typeof m.full_name!=='string'||m.full_name.length>120||
      typeof m.role!=='string'||!roles.has(m.role)||
      !['active','revoked'].includes(String(m.status))||
      typeof m.team!=='string'||m.team.length>100)return null;
    memberIds.add(m.user_id.toLowerCase());
    members.push({userId:m.user_id,name:m.full_name,role:m.role as LiveMember['role'],
      status:m.status as LiveMember['status'],team:m.team});
  }
  const work:LiveTask[]=[];
  const taskIds=new Set<string>();
  for(const t of value.tasks){
    if(!obj(t)||!id(t.id)||taskIds.has(t.id.toLowerCase())||
      typeof t.title!=='string'||!t.title.trim()||t.title.length>200||
      typeof t.description!=='string'||t.description.length>5000||
      typeof t.status!=='string'||!tasks.has(t.status)||
      typeof t.priority!=='string'||!priorities.has(t.priority)||
      !(t.assignee_id===null||id(t.assignee_id))||!date(t.due_on)||
      typeof t.shared!=='boolean')return null;
    taskIds.add(t.id.toLowerCase());
    work.push({id:t.id,title:t.title,description:t.description,
      status:t.status as LiveTask['status'],priority:t.priority as LiveTask['priority'],
      assigneeId:t.assignee_id as string|null,dueOn:t.due_on as string|null,
      shared:t.shared});
  }
  const comments:LiveComment[]=[];
  const commentIds=new Set<string>();
  for(const c of value.comments){
    if(!obj(c)||!id(c.id)||commentIds.has(c.id.toLowerCase())||
      !(c.task_id===null||id(c.task_id))||!id(c.actor_id)||
      typeof c.body!=='string'||!c.body.trim()||c.body.length>4000||
      typeof c.created_at!=='string'||Number.isNaN(Date.parse(c.created_at))||
      typeof c.shared!=='boolean')return null;
    commentIds.add(c.id.toLowerCase());
    comments.push({id:c.id,taskId:c.task_id as string|null,
      actorId:c.actor_id,body:c.body,createdAt:c.created_at,shared:c.shared});
  }
  return {id:p.id,key:p.key,name:p.name,description:p.description,
    ownerId:p.owner_id,version:p.version as number,
    status:p.status as LiveProject['status'],priority:p.priority as LiveTask['priority'],
    role:value.role as LiveMember['role'],members,tasks:work,comments};
}

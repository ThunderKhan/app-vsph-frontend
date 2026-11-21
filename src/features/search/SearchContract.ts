/** Fixed legacy project-search contract; search never includes private descriptions or people. */
export const searchKinds = ['all','project','task','milestone'] as const;
export const searchStatuses = ['planned','active','paused','completed','archived','todo','in_progress','blocked','in_review','done','cancelled'] as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cursor = /^[123]:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const date = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
const object = (v: unknown): v is Record<string,unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const keys = ['q','kind','status','projectId','organizationId','assigneeId','from','to','after'] as const;
export type SearchRow = { id:string; project_id:string; project_key:string; project_name:string; title:string; kind:'project'|'task'|'milestone'; status:string; due_on:string|null };
export type SearchPage = {results:SearchRow[];nextCursor:string|null};

export function validatedSearchParams(params: URLSearchParams): URLSearchParams | null {
  const names=[...params.keys()];
  if(names.length<1 || names.length>keys.length || new Set(names).size !== names.length ||
     names.some(k=>!keys.includes(k as typeof keys[number]))) return null;
  const q=(params.get('q')||'').trim(), kind=params.get('kind')||'all';
  if(q.length<2||q.length>100||/[\u0000-\u001f\u007f]/.test(q) ||
    !searchKinds.includes(kind as typeof searchKinds[number])) return null;
  for(const name of ['projectId','organizationId','assigneeId']) {
    const v=params.get(name);
    if(v!==null && v!=='' && !uuid.test(v))return null;
  }
  if(params.get('assigneeId') && kind!=='task') return null;
  const status=params.get('status');
  if(status && !searchStatuses.includes(status as typeof searchStatuses[number]))return null;
  for(const name of ['from','to']){
    const value=params.get(name);
    if(value && !date(value))return null;
  }
  if(params.get('from') && params.get('to') && params.get('from')!>params.get('to')!)return null;
  const after=params.get('after');
  if(after && !cursor.test(after))return null;
  const out=new URLSearchParams({q});
  if(kind!=='all')out.set('kind',kind);
  for(const key of keys){
    if(key==='q'||key==='kind')continue;
    const value=params.get(key);
    if(value)out.set(key,value);
  }
  return out;
}
export function parseSearchPage(value:unknown):SearchPage|null{
  if(!object(value)||!Array.isArray(value.results)||value.results.length>25 ||
    !(value.nextCursor===null || (typeof value.nextCursor==='string'&&cursor.test(value.nextCursor))))return null;
  const results:SearchRow[]=[];
  const seen=new Set<string>();
  for(const v of value.results){
    if(!object(v)||typeof v.id!=='string'||!uuid.test(v.id) ||
      typeof v.project_id!=='string'||!uuid.test(v.project_id)||
      typeof v.project_key!=='string'||!/^[A-Z][A-Z0-9-]{1,19}$/.test(v.project_key) ||
      typeof v.project_name!=='string'||!v.project_name.trim()||v.project_name.length>150 ||
      typeof v.title!=='string'||!v.title.trim()||v.title.length>300 ||
      !['project','task','milestone'].includes(String(v.kind)) ||
      typeof v.status!=='string'||!searchStatuses.includes(v.status as typeof searchStatuses[number]) ||
      !(v.due_on===null||(typeof v.due_on==='string'&&date(v.due_on)))||
      seen.has(String(v.kind)+':'+v.id))return null;
    seen.add(String(v.kind)+':'+v.id);
    results.push({id:v.id,project_id:v.project_id,project_key:v.project_key,project_name:v.project_name,title:v.title,kind:v.kind as SearchRow['kind'],status:v.status,due_on:v.due_on});
  }
  return {results,nextCursor:value.nextCursor};
}

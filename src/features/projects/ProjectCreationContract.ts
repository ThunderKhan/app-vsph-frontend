import { projectIdPattern } from './ProjectLiveContract';
type Organization={id:string;name:string};
export type CreationDirectory={organizations:Organization[]};
export type ProjectCreation = {
  key:string;name:string;description:string;kind:'internal'|'customer';
  customerOrganizationId:string|null;priority:'low'|'normal'|'high'|'urgent';
  startsOn:string;dueOn:string;clientVisible:boolean;products:string[];
};
function obj(x:unknown):x is Record<string,unknown>{
  return x!==null&&typeof x==='object'&&!Array.isArray(x);
}
const date=(x:unknown)=>typeof x==='string'&&(x===''||
  (/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x))));
export function parseCreationDirectory(input:unknown):CreationDirectory|null{
  if(!obj(input)||!Array.isArray(input.organizations)||input.organizations.length>200)
    return null;
  const seen=new Set<string>(),organizations:Organization[]=[];
  for(const org of input.organizations){
    if(!obj(org)||typeof org.id!=='string'||!projectIdPattern.test(org.id)||
      seen.has(org.id.toLowerCase())||typeof org.name!=='string'||
      !org.name.trim()||org.name.length>150)return null;
    seen.add(org.id.toLowerCase());
    organizations.push({id:org.id,name:org.name});
  }
  return {organizations};
}
/** Intentionally supports owner-accountable projects only; no arbitrary manager provisioning. */
export function parseProjectCreation(input:unknown):ProjectCreation|null{
  if(!obj(input))return null;
  const keys=['key','name','description','kind','customerOrganizationId','priority',
    'startsOn','dueOn','clientVisible','products'];
  if(Object.keys(input).length!==keys.length||keys.some(k=>!Object.hasOwn(input,k))||
    typeof input.key!=='string'||!/^[A-Z][A-Z0-9-]{1,19}$/.test(input.key)||
    typeof input.name!=='string'||!input.name.trim()||input.name.length>150||
    typeof input.description!=='string'||input.description.length>5000||
    !['internal','customer'].includes(String(input.kind))||
    !['low','normal','high','urgent'].includes(String(input.priority))||
    !date(input.startsOn)||!date(input.dueOn)||
    typeof input.clientVisible!=='boolean'||!Array.isArray(input.products)||
    input.products.length!==0)return null;
  if(input.kind==='internal'){
    if(input.customerOrganizationId!==null||input.clientVisible)return null;
  }else if(typeof input.customerOrganizationId!=='string'||
    !projectIdPattern.test(input.customerOrganizationId))return null;
  if(input.startsOn&&input.dueOn&&input.dueOn<input.startsOn)return null;
  return {
    key:input.key,name:input.name.trim(),description:input.description,
    kind:input.kind as ProjectCreation['kind'],
    customerOrganizationId:input.customerOrganizationId as string|null,
    priority:input.priority as ProjectCreation['priority'],startsOn:input.startsOn as string,
    dueOn:input.dueOn as string,clientVisible:input.clientVisible,products:[],
  };
}

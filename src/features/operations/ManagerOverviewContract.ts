/** Scoped, owner-only manager overview from the legacy Projects RPC. */
export type ManagerRecord={
 project_id:string;project_name:string;project_status:string;
 manager_name:string;department:string|null;
 account_status:string;linked_employee:boolean;accountable_owner:boolean;
};
const obj=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseManagerOverview(value:unknown):ManagerRecord[]|null{
 if(!obj(value)||!Array.isArray(value.managers)||value.managers.length>500)return null;
 const rows:ManagerRecord[]=[];
 for(const row of value.managers){
   if(!obj(row)||typeof row.project_id!=='string'||!uuid.test(row.project_id)||
     typeof row.project_name!=='string'||!row.project_name.trim()||row.project_name.length>150||
     typeof row.project_status!=='string'||
     !['planned','active','paused','completed','archived'].includes(row.project_status)||
     typeof row.manager_name!=='string'||!row.manager_name.trim()||row.manager_name.length>150||
     !(row.department===null||row.department===undefined||
       (typeof row.department==='string'&&row.department.length<=100))||
     typeof row.account_status!=='string'||row.account_status.length>100||
     typeof row.accountable_owner!=='boolean'||typeof row.linked_employee!=='boolean')return null;
   rows.push({project_id:row.project_id,project_name:row.project_name,project_status:row.project_status,
     manager_name:row.manager_name,department:typeof row.department==='string'?row.department:null,
     account_status:row.account_status,linked_employee:row.linked_employee as boolean,accountable_owner:row.accountable_owner});
 }
 return rows;
}

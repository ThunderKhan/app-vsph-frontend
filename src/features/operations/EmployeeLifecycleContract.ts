/** Exact legacy workforce removal and restore contracts. Backend owns authorization. */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const control=/[\u0000-\u001f\u007f]/;
const obj=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export type LifecycleAction='remove'|'restore';
export function employeeLifecycleMutation(input:unknown):{
 operation:LifecycleAction;path:string;body:{version:number;reason:string;confirmed:true};
}|null{
 if(!obj(input)||Object.keys(input).length!==5||
    !['operation','id','version','reason','confirmed'].every(k=>Object.hasOwn(input,k))||
    typeof input.operation!=='string'||!['remove','restore'].includes(input.operation)||
    typeof input.id!=='string'||!uuid.test(input.id)||
    !Number.isSafeInteger(input.version)||(input.version as number)<1||
    (input.version as number)>(input.operation==='restore'?999999999:2147483647)||
    input.confirmed!==true||typeof input.reason!=='string'||
    input.reason.trim().length<8||input.reason.length>500||control.test(input.reason))
    return null;
 return {operation:input.operation as LifecycleAction,path:'/api/employees/'+input.id+'/'+input.operation,
   body:{version:input.version as number,reason:input.reason.trim(),confirmed:true}};
}
export function confirmedLifecycleResult(x:unknown,kind:LifecycleAction,id:string):boolean{
 if(!obj(x)||x.id!==id)return false;
 if(kind==='remove')return x.removed===true&&
   typeof x.removedAt==='string'&&!Number.isNaN(Date.parse(x.removedAt));
 return x.status==='onboarding'&&x.accessRestored===false&&x.requiresNewConsent===true&&
   Number.isSafeInteger(x.version)&&(x.version as number)>0;
}
export type ArchivedWorker={id:string;fullName:string;email:string;department:string;
 jobTitle:string;version:number;removedAt:string;reason:string};
export function archivedWorkers(raw:unknown):ArchivedWorker[]|null{
 if(!obj(raw)||!Array.isArray(raw.employees)||raw.employees.length>100)return null;
 const records:ArchivedWorker[]=[],seen=new Set<string>();
 for(const row of raw.employees){
   if(!obj(row)||typeof row.id!=='string'||!uuid.test(row.id)||seen.has(row.id.toLowerCase())||
      typeof row.full_name!=='string'||!row.full_name.trim()||row.full_name.length>150||
      typeof row.email!=='string'||!row.email.trim()||row.email.length>190||
      typeof row.department!=='string'||typeof row.job_title!=='string'||
      !Number.isSafeInteger(row.version)||(row.version as number)<1||(row.version as number)>999999999||
      typeof row.removed_at!=='string'||Number.isNaN(Date.parse(row.removed_at))||
      typeof row.removal_reason!=='string'||!row.removal_reason.trim()||row.removal_reason.length>500)
       return null;
   seen.add(row.id.toLowerCase());
   records.push({id:row.id,fullName:row.full_name,email:row.email,department:row.department,
     jobTitle:row.job_title,version:row.version as number,removedAt:row.removed_at,reason:row.removal_reason});
 }
 return records;
}

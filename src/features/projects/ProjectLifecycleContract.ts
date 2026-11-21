/** Verified legacy owner-only project archive/deletion contract. */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const key=/^[A-Z][A-Z0-9-]{1,19}$/;
const object=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export type ProjectLifecycleAction='archive'|'delete';
export function projectLifecycleMutation(input:unknown):{
 path:string;body:{version:number;key:string;confirmed:true};projectId:string;operation:ProjectLifecycleAction
}|null{
 if(!object(input)||Object.keys(input).length!==5||
    !['operation','projectId','version','key','confirmed'].every(k=>Object.hasOwn(input,k))||
    !['archive','delete'].includes(String(input.operation))||
    typeof input.projectId!=='string'||!uuid.test(input.projectId)||
    typeof input.key!=='string'||!key.test(input.key)||
    !Number.isSafeInteger(input.version)||(input.version as number)<1||
    (input.version as number)>999999999||input.confirmed!==true)return null;
 return {path:'/api/projects/'+input.projectId+'/lifecycle/'+input.operation,
   body:{version:input.version as number,key:input.key,confirmed:true},
   projectId:input.projectId,operation:input.operation as ProjectLifecycleAction};
}
export function projectLifecycleConfirmed(result:unknown,action:ProjectLifecycleAction,id:string,k:string):boolean{
 if(!object(result)||result.id!==id)return false;
 if(action==='archive')return result.archived===true;
 return result.deleted===true&&result.key===k;
}

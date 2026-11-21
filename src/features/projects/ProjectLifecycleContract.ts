/** Verified legacy owner-only project archive/deletion contract. */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const key=/^[A-Z][A-Z0-9-]{1,19}$/;
const object=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export type ProjectLifecycleAction='archive'|'delete';
export function projectLifecycleMutation(input:unknown):{
 path:string;body:{version:number;key:string;confirmed:true};projectId:string;operation:ProjectLifecycleAction
}|null{
 if(!object(input))return null;
 const keys=Object.keys(input);
 if(keys.length!==5||!['operation','projectId','version','key','confirmed']
   .every(k=>Object.hasOwn(input,k)))return null;
 const {operation,projectId,version,confirmed}=input;
 const projectKey=input.key;
 if((operation!=='archive'&&operation!=='delete')||
   typeof projectId!=='string'||!uuid.test(projectId)||
   typeof projectKey!=='string'||!key.test(projectKey)||
   typeof version!=='number'||!Number.isSafeInteger(version)||
   version<1||version>999999999||confirmed!==true)return null;
 return {path:'/api/projects/'+projectId+'/lifecycle/'+operation,
   body:{version,key:projectKey,confirmed:true},
   projectId,operation};
}
export function projectLifecycleConfirmed(result:unknown,action:ProjectLifecycleAction,id:string,k:string):boolean{
 if(!object(result)||result.id!==id)return false;
 if(action==='archive')return result.archived===true;
 return result.deleted===true&&result.key===k;
}

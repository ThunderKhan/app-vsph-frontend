/** Preserve entitlement instants when editing unrelated subscription terms.
 * datetime-local carries wall-clock minutes without timezone or seconds.
 * Convert only if the user actually changed the displayed wall time.
 */
const pad=(n:number)=>String(n).padStart(2,'0');
export function entitlementDateInput(value:string|null):string{
 if(!value)return '';
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))return '';
 return [date.getFullYear(),pad(date.getMonth()+1),pad(date.getDate())].join('-')+
   'T'+pad(date.getHours())+':'+pad(date.getMinutes());
}
export function entitlementDateValue(
 input:string,original:string|null
):{valid:boolean;value:string|null}{
 if(input==='')return {valid:true,value:null};
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input))
   return {valid:false,value:null};
 if(original!==null&&input===entitlementDateInput(original)){
   const preserved=new Date(original);
   if(!Number.isFinite(preserved.getTime()))return {valid:false,value:null};
   return {valid:true,value:preserved.toISOString()};
 }
 const parsed=new Date(input);
 if(!Number.isFinite(parsed.getTime())||entitlementDateInput(parsed.toISOString())!==input)
   return {valid:false,value:null};
 return {valid:true,value:parsed.toISOString()};
}

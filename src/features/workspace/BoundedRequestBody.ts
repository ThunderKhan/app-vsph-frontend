/**
 * Read a Request body without buffering unbounded chunked uploads.
 * The limit is in UTF-8 bytes; abort consumption as soon as it is crossed.
 */
export async function readBoundedRequestText(request:Request,limit:number):Promise<string|null>{
 const reader=request.body?.getReader();
 if(!reader)return '';
 const chunks:Uint8Array[]=[];
 let total=0;
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   total+=value.byteLength;
   if(total>limit){await reader.cancel();return null;}
   chunks.push(value);
  }
  const bytes=new Uint8Array(total);
  let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 }finally{reader.releaseLock();}
}

/** Native JSON property semantics, with bounded pieces for accepted histories. */
function* fuelExportParts(run){
 const property=(key,value)=>{
  const text=JSON.stringify({[key]:value});
  return text==='{}'?null:text.slice(1,-1);
 };
 function* history(values){
  yield '[';
  for(let i=0;i<values.length;i++){
   const key=String(i),entry=property(key,values[i]);
   // A keyed wrapper preserves toJSON(index); omitted array entries become null.
   yield (i?',':'')+(entry===null?'null':entry.slice(JSON.stringify(key).length+1));
  }
  yield ']';
 }
 function* record(value,path){
  yield '{';let first=true;
  for(const key of Object.keys(value)){
   const field=value[key];let nested;
   if(path==='transport'&&['checkpoints','snapshots'].includes(key)&&Array.isArray(field))nested=history(field);
   else if((path==='root'&&key==='result'||path==='result'&&key==='transport')&&field&&typeof field==='object'&&!Array.isArray(field))nested=record(field,key);
   else{
    const text=property(key,field);if(text===null)continue;
    yield (first?'':',')+text;first=false;continue;
   }
   yield (first?'':',')+`${JSON.stringify(key)}:`;first=false;yield* nested;
  }
  yield '}';
 }
 yield* record(run,'root');
}

/** Preserve the synchronous Interactive JSON download. */
export function fuelExportBlob(run){
 const parts=[];
 for(const piece of fuelExportParts(run))parts.push(new Blob([piece]));
 return new Blob(parts,{type:'application/json'});
}

/** Compress refined histories directly; never retain their uncompressed bytes. */
export async function fuelExportGzipBlob(run,{signal}={}){
 signal?.throwIfAborted();
 const compression=new CompressionStream('gzip'),writer=compression.writable.getWriter(),reader=compression.readable.getReader();
 const parts=[],encoder=new TextEncoder();
 const abort=()=>{
  void writer.abort(signal.reason).catch(()=>{});
  void reader.cancel(signal.reason).catch(()=>{});
 };
 signal?.addEventListener('abort',abort,{once:true});
 // Drain concurrently: awaiting all writes before reading can deadlock under
 // TransformStream backpressure, even when every individual piece is bounded.
 const drained=(async()=>{
  while(true){const {done,value}=await reader.read();if(done)return;parts.push(value);}
 })();
 void drained.catch(()=>{});
 const yieldTask=()=>new Promise(resolve=>setTimeout(resolve,0));
 try{
  await yieldTask();let batchBytes=0;
  for(const piece of fuelExportParts(run)){
   signal?.throwIfAborted();
   const bytes=encoder.encode(piece);await writer.write(bytes);batchBytes+=bytes.byteLength;
   if(batchBytes>=1024*1024){await yieldTask();batchBytes=0;}
  }
  await writer.close();await drained;signal?.throwIfAborted();
  return new Blob(parts,{type:'application/gzip'});
 }catch(error){
  await Promise.allSettled([writer.abort(error),reader.cancel(error),drained]);throw error;
 }finally{
  signal?.removeEventListener('abort',abort);writer.releaseLock();reader.releaseLock();
 }
}

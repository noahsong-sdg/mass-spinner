import test from 'node:test';
import assert from 'node:assert/strict';
import {fuelExportBlob,fuelExportGzipBlob} from '../src/fuel-export.js';

test('chunked fuel export has exactly the native JSON bytes, schema and property order',async()=>{
 const cases=[
  {model:'marathon-centrifuge',result:{schemaVersion:1,config:{pair:'lithium'},transport:{cells:2,snapshots:[{timeS:0},{timeS:1}],checkpoints:[{timeS:0,lightMass:[.5,.5]},{timeS:1,lightMass:[.4,.6]}]}},producingCode:null},
  {producingCode:undefined,result:{before:undefined,transport:{checkpoints:[undefined,null,{omitted:undefined,values:[undefined,NaN,Infinity,-0],text:'quote" slash\\ newline\n π'}],omitted:undefined,snapshots:[,{timeS:0}],after:1},after:false},model:'marathon-centrifuge',omitted:undefined},
  {model:'marathon-centrifuge',result:{transport:undefined,empty:[],nullable:null}},
  {model:'marathon-centrifuge',result:{transport:{checkpoints:undefined,snapshots:[],metadata:{toJSON(key:string){return {key};}}}}},
  {model:'marathon-centrifuge',result:undefined,producingCode:null},
 ];
 for(const run of cases){
  const expected=JSON.stringify(run),blob=fuelExportBlob(run);
  assert.equal(blob.type,'application/json');assert.equal(await blob.text(),expected);
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()),new TextEncoder().encode(expected));
 }
});

test('fuel export never stringifies the whole run, transport or accepted-history arrays',async t=>{
 const checkpoints=Array.from({length:1000},(_,i)=>({timeS:i/1000,lightMass:[.25,.75],thermal:{cellEnergyJ:[i,1],temperatureK:[500,501]}}));
 const snapshots=[{timeS:0,profiles:[{radiusM:0}]},{timeS:1,profiles:[{radiusM:1}]}];
 const transport={cells:2,checkpoints,snapshots},result={schemaVersion:1,transport},run={model:'marathon-centrifuge',result,producingCode:null};
 const stringify=JSON.stringify,NativeBlob=globalThis.Blob,expected=stringify(run);
 const forbidden=new Set<unknown>([run,result,transport,checkpoints,snapshots]),states=new Set<unknown>([...checkpoints,...snapshots]);
 let stateWaitingForBlob=false,stateCalls=0,maximumString=0;
 JSON.stringify=((value:unknown,...args:any[])=>{
  const children=value&&typeof value==='object'?Object.values(value):[];
  assert.equal(forbidden.has(value)||children.some(child=>forbidden.has(child)),false,'A whole fuel result/history reached JSON.stringify.');
  const state=states.has(value)||children.some(child=>states.has(child));
  if(state){assert.equal(stateWaitingForBlob,false,'A serialized state was retained as text until the next state.');stateWaitingForBlob=true;stateCalls++;}
  const text=(stringify as any)(value,...args);maximumString=Math.max(maximumString,text?.length??0);return text;
 }) as typeof JSON.stringify;
 globalThis.Blob=class extends NativeBlob{
  constructor(parts:BlobPart[]=[],options?:BlobPropertyBag){super(parts,options);if(parts.some(part=>typeof part==='string'))stateWaitingForBlob=false;}
 };
 t.after(()=>{JSON.stringify=stringify;globalThis.Blob=NativeBlob;});
 const blob=fuelExportBlob(run);
 assert.equal(stateCalls,checkpoints.length+snapshots.length);assert.equal(stateWaitingForBlob,false);assert.ok(maximumString<1000);
 assert.equal(await blob.text(),expected);assert.equal(JSON.parse(await blob.text()).result.transport.checkpoints.length,1000);
});

test('refined gzip decompresses to exact native JSON bytes including omitted and sparse values',async()=>{
 const run={model:'marathon-centrifuge',result:{omitted:undefined,transport:{cells:2,
  checkpoints:[{timeS:0,text:'π " \\ \n',values:[undefined,NaN]},undefined,{timeS:1}],snapshots:[,{timeS:0}],
  metadata:{toJSON(key:string){return {key};}}}},producingCode:null};
 const blob=await fuelExportGzipBlob(run);assert.equal(blob.type,'application/gzip');
 const bytes=new Uint8Array(await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
 assert.deepEqual(bytes,new TextEncoder().encode(JSON.stringify(run)));
 const controller=new AbortController();controller.abort();
 await assert.rejects(fuelExportGzipBlob(run,{signal:controller.signal}),{name:'AbortError'});
});

test('gzip drains zero-buffer backpressure concurrently and yields browser tasks without an uncompressed Blob',{timeout:5000},async t=>{
 const NativeCompression=globalThis.CompressionStream,NativeBlob=globalThis.Blob;
 // A zero-buffer transform cannot complete a write until its reader drains.
 // Identity output isolates scheduling/backpressure from native codec timing.
 globalThis.CompressionStream=class{
  readable;writable;
  constructor(format:string){assert.equal(format,'gzip');const stream=new TransformStream(undefined,{highWaterMark:1},{highWaterMark:0});this.readable=stream.readable;this.writable=stream.writable;}
 } as any;
 globalThis.Blob=class extends NativeBlob{
  constructor(parts:BlobPart[]=[],options?:BlobPropertyBag){assert.equal(options?.type,'application/gzip');assert.ok(parts.every(part=>part instanceof Uint8Array));super(parts,options);}
 };
 let heartbeat=0;const timer=setInterval(()=>heartbeat++,0);
 t.after(()=>{clearInterval(timer);globalThis.CompressionStream=NativeCompression;globalThis.Blob=NativeBlob;});
 const run={model:'marathon-centrifuge',result:{transport:{checkpoints:Array.from({length:1000},(_,i)=>({timeS:i,payload:'a'.repeat(4096)})),snapshots:[]}}};
 const blob=await fuelExportGzipBlob(run);
 assert.ok(heartbeat>=3,'Preparation must yield repeatedly to real browser tasks.');
 assert.equal(await blob.text(),JSON.stringify(run));
});

test('mid-stream abort cancels a pending write and concurrent drain without constructing a Blob',{timeout:5000},async t=>{
 const NativeCompression=globalThis.CompressionStream,NativeBlob=globalThis.Blob,stringify=JSON.stringify;
 const controller=new AbortController(),states=[{timeS:0},{timeS:1},{timeS:2}];
 let serializedStates=0,pendingWrite=false,abortedWhileWriting=false,writerAborts=0,readerCancels=0,blobs=0;
 JSON.stringify=((value:unknown,...args:any[])=>{
  if(value&&typeof value==='object'&&Object.values(value).some(child=>states.includes(child as any)))serializedStates++;
  return (stringify as any)(value,...args);
 }) as typeof JSON.stringify;
 globalThis.Blob=class extends NativeBlob{constructor(parts:BlobPart[]=[],options?:BlobPropertyBag){blobs++;super(parts,options);}};
 globalThis.CompressionStream=class{
  readable;writable;
  constructor(){
   const stream=new TransformStream({transform(chunk,output){
    if(new TextDecoder().decode(chunk).includes('"timeS":1')){
     assert.ok(serializedStates>1);assert.equal(pendingWrite,true);abortedWhileWriting=true;controller.abort();return;
    }
    output.enqueue(chunk);
   }},{highWaterMark:1},{highWaterMark:0});
   this.writable={getWriter(){const writer=stream.writable.getWriter();return {
    write(bytes:Uint8Array){pendingWrite=true;return writer.write(bytes).finally(()=>{pendingWrite=false;});},
    abort(reason:unknown){writerAborts++;return writer.abort(reason);},close:()=>writer.close(),releaseLock:()=>writer.releaseLock(),
   };}};
   this.readable={getReader(){const reader=stream.readable.getReader();return {
    read:()=>reader.read(),cancel(reason:unknown){readerCancels++;return reader.cancel(reason);},releaseLock:()=>reader.releaseLock(),
   };}};
  }
 } as any;
 t.after(()=>{globalThis.CompressionStream=NativeCompression;globalThis.Blob=NativeBlob;JSON.stringify=stringify;});
 await assert.rejects(fuelExportGzipBlob({result:{transport:{checkpoints:states,snapshots:[]}}},{signal:controller.signal}),{name:'AbortError'});
 assert.equal(abortedWhileWriting,true);assert.ok(writerAborts>0&&readerCancels>0);assert.equal(pendingWrite,false);assert.equal(blobs,0);
});

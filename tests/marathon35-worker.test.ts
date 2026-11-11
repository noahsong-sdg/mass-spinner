import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker as NodeWorker} from 'node:worker_threads';
import {requestSimulation} from '../src/worker-client.ts';
import {simulateCoupledTarget,DEFAULT_COUPLED_TARGET} from '../src/coupled-target.ts';
import {DEFAULT_FUSION_BEAM} from '../src/fusion-reactor.ts';

const beam={...DEFAULT_FUSION_BEAM,stoppingModel:'geant4-bragg' as const,materialColumnM2:1e21,targetColumnM2:7e20,exposureS:.01};
const config={...DEFAULT_COUPLED_TARGET,depthCells:4,backingCells:4,cooldownS:0};
const record={id:42,kind:'coupled-target',schemaVersion:1,beam,config};

function fake(){
 let terminated=0;const sent:unknown[]=[];
 const worker={onmessage:null as null|((event:{data:unknown})=>void),onerror:null as null|(()=>void),postMessage(value:unknown){sent.push(value);},terminate(){terminated++;}};
 return {worker,create:()=>worker as unknown as Worker,terminated:()=>terminated,sent};
}

test('coupled client rejects wrong, stale or missing response identity without changing legacy requests',async()=>{
 for(const reply of [{id:41,kind:'coupled-target',schemaVersion:1,result:42},{id:'42',kind:'coupled-target',schemaVersion:1,result:42},
  {id:42,kind:'orbit',schemaVersion:1,result:42},{id:42,kind:'coupled-target',schemaVersion:2,result:42},
  {id:42,kind:'coupled-target',result:42},null]){
  const f=fake(),task=requestSimulation(record,undefined,f.create),failure=assert.rejects(task,/Unsupported coupled-target worker response/);
  f.worker.onmessage!({data:reply});await failure;assert.equal(f.terminated(),1);
 }
 const legacy=fake(),task=requestSimulation({id:7,kind:'orbit'},undefined,legacy.create);
 legacy.worker.onmessage!({data:{result:99}});assert.equal(await task,99);assert.equal(legacy.terminated(),1);
});

test('coupled abort, worker errors and post failures settle and terminate exactly once',async()=>{
 const old=fake(),abort=new AbortController(),task=requestSimulation(record,abort.signal,old.create),failure=assert.rejects(task,{name:'AbortError'});
 abort.abort();await failure;assert.equal(old.terminated(),1);assert.deepEqual(old.sent,[record]);
 const posted=fake();posted.worker.postMessage=()=>{throw new Error('Structured clone failed');};
 await assert.rejects(requestSimulation(record,undefined,posted.create),/Structured clone failed/);assert.equal(posted.terminated(),1);
 const broken=fake(),failed=requestSimulation(record,undefined,broken.create),rejection=assert.rejects(failed,/Physics worker failed/);
 broken.worker.onerror!();await rejection;assert.equal(broken.terminated(),1);
 const model=fake(),invalid=requestSimulation(record,undefined,model.create),modelRejection=assert.rejects(invalid,/Invalid target/);
 model.worker.onmessage!({data:{id:42,kind:'coupled-target',schemaVersion:1,error:'Invalid target'}});await modelRejection;assert.equal(model.terminated(),1);
});

function actualWorker(){
 const worker=new NodeWorker(new URL('./fixtures/marathon35-worker-bridge.mjs',import.meta.url),{execArgv:[]});
 const adapter={onmessage:null as null|((event:{data:unknown})=>void),onerror:null as null|(()=>void),
  postMessage(value:unknown){worker.postMessage(value);},terminate(){void worker.terminate();}};
 worker.on('message',data=>adapter.onmessage?.({data}));worker.on('error',()=>adapter.onerror?.());
 return adapter as unknown as Worker;
}

test('actual worker handler reproduces the direct target result through the real cancellable client',async()=>{
 const result=await requestSimulation(record,undefined,actualWorker);
 assert.deepEqual(result,simulateCoupledTarget(beam,config));
});

test('actual worker handler returns versioned model errors and rejects unsupported request versions',async()=>{
 await assert.rejects(requestSimulation({...record,config:{...config,replacementProbability:2}},undefined,actualWorker),/finite physical coefficients/);
 await assert.rejects(requestSimulation({...record,schemaVersion:2},undefined,actualWorker),/Unsupported coupled-target worker protocol/);
 for(const id of [undefined,null,-1,Number.MAX_SAFE_INTEGER+1])
  await assert.rejects(requestSimulation({...record,id},undefined,actualWorker),/Unsupported coupled-target worker protocol/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {requestSimulation} from '../src/worker-client.js';
function fixture(){
 const sent:unknown[]=[];let terminated=0;
 const worker={onmessage:null as null|((event:{data:unknown})=>void),onerror:null as null|(()=>void),postMessage:(value:unknown)=>sent.push(value),terminate:()=>terminated++};
 return {worker,sent,terminated:()=>terminated,create:()=>worker as unknown as Worker};
}
test('superseded requests terminate and reject while a new request independently completes',async()=>{
 const old=fixture(),current=fixture(),abort=new AbortController();
 const a=requestSimulation({id:1},abort.signal,old.create);
 const rejection=assert.rejects(a,{name:'AbortError'});abort.abort();await rejection;
 assert.equal(old.terminated(),1);assert.deepEqual(old.sent,[{id:1}]);
 const b=requestSimulation({id:2},undefined,current.create);current.worker.onmessage!({data:{result:42}});
 assert.equal(await b,42);assert.equal(current.terminated(),1);
});
test('pre-aborted tasks allocate no worker; worker and model errors settle promises',async()=>{
 const f=fixture(),signal=AbortSignal.abort();await assert.rejects(requestSimulation({},signal,()=>{throw new Error('Should not allocate');}),{name:'AbortError'});
 const a=requestSimulation({},undefined,f.create);f.worker.onmessage!({data:{error:'Invalid physical domain'}});await assert.rejects(a,/Invalid physical domain/);
 const g=fixture(),b=requestSimulation({},undefined,g.create);g.worker.onerror!();await assert.rejects(b,/Physics worker failed/);assert.equal(g.terminated(),1);
});
test('centrifuge accepts only its matching versioned worker response',async()=>{
 for(const response of [{id:7,kind:'fuel-centrifuge',schemaVersion:1,result:42},{id:6,kind:'fuel-centrifuge',schemaVersion:1,result:42},{id:7,kind:'orbit',schemaVersion:1,result:42},{id:7,kind:'fuel-centrifuge',schemaVersion:2,result:42}]){
  const f=fixture(),pending=requestSimulation({id:7,kind:'fuel-centrifuge',schemaVersion:1},undefined,f.create);
  if(response.id===7&&response.kind==='fuel-centrifuge'&&response.schemaVersion===1){f.worker.onmessage!({data:response});assert.equal(await pending,42);}
  else{const rejected=assert.rejects(pending,/Unsupported fuel-centrifuge/);f.worker.onmessage!({data:response});await rejected;}
  assert.equal(f.terminated(),1);
 }
});

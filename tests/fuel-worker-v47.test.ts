import test,{beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE} from '../src/fuel-centrifuge.js';

// Node's test runner isolates this file in its own process; exercise actual worker
// dispatch rather than mocking the numerical reply or the worker-client adapter.
const messages:any[]=[];
const surface={onmessage:null as null|((event:{data:unknown})=>void),postMessage:(value:any)=>messages.push(value)};
(globalThis as unknown as {self:typeof surface}).self=surface;
await import('../src/worker.js');
beforeEach(()=>{messages.length=0;});
function dispatch(data:unknown){surface.onmessage!({data});assert.equal(messages.length,1);return messages[0];}
test('actual worker evolves current history and thermal state and continues at an accepted cursor',()=>{
 const operation={schemaVersion:1,events:[{timeS:.4,currentA:0}],thermal:{enabled:true,wallCapacityJK:10,gasWallWK:.1,coolingWK:1,coolantK:500}};
 const request={id:5101,kind:'fuel-centrifuge',schemaVersion:1,config:DEFAULT_FUEL_CENTRIFUGE,includeTransport:true,operation};
 const initial=dispatch(request);assert.equal(initial.error,undefined);const past=initial.result.transport;
 assert.equal(past.snapshots.at(-1).currentA,0);assert.ok(past.snapshots.at(-1).neutralRadS>0);assert.ok(past.snapshots.at(-1).thermal.gasK>500);
 messages.length=0;const resumed=dispatch({...request,id:5102,operation:{...operation,events:[...operation.events,{timeS:.6,currentA:.02}]},resume:{transport:past,timeS:.6}});
 assert.equal(resumed.error,undefined);assert.equal(resumed.result.transport.snapshots.find((s:any)=>s.timeS===.6).currentA,.02);
 messages.length=0;const invalid=dispatch({...request,id:5103,operation:{...operation,events:[{timeS:.4,currentA:-1}]}});assert.match(invalid.error,/Current events/);assert.equal(invalid.result,undefined);
});

test('actual fuel worker includes conservative finite-time transport only when requested',()=>{
 for(const includeTransport of [true,false]){
  messages.length=0;
  const reply=dispatch({id:4701,kind:'fuel-centrifuge',schemaVersion:1,config:DEFAULT_FUEL_CENTRIFUGE,includeTransport});
  assert.equal(reply.error,undefined);assert.equal(reply.id,4701);assert.equal(reply.kind,'fuel-centrifuge');assert.equal(reply.schemaVersion,1);
  assert.deepEqual(reply.result.config,DEFAULT_FUEL_CENTRIFUGE);
  assert.equal(Object.hasOwn(reply.result,'transport'),includeTransport);
  if(includeTransport){
   const transport=reply.result.transport;
   assert.equal(transport.schemaVersion,1);assert.equal(transport.durationS,DEFAULT_FUEL_CENTRIFUGE.durationS);
   assert.ok(transport.snapshots.length>1);assert.ok(transport.maxBalanceError<2e-8);
   assert.ok(transport.snapshots.every((p:any)=>p.balances.minimumMass>=0&&p.balances.boundaryFlux===0));
  }
 }
});

test('actual operating-map worker returns its typed schema and selected full configurations',()=>{
 const reply=dispatch({id:4702,kind:'fuel-operating-map',schemaVersion:1,config:DEFAULT_FUEL_CENTRIFUGE,options:{size:3,metric:'power'}});
 assert.equal(reply.error,undefined);assert.equal(reply.id,4702);assert.equal(reply.kind,'fuel-operating-map');assert.equal(reply.schemaVersion,1);
 assert.equal(reply.result.schemaVersion,1);assert.equal(reply.result.metric,'power');assert.equal(reply.result.points.length,9);
 for(const point of reply.result.points){
  assert.equal(point.config.magneticT,point.x);assert.equal(point.config.currentA,point.y);
  assert.ok(point.status==='valid'||point.status==='invalid');
 }
});

test('actual fuel worker rejects invalid protocol versions and request identities for both typed kinds',()=>{
 for(const kind of ['fuel-centrifuge','fuel-operating-map'])for(const invalid of [{schemaVersion:2},{schemaVersion:undefined},{id:-1},{id:1.5},{id:NaN}]){
  messages.length=0;
  const reply=dispatch({id:4703,kind,schemaVersion:1,config:DEFAULT_FUEL_CENTRIFUGE,...invalid});
  assert.equal(reply.kind,kind);assert.equal(reply.schemaVersion,1);assert.equal(reply.result,undefined);
  assert.match(reply.error,new RegExp(`Unsupported ${kind} worker protocol`));
 }
 messages.length=0;
 const unknown=dispatch({id:4704,kind:'fuel-map-obsolete',schemaVersion:1,config:DEFAULT_FUEL_CENTRIFUGE});
 assert.match(unknown.error,/Unknown simulation kind/);assert.equal(unknown.result,undefined);
});

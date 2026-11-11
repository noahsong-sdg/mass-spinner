import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge,rotorResponse} from '../src/fuel-centrifuge.js';
import {simulateFuelOperation} from '../src/fuel-operation.js';

const operation={schemaVersion:1 as const,events:[]};

test('endpoint continuation retains resolution diagnostics for its unchanged accepted prefix',()=>{
 const rotor=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,durationS:.1});
 const options={cells:8,steps:32};
 const previous=simulateFuelOperation(rotor,operation,options);
 const next=simulateFuelOperation(rotor,{schemaVersion:1,events:[{timeS:.1,currentA:0}]},options,{transport:previous,timeS:.1});
 assert.ok(previous.maxCellExponent>0);
 assert.ok(previous.maxCouplingIterations>0);
 assert.equal(next.maxCellExponent,previous.maxCellExponent,'An endpoint switch has not removed any of the previously solved trajectory.');
 assert.equal(next.maxCouplingIterations,previous.maxCouplingIterations);
});

test('endpoint continuation rejects negative normalized species inventory before any new advance',()=>{
 const rotor=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA:0,durationS:.1});
 const options={cells:4,steps:8};
 const previous=simulateFuelOperation(rotor,operation,options);
 previous.snapshots.at(-1)!.lightMass=[-.01,.51,.25,.25];
 assert.throws(()=>simulateFuelOperation(rotor,operation,options,{transport:previous,timeS:.1}),RangeError);
});

test('endpoint continuation rejects a nonfinite accepted phase instead of exporting an invalid trajectory',()=>{
 const rotor=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA:0,durationS:.1});
 const options={cells:4,steps:8};
 const previous=simulateFuelOperation(rotor,operation,options);
 previous.snapshots.at(-1)!.ionPhaseRad=NaN;
 assert.throws(()=>simulateFuelOperation(rotor,operation,options,{transport:previous,timeS:.1}),RangeError);
});

test('legacy endpoint continuation rejects a missing required energy-ledger field',()=>{
 const rotor=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA:0,durationS:.1});
 const options={cells:4,steps:8};
 const previous=simulateFuelOperation(rotor,operation,options);
 delete previous.checkpoints;
 delete (previous.snapshots.at(-1)!.energy as Partial<typeof previous.snapshots[number]['energy']>).driveWorkJ;
 assert.throws(()=>simulateFuelOperation(rotor,operation,options,{transport:previous,timeS:.1}),RangeError);
});

test('legacy endpoint continuation rejects nonfinite fallback resolution bounds',()=>{
 const rotor=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA:0,durationS:.1});
 const options={cells:4,steps:8};
 const previous=simulateFuelOperation(rotor,operation,options);
 delete previous.checkpoints;
 for(const snapshot of previous.snapshots)delete snapshot.resolution;
 previous.maxCellExponent=NaN;
 assert.throws(()=>simulateFuelOperation(rotor,operation,options,{transport:previous,timeS:.1}),RangeError);
});

test('neighboring current events and exact-grid switches preserve a finite conserved trajectory',()=>{
 const rotor=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,durationS:1});
 const solved=simulateFuelOperation(rotor,{schemaVersion:1,events:[
  {timeS:0,currentA:0},{timeS:.5,currentA:.03},{timeS:.5+Number.EPSILON,currentA:0},{timeS:1,currentA:.02}
 ]},{cells:8,steps:16});
 assert.ok(solved.snapshots.every(s=>s.balances.minimumMass>=0&&Number.isFinite(s.ionPhaseRad)&&Number.isFinite(s.neutralPhaseRad)));
 assert.ok(solved.maxBalanceError<2e-8&&solved.maxEnergyRelativeError<2e-8&&solved.maxAngularMomentumRelativeError<2e-8);
 assert.equal(solved.snapshots.at(-1)!.currentA,.02);
 assert.equal(solved.snapshots.at(-1)!.timeS,1);
});

test('actual worker does not veto safe pulse/coast history using an unphysical constant-current counterfactual',async()=>{
 const messages:any[]=[];
 const surface={onmessage:null as null|((event:{data:unknown})=>void),postMessage:(value:any)=>messages.push(value)};
 (globalThis as unknown as {self:typeof surface}).self=surface;
 await import('../src/worker.js');
 const config={...DEFAULT_FUEL_CENTRIFUGE,radiusM:.05,lengthM:.2,pressurePa:1,gasK:2000,
  ionFraction:.48,collisionHz:1e6,dragHz:.01,magneticT:.5,currentA:.01,durationS:60};
 surface.onmessage!({data:{id:5201,kind:'fuel-centrifuge',schemaVersion:1,config,includeTransport:true,
  operation:{schemaVersion:1,events:[{timeS:.001,currentA:0}]}}});
 assert.equal(messages.length,1);
 assert.equal(messages[0].error,undefined,'A switched-off drive must not be extrapolated through the whole coastdown horizon.');
 const samples=messages[0].result.transport.snapshots;
 assert.ok(samples.every((s:any)=>Math.abs(s.ionRadS*config.radiusM)<299792458*.01));
 assert.equal(samples.at(-1).currentA,0);
 assert.equal(samples.at(-1).timeS,60);
});

test('scheduled reference superposes exact mechanics while switched-off power vanishes immediately',()=>{
 const config={...DEFAULT_FUEL_CENTRIFUGE,durationS:1};
 const original=simulateFuelCentrifuge(config);
 const reference=simulateFuelCentrifuge(config,[{timeS:.123,currentA:0}]);
 const m=original.mechanics,end=reference.samples.at(-1)!;
 const on=rotorResponse(m.ii,m.nn,m.gamma,m.drag,m.torque,1);
 const off=rotorResponse(m.ii,m.nn,m.gamma,m.drag,-m.torque,1-.123);
 assert.ok(Math.abs(end.ionRadS-(on.ion+off.ion))<1e-9);
 assert.ok(Math.abs(end.neutralRadS-(on.neutral+off.neutral))<1e-9);
 const atCut=reference.samples.find(sample=>sample.timeS===.123)!;
 assert.ok(atCut.ionRadS>0&&atCut.neutralRadS>0);
 assert.equal(atCut.mechanicalW,0);assert.equal(atCut.ohmicW,0);
 assert.equal(reference.mechanics.torque,m.torque,'Setup identity keeps the initial-current torque.');
 assert.equal(reference.mechanics.ohmicW,m.ohmicW);
 assert.equal(reference.mechanics.requiredCoolingW,end.slipW+end.dragW+reference.mechanics.linerHeatW);
});

test('scheduled reference starts from zero current and preserves the no-event sample contract',()=>{
 assert.equal(simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,durationS:0}).samples.length,101);
 const config={...DEFAULT_FUEL_CENTRIFUGE,currentA:0,durationS:.1};
 const reference=simulateFuelCentrifuge(config,[{timeS:.05,currentA:.02}]);
 assert.equal(reference.samples.find(sample=>sample.timeS===.05)!.ionRadS,0);
 assert.ok(reference.samples.at(-1)!.ionRadS>0);
 assert.ok(reference.samples.every(sample=>Number.isFinite(sample.totalInputW)));
});

test('direct scheduled-reference API rejects malformed or out-of-domain events',()=>{
 for(const events of [
  [{timeS:.2,currentA:.03},{timeS:.1,currentA:0}],
  [{timeS:-.1,currentA:0}],[{timeS:2,currentA:0}],
  [{timeS:.1,currentA:.201}],[{timeS:.1,currentA:NaN}],
  Array.from({length:129},(_,i)=>({timeS:i/129,currentA:0})),
 ])assert.throws(()=>simulateFuelCentrifuge(DEFAULT_FUEL_CENTRIFUGE,events),RangeError);
});

test('scheduled-reference guard catches an early overspeed pulse even when the rotor later stops',()=>{
 const config={...DEFAULT_FUEL_CENTRIFUGE,radiusM:.05,lengthM:.2,pressurePa:.0001,gasK:2000,
  ionFraction:.48,collisionHz:1e6,dragHz:100,currentA:0,durationS:60};
 assert.throws(()=>simulateFuelCentrifuge(config,[{timeS:.1,currentA:.2},{timeS:.101,currentA:0}]),/nonrelativistic/);
});

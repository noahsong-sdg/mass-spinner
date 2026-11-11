import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {DEFAULT_FUEL_THERMAL,simulateFuelOperation} from '../src/fuel-operation.js';
import {sampleFuelTransport} from '../src/fuel-transport.js';
import {fuelLinerState} from '../src/fuel-thermal.js';

const config={...DEFAULT_FUEL_CENTRIFUGE,currentA:.01,gasK:500,linerK:1000,durationS:.2};
const thermal={...DEFAULT_FUEL_THERMAL,enabled:true,spatial:{material:'tungsten' as const,thicknessM:.004,cells:12}};
const operation={schemaVersion:1 as const,thermal,events:[{timeS:.08,currentA:0},{timeS:.14,currentA:.005}]};
const run=(steps=64)=>simulateFuelOperation(simulateFuelCentrifuge(config,operation.events),operation,{cells:8,steps});

test('spatial operation closes mechanical and total energy through cut, coast and restart',()=>{
 const result=run();
 assert.ok(result.maxEnergyRelativeError<2e-8);assert.ok(result.maxAngularMomentumRelativeError<2e-8);
 assert.ok(result.checkpoints!.every(s=>s.thermal!.relativeResidual<2e-8));
 const final=result.checkpoints!.at(-1)!.thermal!;
 assert.ok(final.spatial);assert.ok(final.spatial!.innerK>final.spatial!.outerK,'Coolant extracts heat through a radial wall gradient.');
 assert.equal(final.linerEnergyJ,final.spatial!.energyJ);
 assert.ok(Math.abs(final.pressurePa-config.pressurePa*final.gasK/config.gasK)<1e-10);
});

test('off-knot spatial playback interpolates conserved enthalpy and resumes the same state',()=>{
 const original=run(),time=.07125,sample=sampleFuelTransport(original,time),wall=sample.thermal!.spatial!;
 const canonical=fuelLinerState(original.thermalLiner!,wall.cellEnergyJ);
 assert.deepEqual(wall.temperatureK,canonical.temperatureK);assert.equal(sample.thermal!.linerK,canonical.meanK);
 const branched={...operation,events:[{timeS:time,currentA:.006}]};
 const result=simulateFuelOperation(simulateFuelCentrifuge(config,branched.events),branched,{cells:8,steps:64},{transport:original,timeS:time});
 const joined=sampleFuelTransport(result,time);
 assert.deepEqual(joined.thermal!.spatial!.cellEnergyJ,wall.cellEnergyJ);
 assert.ok(result.checkpoints!.every(s=>s.thermal!.relativeResidual<2e-8));
});

test('spatial continuation rejects a missing or inconsistent saved cell state',()=>{
 for(const damage of ['missing','temperature','derived','grid'] as const){
  const original=run(),last=original.checkpoints!.at(-1)!;
  if(damage==='missing')delete last.thermal!.spatial;
  else if(damage==='temperature')last.thermal!.spatial!.temperatureK[0]+=20;
  else if(damage==='derived')last.thermal!.spatial!.maxK=NaN;
  else delete original.thermalLiner;
  assert.throws(()=>simulateFuelOperation(simulateFuelCentrifuge(config,operation.events),operation,{cells:8,steps:64},{transport:original,timeS:config.durationS}),/Spatial continuation/);
 }
});

test('lumped legacy histories retain their original scalar thermal state and can resume',()=>{
 const legacy={schemaVersion:1 as const,events:[],thermal:{...DEFAULT_FUEL_THERMAL,enabled:true}};
 const original=simulateFuelOperation(simulateFuelCentrifuge(config),legacy,{cells:8,steps:32});
 assert.equal(original.thermalLiner,undefined);assert.equal(original.snapshots.at(-1)!.thermal!.spatial,undefined);
 const next={...legacy,events:[{timeS:.1,currentA:0}]};
 const resumed=simulateFuelOperation(simulateFuelCentrifuge(config,next.events),next,{cells:8,steps:32},{transport:original,timeS:.1});
 assert.equal(resumed.checkpoints!.at(-1)!.currentA,0);assert.equal(resumed.snapshots.at(-1)!.thermal!.spatial,undefined);
});

test('spatial initial property domain is enforced while disabled spatial settings do not change a bath run',()=>{
 const cold={...config,linerK:299};
 assert.throws(()=>simulateFuelOperation(simulateFuelCentrifuge(cold),{schemaVersion:1,events:[],thermal},{cells:4,steps:2}),/300–1900/);
 const bath=simulateFuelOperation(simulateFuelCentrifuge(cold),{schemaVersion:1,events:[],thermal:{...thermal,enabled:false}},{cells:4,steps:2});
 assert.equal(bath.thermalLiner,undefined);assert.equal(bath.snapshots.at(-1)!.thermal,undefined);
});

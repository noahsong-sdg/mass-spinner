import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {DEFAULT_FUEL_THERMAL,simulateFuelOperation} from '../src/fuel-operation.js';
import {sampleFuelTransport} from '../src/fuel-transport.js';

test('stiff thermal playback retains accepted states and exchange follows backward Euler on its actual time grid',()=>{
 const config={...DEFAULT_FUEL_CENTRIFUGE,currentA:0,gasK:500,linerK:1000,durationS:1};
 const operation={schemaVersion:1 as const,events:[],thermal:{...DEFAULT_FUEL_THERMAL,enabled:true,gasWallWK:1e6,coolingWK:0}};
 const steps=512,dt=config.durationS/steps;
 const long=simulateFuelOperation(simulateFuelCentrifuge(config),operation,{cells:4,steps});
 const short=simulateFuelOperation(simulateFuelCentrifuge({...config,durationS:dt}),operation,{cells:4,steps:1});
 const sampled=sampleFuelTransport(long,dt);
 const cg=1.5*config.pressurePa*Math.PI*config.radiusM**2*config.lengthM/config.gasK,cw=operation.thermal.wallCapacityJK;
 const common=(cg*config.gasK+cw*config.linerK)/(cg+cw);
 const exactPhysical=common+(config.gasK-common)*Math.exp(-dt*operation.thermal.gasWallWK*(1/cg+1/cw));
 for(const model of [long,short]){
  let gas=config.gasK,time=0;
  for(const s of model.checkpoints!.filter(s=>s.timeS>0&&s.timeS<=dt)){
   gas=common+(gas-common)/(1+(s.timeS-time)*operation.thermal.gasWallWK*(1/cg+1/cw));time=s.timeS;
   const wall=(cg*config.gasK+cw*config.linerK-cg*gas)/cw;
   assert.ok(Math.abs(s.thermal!.gasK-gas)<1e-6,'Each accepted exchange must agree with independently derived backward Euler.');
   assert.ok(Math.abs(s.thermal!.linerK-wall)<1e-6,'Each exchange must conserve the two reservoirs\' total energy.');
  }
  assert.equal(time,dt);
 }
 const accepted=long.checkpoints!.find(s=>s.timeS===dt)!;
 assert.equal(sampled.thermal!.gasK,accepted.thermal!.gasK,'Playback must retain the accepted gas temperature, not invent a slow ramp.');
 assert.equal(sampled.thermal!.linerK,accepted.thermal!.linerK);
 assert.ok(sampled.thermal!.gasK>999);
 assert.ok(Math.abs(sampled.thermal!.gasK-exactPhysical)<1e-3,'Resolved exchange must be within 1 mK of the analytic physical-time equilibrium.');
});

test('a hotter coolant adds signed external heat rather than being clipped to cooling only',()=>{
 const config={...DEFAULT_FUEL_CENTRIFUGE,currentA:0,gasK:500,linerK:500,durationS:1};
 const thermal={...DEFAULT_FUEL_THERMAL,enabled:true,gasWallWK:0,coolingWK:1,coolantK:1000};
 const model=simulateFuelOperation(simulateFuelCentrifuge(config),{schemaVersion:1,events:[],thermal},{cells:4,steps:512});
 const final=model.snapshots.at(-1)!.thermal!;
 const exactWall=thermal.coolantK+(config.linerK-thermal.coolantK)*Math.exp(-thermal.coolingWK*config.durationS/thermal.wallCapacityJK);
 assert.ok(Math.abs(final.gasK-config.gasK)<1e-6,'Without gas-wall exchange the neutral energy is unchanged.');
 assert.ok(Math.abs(final.linerK-exactWall)<.01,'Wall warming must approach the analytic linear reservoir solution.');
 assert.ok(final.coolingEnergyJ<0,'Hot coolant delivers net heat to the modeled liner.');
 assert.ok(Math.abs(final.coolingEnergyJ+thermal.wallCapacityJK*(final.linerK-config.linerK))<1e-6,'Signed coolant transfer must close liner energy.');
});

test('stiff thermal branch retains the actual accepted temperature at its first integrator time',()=>{
 const config={...DEFAULT_FUEL_CENTRIFUGE,currentA:0,gasK:500,linerK:1000,durationS:1};
 const thermal={...DEFAULT_FUEL_THERMAL,enabled:true,gasWallWK:1e6,coolingWK:0};
 const original={schemaVersion:1 as const,events:[],thermal};
 const dt=1/512;
 const long=simulateFuelOperation(simulateFuelCentrifuge(config),original,{cells:4,steps:512});
 const accepted=long.checkpoints!.find(s=>s.timeS===dt)!;
 const branch=simulateFuelOperation(simulateFuelCentrifuge(config),{...original,events:[{timeS:dt,currentA:.01}]},{cells:4,steps:512},{transport:long,timeS:dt});
 const joined=sampleFuelTransport(branch,dt);
 assert.equal(joined.thermal!.gasK,accepted.thermal!.gasK,
  'A current intervention must not restart from a slow display interpolation of a fast thermal transient.');
 assert.equal(joined.thermal!.linerK,accepted.thermal!.linerK);
 assert.deepEqual(joined.lightMass,accepted.lightMass);assert.deepEqual(joined.heavyMass,accepted.heavyMass);
});

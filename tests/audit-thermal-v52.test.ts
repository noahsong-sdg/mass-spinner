import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {DEFAULT_FUEL_THERMAL,simulateFuelOperation} from '../src/fuel-operation.js';
import {sampleFuelTransport} from '../src/fuel-transport.js';

test('stiff thermal playback at an accepted integrator time agrees with the identical one-step experiment',()=>{
 const config={...DEFAULT_FUEL_CENTRIFUGE,currentA:0,gasK:500,linerK:1000,durationS:1};
 const operation={schemaVersion:1 as const,events:[],thermal:{...DEFAULT_FUEL_THERMAL,enabled:true,gasWallWK:1e6,coolingWK:0}};
 const steps=512,dt=config.durationS/steps;
 const long=simulateFuelOperation(simulateFuelCentrifuge(config),operation,{cells:4,steps});
 const one=simulateFuelOperation(simulateFuelCentrifuge({...config,durationS:dt}),operation,{cells:4,steps:1}).snapshots.at(-1)!;
 const sampled=sampleFuelTransport(long,dt);
 const cg=1.5*config.pressurePa*Math.PI*config.radiusM**2*config.lengthM/config.gasK,cw=operation.thermal.wallCapacityJK;
 const common=(cg*config.gasK+cw*config.linerK)/(cg+cw);
 const analyticBE=common+(config.gasK-common)/(1+dt*operation.thermal.gasWallWK*(1/cg+1/cw));
 const exactPhysical=common+(config.gasK-common)*Math.exp(-dt*operation.thermal.gasWallWK*(1/cg+1/cw));
 assert.ok(Math.abs(one.thermal!.gasK-analyticBE)<1e-6,'One-step exchange must agree with independently derived backward Euler.');
 assert.ok(Math.abs(one.thermal!.gasK-exactPhysical)<1e-3,'The stiff first step should also be within 1 mK of the analytic physical-time equilibrium.');
 assert.ok(one.thermal!.gasK>999,'The resolved implicit exchange should nearly equilibrate in the first step.');
 assert.ok(Math.abs(sampled.thermal!.gasK-one.thermal!.gasK)<1e-6,
  `Playback invents an unresolved slow heating ramp: sampled ${sampled.thermal!.gasK} K versus accepted-step ${one.thermal!.gasK} K.`);
 assert.ok(Math.abs(sampled.thermal!.linerK-one.thermal!.linerK)<1e-6);
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
 const one=simulateFuelOperation(simulateFuelCentrifuge({...config,durationS:dt}),original,{cells:4,steps:1}).snapshots.at(-1)!;
 const branch=simulateFuelOperation(simulateFuelCentrifuge(config),{...original,events:[{timeS:dt,currentA:.01}]},{cells:4,steps:512},{transport:long,timeS:dt});
 const joined=sampleFuelTransport(branch,dt);
 assert.ok(Math.abs(joined.thermal!.gasK-one.thermal!.gasK)<1e-6,
  'A current intervention must not restart from a slow display interpolation of a fast thermal transient.');
});

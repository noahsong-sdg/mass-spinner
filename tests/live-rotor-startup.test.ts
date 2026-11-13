import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,rotorResponse,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {DEFAULT_FUEL_THERMAL,simulateFuelOperation} from '../src/fuel-operation.js';
import {sampleFuelTransport,simulateFuelTransport} from '../src/fuel-transport.js';

const config={...DEFAULT_FUEL_CENTRIFUGE,radialDiffusivityM2S:1e-30};
const clocks=[1e-5,3e-5,1e-4,3e-4,1e-3];
function checkSpeed(actual:number,expected:number,radius:number,label:string){
 const error=radius*Math.abs(actual-expected),bound=.01+.03*radius*Math.abs(expected);
 assert.ok(error<=bound,`${label}: wall-speed error ${error} m/s exceeds ${bound} m/s`);
}
test('default isothermal operation resolves the analytic fast ion startup without a thermal-gas option',()=>{
 const rotor=simulateFuelCentrifuge(config),m=rotor.mechanics;
 const model=simulateFuelOperation(rotor,{schemaVersion:1,events:[]});
 for(const time of clocks){const sample=sampleFuelTransport(model,time),exact=rotorResponse(m.ii,m.nn,m.gamma,m.drag,m.torque,time);
  checkSpeed(sample.ionRadS,exact.ion,config.radiusM,`ion ${time} s`);
 }
 assert.equal(model.steps,512);
 assert.ok(model.maxBalanceError<2e-8&&model.maxAngularMomentumRelativeError<2e-8&&model.maxEnergyRelativeError<2e-8);
 assert.ok(model.checkpoints!.every((p,i,rows)=>i===0||p.timeS>rows[i-1].timeS));
});
test('isothermal late switch resolves the same fast transient and retains one exact event',()=>{
 const timeS=.650137,c={...config,currentA:0},operation={schemaVersion:1 as const,events:[{timeS,currentA:.03}]};
 const rotor=simulateFuelCentrifuge(c),m=rotor.mechanics,torque=.03*c.magneticT*c.radiusM**2*(1-c.driveInnerFraction**2)/2;
 const model=simulateFuelOperation(rotor,operation);
 for(const elapsed of clocks){const sample=sampleFuelTransport(model,timeS+elapsed),exact=rotorResponse(m.ii,m.nn,m.gamma,m.drag,torque,elapsed);
  checkSpeed(sample.ionRadS,exact.ion,c.radiusM,`switched ion ${elapsed} s`);
 }
 assert.equal(model.checkpoints!.filter(p=>p.timeS===timeS).length,1);
 assert.equal(model.checkpoints!.find(p=>p.timeS===timeS)!.currentA,.03);
});
test('pre-change fixed-grid snapshot histories preserve their accepted prefix when resumed',()=>{
 const rotor=simulateFuelCentrifuge(config),operation={schemaVersion:1 as const,events:[]},options={cells:8,steps:32};
 // The unchanged fixed-grid backend reproduces pre-fix no-event mechanics.
 // Add only the historical recorder provenance; no new integrator generates
 // these persisted momenta, inventories or ledger values.
 const old=simulateFuelTransport(rotor,options),{durationS:_duration,currentA:_current,...setup}=config;
 old.operation={schemaVersion:1,events:[],thermal:{...DEFAULT_FUEL_THERMAL},setup,initialCurrentA:config.currentA};
 const timeS=.50337,sample=sampleFuelTransport(old,timeS);
 const resumed=simulateFuelOperation(rotor,{...operation,events:[{timeS,currentA:0}]},options,{transport:old,timeS});
 assert.deepEqual(resumed.snapshots.filter(p=>p.timeS<timeS),old.snapshots.filter(p=>p.timeS<timeS));
 const accepted=resumed.checkpoints!.find(p=>p.timeS===timeS)!;
 assert.equal(accepted.neutralAngularMomentumKgM2S,sample.neutralAngularMomentumKgM2S);
 assert.equal(accepted.ionAngularMomentumKgM2S,sample.ionAngularMomentumKgM2S);
 assert.deepEqual(accepted.lightMass,sample.lightMass);assert.deepEqual(accepted.heavyMass,sample.heavyMass);
 assert.ok(resumed.checkpoints!.every((p,i,rows)=>i===0||p.timeS>rows[i-1].timeS));
 assert.ok(resumed.checkpoints!.at(-1)!.balances.minimumMass>=0);
 assert.ok(resumed.maxAngularMomentumRelativeError<2e-8&&resumed.maxEnergyRelativeError<2e-8);
});

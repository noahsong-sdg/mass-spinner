import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {DEFAULT_FUEL_THERMAL,simulateFuelOperation,type FuelOperation} from '../src/fuel-operation.js';
import {sampleFuelTransport,type FuelTransportResult} from '../src/fuel-transport.js';

const config={...DEFAULT_FUEL_CENTRIFUGE,currentA:0,durationS:1};
const operation:FuelOperation={schemaVersion:1,events:[{timeS:.650137,currentA:.03}],thermal:{...DEFAULT_FUEL_THERMAL,enabled:true,
 spatial:{material:'tungsten',thicknessM:.001,cells:4},gas:{conductivityWMK:.1}}};
const options={cells:8,steps:128};
const run=()=>simulateFuelOperation(simulateFuelCentrifuge(config),operation,options);
function ordered(model:FuelTransportResult){
 assert.ok(model.checkpoints!.every((s,i,rows)=>i===0||s.timeS>rows[i-1].timeS));
 assert.equal(model.checkpoints!.at(-1)!.timeS,model.durationS);
 assert.ok(model.checkpoints!.every(s=>s.thermal!.relativeResidual<2e-8&&s.angularMomentum.relativeResidual<2e-8));
}

test('spatial gas captures refined late-switch steps and one exact right-continuous event',()=>{
 const model=run(),at=operation.events[0].timeS,rows=model.checkpoints!;
 ordered(model);assert.equal(model.steps,options.steps,'Requested intervals retain their public meaning.');
 assert.equal(rows.filter(s=>s.timeS===at).length,1);
 assert.equal(rows.find(s=>s.timeS===at)!.currentA,.03);
 const event=rows.findIndex(s=>s.timeS===at),s=rows[event],m=model.mechanics;
 const bound=8/options.steps/(m.gamma/m.ii+m.gamma/s.neutralInertiaKgM2+m.drag/m.nn);
 assert.ok(rows[event+1].timeS-at<=bound*(1+1e-10));
 assert.ok(rows.length>options.steps+1,'Additional accepted steps are retained, not hidden behind playback interpolation.');
});

test('off-knot power branch and duration extension preserve canonical prefix and restart local refinement',()=>{
 const source=run(),time=.6503377,s=sampleFuelTransport(source,time);
 assert.ok(!source.checkpoints!.some(p=>p.timeS===time));
 const c={...config,durationS:1.1},op={...operation,events:[...operation.events,{timeS:time,currentA:0}]};
 const branch=simulateFuelOperation(simulateFuelCentrifuge(c),op,options,{transport:source,timeS:time});
 ordered(branch);
 assert.deepEqual(branch.checkpoints!.filter(p=>p.timeS<time),source.checkpoints!.filter(p=>p.timeS<time));
 const i=branch.checkpoints!.findIndex(p=>p.timeS===time),accepted=branch.checkpoints![i];
 assert.equal(accepted.currentA,0);assert.equal(accepted.ionAngularMomentumKgM2S,s.ionAngularMomentumKgM2S);
 assert.equal(accepted.neutralAngularMomentumKgM2S,s.neutralAngularMomentumKgM2S);
 assert.deepEqual(accepted.lightMass,s.lightMass);assert.deepEqual(accepted.heavyMass,s.heavyMass);
 assert.deepEqual(accepted.thermal!.gas!.cellEnergyJ,s.thermal!.gas!.cellEnergyJ);
 assert.ok(branch.checkpoints![i+1].timeS-time<1e-5);
});

test('older snapshot-only spatial histories retain their accepted prefix when resumed',()=>{
 const source=run();delete source.checkpoints;
 const time=.6703377,s=sampleFuelTransport(source,time);
 const branch=simulateFuelOperation(simulateFuelCentrifuge(config),operation,options,{transport:source,timeS:time});
 ordered(branch);
 assert.deepEqual(branch.snapshots.filter(p=>p.timeS<time),source.snapshots.filter(p=>p.timeS<time));
 const accepted=branch.checkpoints!.find(p=>p.timeS===time)!;
 assert.equal(accepted.ionAngularMomentumKgM2S,s.ionAngularMomentumKgM2S);
 assert.deepEqual(accepted.thermal!.gas!.cellEnergyJ,s.thermal!.gas!.cellEnergyJ);
});

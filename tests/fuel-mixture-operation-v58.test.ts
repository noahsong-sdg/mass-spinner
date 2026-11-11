import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateFuelCentrifuge,DEFAULT_FUEL_CENTRIFUGE} from '../src/fuel-centrifuge.js';
import {simulateFuelOperation,DEFAULT_FUEL_THERMAL,type FuelOperation} from '../src/fuel-operation.js';
import {sampleFuelTransport} from '../src/fuel-transport.js';
const c={...DEFAULT_FUEL_CENTRIFUGE,currentA:.015,gasK:600,linerK:500,durationS:.1};
const op:FuelOperation={schemaVersion:1,events:[{timeS:.06,currentA:0}],thermal:{...DEFAULT_FUEL_THERMAL,enabled:true,
 spatial:{material:'tungsten',thicknessM:.001,cells:4},gas:{conductivityWMK:.00001}}};
const options={cells:8,steps:64};
const run=()=>simulateFuelOperation(simulateFuelCentrifuge(c),op,options);
const sum=(a:number[])=>a.reduce((s,v)=>s+v,0);
test('spatial mixture operation couples species energy, rotor work and solid heat without changing legacy defaults',()=>{
 const model=run();assert.ok(model.thermalGas);
 for(const s of model.checkpoints!){
  const t=s.thermal!,g=t.gas!;assert.equal(g.temperatureK.length,options.cells);
  assert.ok(g.minK>0&&Number.isFinite(g.maxK));assert.equal(t.gasEnergyJ,g.energyJ);
  assert.ok(t.relativeResidual<2e-8);assert.ok(s.angularMomentum.relativeResidual<2e-8);
  assert.ok(s.energy.relativeResidual<2e-8);assert.ok(Math.abs(sum(s.lightMass)-1)<2e-10);
  assert.equal(s.energy.freeEnergyJ,null,'An isothermal proxy is not a spatial-gas free energy.');
  assert.ok(Math.abs(sum(g.speciesEnergyJ.flat())-g.energyJ)<1e-12);
 }
 assert.ok(model.snapshots.at(-1)!.thermal!.gas!.maxK-model.snapshots.at(-1)!.thermal!.gas!.minK>.01);
 assert.ok(model.checkpoints![1].timeS<c.durationS/options.steps**2,'Rotor-timescale refinement resolves startup within the base grid.');
 assert.equal(model.checkpoints!.at(-1)!.timeS,c.durationS);
 assert.ok(model.checkpoints!.every((s,i,all)=>i===0||s.timeS>all[i-1].timeS),'Accepted knots are strictly increasing.');
 const legacy=simulateFuelOperation(simulateFuelCentrifuge(c),{...op,thermal:{...op.thermal!,gas:undefined}},options);
 assert.equal(legacy.thermalGas,undefined);assert.equal(legacy.snapshots.at(-1)!.thermal!.gas,undefined);
});
test('off-knot playback conserves cell energy before reconstructing temperatures and continuation',()=>{
 const model=run(),timeS=.0444,s=sampleFuelTransport(model,timeS),g=s.thermal!.gas!;
 const before=model.checkpoints!.filter(p=>p.timeS<timeS).at(-1)!,after=model.checkpoints!.find(p=>p.timeS>timeS)!;
 const f=(timeS-before.timeS)/(after.timeS-before.timeS);
 for(let i=0;i<options.cells;i++)assert.equal(g.cellEnergyJ[i],(1-f)*before.thermal!.gas!.cellEnergyJ[i]+f*after.thermal!.gas!.cellEnergyJ[i]);
 const resumed=simulateFuelOperation(simulateFuelCentrifuge(c),op,options,{transport:model,timeS});
 assert.ok(resumed.snapshots.at(-1)!.thermal!.relativeResidual<2e-8);
 assert.ok(Math.abs(sum(g.speciesEnergyJ.flat())-g.energyJ)<1e-12);
});
test('spatial continuation rejects stale missing state and tampered derived gas fields',()=>{
 const source=run();
 for(const edit of [(s:any)=>delete s.thermal.gas,(s:any)=>s.thermal.gas.temperatureK[0]+=1,
  (s:any)=>s.thermal.gas.cellEnergyJ[0]*=1.01,(s:any)=>s.thermal.gas.pressurePa[0]+=1,
  (s:any)=>s.thermal.gas.speciesEnergyJ[0][0]+=1e-5,(s:any)=>s.thermal.gasK+=1]){
  const changed=structuredClone(source);edit(changed.checkpoints![1]);
  assert.throws(()=>simulateFuelOperation(simulateFuelCentrifuge(c),op,options,{transport:changed,timeS:.05}),/Spatial gas continuation/);
 }
});
test('gas model domain rejects molecular internal modes and missing spatial solid without accepting altered state',()=>{
 assert.throws(()=>simulateFuelOperation(simulateFuelCentrifuge({...c,pair:'molecular'}),op,options),/atomic pairs/);
 assert.throws(()=>simulateFuelOperation(simulateFuelCentrifuge(c),{...op,thermal:{...op.thermal!,spatial:undefined}},options),/Spatial gas needs/);
 assert.throws(()=>simulateFuelOperation(simulateFuelCentrifuge(c),{...op,thermal:{...op.thermal!,gas:{conductivityWMK:-1}}},options),/Spatial gas needs/);
});

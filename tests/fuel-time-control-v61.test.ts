import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {DEFAULT_FUEL_THERMAL,simulateFuelOperation} from '../src/fuel-operation.js';

const accuracy={relativeTolerance:.001,temperatureToleranceK:.0001};
const operation={schemaVersion:1 as const,events:[],thermal:{...DEFAULT_FUEL_THERMAL,enabled:true,
 spatial:{material:'tungsten' as const,thicknessM:.001,cells:16},gas:{conductivityWMK:.1,accuracy}}};
test('refined mode explicitly selects its gas mesh; absent policy retains the live legacy grid',()=>{
 const rotor=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,durationS:0});
 assert.equal(simulateFuelOperation(rotor,operation).cells,256);
 assert.equal(simulateFuelOperation(rotor,operation,{cells:8}).cells,8);
 const legacy=structuredClone(operation);delete (legacy.thermal.gas as {accuracy?:unknown}).accuracy;
 const old=simulateFuelOperation(rotor,legacy);assert.equal(old.cells,64);assert.equal(old.timeControl,undefined);
});
test('temporal accuracy options enforce a finite positive tolerance domain',()=>{
 const rotor=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,durationS:0});
 for(const invalid of [0,-1,Infinity,Number.NaN])for(const field of ['relativeTolerance','temperatureToleranceK'] as const){
  const op=structuredClone(operation);op.thermal.gas.accuracy[field]=invalid;
  assert.throws(()=>simulateFuelOperation(rotor,op),/accuracy|tolerance/i);
 }
});

test('adaptive duration extension preserves the accepted prefix and scopes counters to the new segment',()=>{
 const config={...DEFAULT_FUEL_CENTRIFUGE,durationS:.001},options={cells:8,steps:4};
 const initial=simulateFuelOperation(simulateFuelCentrifuge(config),operation,options);
 const end=initial.durationS;
 const extended=simulateFuelOperation(simulateFuelCentrifuge({...config,durationS:.002}),operation,options,
  {transport:initial,timeS:end});
 assert.deepEqual(extended.checkpoints!.filter(s=>s.timeS<end),initial.checkpoints!.filter(s=>s.timeS<end));
 assert.equal(extended.timeControl!.startTimeS,end);
 assert.equal(extended.checkpoints!.filter(s=>s.timeS>end).length,2*extended.timeControl!.acceptedPairs);
 assert.equal(extended.checkpoints!.at(-1)!.timeS,.002);
 assert.throws(()=>simulateFuelOperation(simulateFuelCentrifuge(config),operation,{...options,steps:8},
  {transport:initial,timeS:end}),/same nominal time grid/);
});

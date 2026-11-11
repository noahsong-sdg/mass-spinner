import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {DEFAULT_FUEL_THERMAL,simulateFuelOperation} from '../src/fuel-operation.js';

test('joint time refinement retains and diagnoses a large accepted hot-wall history',()=>{
 const config={...DEFAULT_FUEL_CENTRIFUGE,currentA:0,radialDiffusivityM2S:1e-30};
 const operation={schemaVersion:1 as const,events:[],thermal:{...DEFAULT_FUEL_THERMAL,enabled:true,
  spatial:{material:'tungsten' as const,thicknessM:.001,cells:2},gas:{conductivityWMK:.1}}};
 const model=simulateFuelOperation(simulateFuelCentrifuge(config),operation,{cells:2,steps:32768});
 assert.ok(model.checkpoints!.length>50000,'Retain enough accepted states to exercise the former argument-list overflow.');
 assert.equal(model.checkpoints!.at(-1)!.timeS,config.durationS);
 assert.ok(model.maxBalanceError<2e-8&&model.maxAngularMomentumRelativeError<2e-8&&model.maxEnergyRelativeError<2e-8);
 for(const s of model.checkpoints!){
  assert.ok(s.thermal!.gas!.minK>0&&s.thermal!.relativeResidual<2e-8);
  assert.ok(s.lightMass.every(p=>Math.abs(p-.5)<1e-12)&&s.heavyMass.every(p=>Math.abs(p-.5)<1e-12));
 }
});

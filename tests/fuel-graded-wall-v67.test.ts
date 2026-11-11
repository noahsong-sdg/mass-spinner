import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {advanceFuelSpatialOperation,type FuelSpatialSetup,type FuelSpatialState} from '../src/fuel-spatial-operation.js';

test('graded wall Newton search resolves unfinished gas rows despite a converged wall roundoff plateau',()=>{
 const {setup,state,dtS}=JSON.parse(readFileSync(new URL('./fixtures/graded-wall-v67-stall.json',import.meta.url),'utf8')) as
  {setup:FuelSpatialSetup;state:FuelSpatialState;dtS:number};
 // Exact accepted state immediately before the retained 128-cell graded failure.
 const result=advanceFuelSpatialOperation(setup,state,dtS);
 assert.ok(result.state.gasEnergyJ.every(v=>Number.isFinite(v)&&v>0));
 assert.ok(result.thermal.gasTemperatureK.every(v=>v>100&&v<3000));
 assert.ok(result.thermal.linerSolveTemperatureK.every(v=>v>300&&v<1900));
 assert.ok(Math.abs(result.energyResidualJ)<=2e-9*result.energyScaleJ+result.storageRoundoffJ);
 assert.equal(result.momentum.grid.shearScheme,'volume-coordinate');
});

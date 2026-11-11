import test from 'node:test';
import assert from 'node:assert/strict';
import {createFuelCurrentSolver, type FuelCurrentSetup} from '../src/fuel-current.js';
const setup:FuelCurrentSetup={radialEdgesM:[0,.03,.06],axialEdgesM:[0,.07,.14],
 sigmaPerpSM:[.03,.03,.03,.03],sigmaParallelSM:[.3,.3,.3,.3],magneticT:.2,
 innerVoltageV:[null,null],outerVoltageV:[4,4],lowerVoltageV:[0,0],upperVoltageV:[0,0]};
test('tighter current precision preserves default and physical work identity',()=>{
 const w=[900,700,800,600];
 assert.deepEqual(createFuelCurrentSolver(setup)(w),createFuelCurrentSolver(setup,1e-11)(w));
 for(const tolerance of [1e-14,4*Number.EPSILON]){
  const result=createFuelCurrentSolver(setup,tolerance)(w);
  assert.ok(Math.abs(result.energyResidualW)<1e-14);
  assert.ok(result.maxCellCurrentResidualA<1e-14);
 }
});
test('precision cannot relax the established acceptance or demand subroundoff solves',()=>{
 for(const tolerance of [0,-1,Number.EPSILON,1e-10,Infinity,NaN])
  assert.throws(()=>createFuelCurrentSolver(setup,tolerance),RangeError);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFuelCurrentSolver,solveFuelCurrent,type FuelCurrentSetup} from '../src/fuel-current.js';
import {advanceFuelSpatialOperation,createFuelSpatialStepper,type FuelSpatialSetup,type FuelSpatialState} from '../src/fuel-spatial-operation.js';

function annulus():FuelCurrentSetup{
 return {radialEdgesM:[1,1.2,1.6,2],axialEdgesM:[0,.2,1],sigmaPerpSM:[1,2,3,4,5,6],
  sigmaParallelSM:[6,5,4,3,2,1],magneticT:.5,innerVoltageV:[0,0],outerVoltageV:[1,1],
  lowerVoltageV:[null,null,null],upperVoltageV:[null,null,null]};
}

test('compiled electrical setup owns all inputs and resolves each new rotation without stale fields',()=>{
 const setup=annulus(),frozen=structuredClone(setup),solve=createFuelCurrentSolver(setup);
 (setup.radialEdgesM as number[])[1]=1.1;
 (setup.sigmaPerpSM as number[]).fill(100);
 (setup.outerVoltageV as number[]).fill(5);setup.magneticT=7;
 for(const omega of [[0,0,0,0,0,0],[1,-2,3,-4,5,-6],[0,0,0,0,0,0]]){
  const actual=solve(omega),expected=solveFuelCurrent({...frozen,omegaRadS:omega});
  for(const key of ['relativePotentialV','torqueNm','jouleByCellW'] as const){
   const scale=Math.max(...expected[key].map(Math.abs));
   actual[key].forEach((v,i)=>assert.ok(Math.abs(v-expected[key][i])<=1e-9*scale));
  }
  assert.ok(Math.abs(actual.energyResidualW)<1e-9*(actual.jouleW+Math.abs(actual.mechanicalW)));
 }
 const changed=solveFuelCurrent({...setup,omegaRadS:Array(6).fill(0)});
 assert.ok(Math.abs(changed.jouleW-solve(Array(6).fill(0)).jouleW)>1);
 assert.throws(()=>solve([NaN,0,0,0,0,0]),/finite/);
 assert.throws(()=>solve([0]),/common-grid/);
 const result=solve([1,-2,3,-4,5,-6]);
 result.relativePotentialV.fill(NaN);result.potentialV.fill(Infinity);result.torqueNm.fill(1e99);
 const recovered=solve(Array(6).fill(0)),reference=solveFuelCurrent({...frozen,omegaRadS:Array(6).fill(0)});
 recovered.relativePotentialV.forEach((v,i)=>assert.ok(Math.abs(v-reference.relativePotentialV[i])<1e-9));
});

test('a compiled grounded zero-RHS circuit remains exact between nonzero rotation solves',()=>{
 const setup=annulus();setup.outerVoltageV=[0,0];const solve=createFuelCurrentSolver(setup);
 solve([1,2,3,4,5,6]);const zero=solve(Array(6).fill(0));
 assert.equal(zero.iterations,0);assert.equal(zero.jouleW,0);
 assert.deepEqual(zero.relativePotentialV,Array(6).fill(0));
 assert.deepEqual(zero.torqueNm,Array(6).fill(0));
});

test('abrupt rotation reduction retains the same physical solution as a fresh grounded solve',()=>{
 for(const voltage of [0,1]){
  const setup=annulus();setup.outerVoltageV=[voltage,voltage];const solve=createFuelCurrentSolver(setup);
  solve(Array(6).fill(1e10));
  const result=solve(Array(6).fill(1e-10)),fresh=solveFuelCurrent({...setup,omegaRadS:Array(6).fill(1e-10)});
  const scale=Math.max(...fresh.relativePotentialV.map(Math.abs));
  result.relativePotentialV.forEach((v,i)=>assert.ok(Math.abs(v-fresh.relativePotentialV[i])<1e-9*scale));
  assert.ok(Math.abs(result.jouleW-fresh.jouleW)<1e-9*fresh.jouleW);
 }
});

test('trajectory stepper snapshots setup and matches fresh electrical solves on successive accepted states',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/graded-wall-v67-stall.json',import.meta.url),'utf8')) as
  {setup:FuelSpatialSetup;state:FuelSpatialState;dtS:number};
 const frozen=structuredClone(fixture.setup),step=createFuelSpatialStepper(fixture.setup);
 fixture.setup.electrical.sigmaPerpSM=[1];fixture.setup.radiusM=.02;
 let state=fixture.state;
 for(let i=0;i<2;i++){
  const reused=step(state,fixture.dtS),fresh=advanceFuelSpatialOperation(frozen,state,fixture.dtS);
  for(const key of ['lightMass','heavyMass','omegaRadS','gasEnergyJ','linerEnergyJ'] as const){
   const scale=Math.max(...fresh.state[key].map(Math.abs));
   reused.state[key].forEach((v,i)=>assert.ok(Math.abs(v-fresh.state[key][i])<=1e-9*scale));
  }
  assert.ok(Math.abs(reused.energyResidualJ)<=1e-9*reused.energyScaleJ+reused.storageRoundoffJ);
  state=reused.state;
 }
});

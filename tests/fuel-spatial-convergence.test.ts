import test from 'node:test';
import assert from 'node:assert/strict';
import {assessSpatialRefinement,restrictSpatialSnapshot} from '../src/fuel-spatial-convergence.js';
import {DEFAULT_SPATIAL_EXPERIMENT} from '../src/fuel-spatial-experiment.js';
const N=1e19,K=1.380649e-23;
function fixture(steps=16,coefficient=1){
 const n=4,config={...DEFAULT_SPATIAL_EXPERIMENT,steps},duration=config.durationS;
 const snapshots=Array.from({length:steps+1},(_,i)=>{
  const timeS=i===steps?duration:i*duration/steps,temperature=1000+10*coefficient*timeS;
  return {timeS,contactVoltageV:1,radiusM:[1,2,3,4],omegaRadS:Array(n).fill(coefficient*timeS),
   temperatureK:Array(n).fill(temperature),densityKgM3:Array(n).fill(1),lightMass:Array(n).fill(1/n),heavyMass:Array(n).fill(1/n),
   electrodeCurrentA:-1,electricalPowerW:1,kineticJ:coefficient*timeS**2,gasEnergyJ:1.5*K*N*temperature,
   linerEnergyJ:4,angularMomentumKgM2S:coefficient*timeS,gasCellEnergyJ:Array(n).fill(1.5*K*N*temperature/n),
   linerCellEnergyJ:[2,2],linerTemperatureK:[1000,1000],intervalGasWallHeatJ:i?duration/steps:0,
   jouleByGasCellW:Array(n).fill(1/n),torqueByGasCellNm:Array(n).fill(1/n),joulePowerW:1,mechanicalPowerW:0,
   inertiaKgM2:[.0625,.1875,.3125,.4375],intervalElectricalWorkJ:i?duration/steps:0,
   stepOmegaMismatchRadS:0,stepMechanicalEndpointDefectJ:0,thermalRowResidualJ:0,electricalEnergyResidualW:0};
 });
 return {schemaVersion:1,kind:'spatial-argon-experiment',config,snapshots,
  conditions:{radiusM:.01,lengthM:.1},numericallyQualified:false,experimentallyQualified:false} as any;
}

test('restriction preserves inventory, internal energy, inertia and angular momentum rather than averaging omega',()=>{
 const row=fixture().snapshots[0];row.omegaRadS=[1,3,2,4];row.inertiaKgM2=[1,3,2,4];row.kineticJ=55;
 row.lightMass=row.heavyMass=[.1,.2,.3,.4];row.temperatureK=[1000,1100,1200,1300];
 row.gasCellEnergyJ=row.lightMass.map((p:number,i:number)=>1.5*K*N*p*row.temperatureK[i]);
 const r=restrictSpatialSnapshot(row,2,N);
 assert.deepEqual(r.inertiaKgM2,[4,6]);assert.deepEqual(r.omegaRadS,[2.5,20/6]);
 assert.ok(Math.abs(r.temperatureK[0]-(.1*1000+.2*1100)/.3)<1e-10);
 assert.equal(r.gasCellEnergyJ[0],row.gasCellEnergyJ[0]+row.gasCellEnergyJ[1]);
 assert.equal(r.kineticJ,55,'actual fine kinetic energy is not replaced by averaged-flow energy');
 assert.deepEqual(r.jouleByGasCellW,[.5,.5]);assert.throws(()=>restrictSpatialSnapshot(row,3,N),/Nested/);
});

test('three-level time gate uses unchanged threshold and contraction and keeps quiet responses unresolved',()=>{
 const result=assessSpatialRefinement([fixture(16,1.008),fixture(32,1.004),fixture(64,1.002)],'steps');
 const omega=result.metrics.find(m=>m.name==='angularSpeed')!;
 assert.equal(omega.status,'pass');assert.equal(omega.tolerance,.01);assert.equal(omega.contracting,true);
 assert.equal(result.metrics.find(m=>m.name==='densityResponse')!.status,'unresolved');
 assert.equal(result.metrics.find(m=>m.name==='linerTemperatureResponse')!.status,'unresolved');
 assert.equal(result.sharedClocks,17);assert.equal(result.fineOnlyClocks,48);
 assert.equal(result.numericallyQualified,false);assert.equal(result.allAssessedGatesPass,false);
 const failed=assessSpatialRefinement([fixture(16,1.04),fixture(32,1.02),fixture(64,1.01)],'steps');
 assert.equal(failed.metrics.find(m=>m.name==='angularSpeed')!.status,'fail');
 const noncontracting=assessSpatialRefinement([fixture(16,1.005),fixture(32,1.004),fixture(64,1.002)],'steps');
 assert.equal(noncontracting.metrics.find(m=>m.name==='angularSpeed')!.status,'fail');
});

test('large thermal background cannot turn a failed heating response into a pass',()=>{
 const result=assessSpatialRefinement([fixture(16,1.04),fixture(32,1.02),fixture(64,1.01)],'steps');
 const temperature=result.metrics.find(m=>m.name==='gasTemperatureResponse')!;
 assert.ok(temperature.scale<1e-4);assert.equal(temperature.status,'fail');
 for(const h of [fixture(16),fixture(32),fixture(64)])assert.ok(h.snapshots[0].temperatureK[0]===1000);
});

test('comparison refuses changed physics, missing accepted endpoints and nonfinite responses',()=>{
 const a=fixture(),b=fixture(32),c=fixture(64);
 b.config.contactVoltageV=2;assert.throws(()=>assessSpatialRefinement([a,b,c],'steps'),/frozen physical/);
 b.config.contactVoltageV=1;b.snapshots.pop();assert.throws(()=>assessSpatialRefinement([a,b,c],'steps'),/frozen physical/);
 const other=fixture(32);other.snapshots[2].timeS+=1e-9;assert.throws(()=>assessSpatialRefinement([a,other,c],'steps'),/common clocks/);
 const bad=fixture(32);bad.snapshots[2].omegaRadS[0]=NaN;assert.throws(()=>assessSpatialRefinement([a,bad,c],'steps'),/Nonfinite/);
});

test('wall heat is summed across accepted fine intervals before power is compared',()=>{
 const a=fixture(),b=fixture(32),c=fixture(64);
 const good=assessSpatialRefinement([a,b,c],'steps').metrics.find(m=>m.name==='intervalWallPower')!;
 assert.equal(good.coarseDifference,0);assert.equal(good.fineDifference,0);
 for(const row of c.snapshots.slice(1))row.intervalGasWallHeatJ*=2;
 const bad=assessSpatialRefinement([a,b,c],'steps').metrics.find(m=>m.name==='intervalWallPower')!;
 assert.equal(bad.status,'fail');assert.ok(bad.fineRelative!>.4);
});

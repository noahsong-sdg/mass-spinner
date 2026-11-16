import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SPATIAL_EXPERIMENT,simulateFuelSpatialExperiment,validateFuelSpatialExperiment} from '../src/fuel-spatial-experiment.js';
const sum=(v:readonly number[])=>v.reduce((a,b)=>a+b,0);
const close=(a:number,b:number,relative=1e-10)=>assert.ok(Math.abs(a-b)<=relative*Math.max(Math.abs(a),Math.abs(b),Number.MIN_VALUE),`${a} != ${b}`);

test('zero drive preserves a uniform stationary gas and reports the actual common-fluid scope',()=>{
 const result=simulateFuelSpatialExperiment({contactVoltageV:0});
 assert.equal(result.experimentallyQualified,false);assert.equal(result.numericallyQualified,false);assert.equal(result.liveDefaultReplaced,false);
 assert.equal(result.snapshots.length,result.config.steps+1);
 for(const s of result.snapshots){
  assert.ok(s.omegaRadS.every(v=>v===0));assert.equal(s.electrodeCurrentA,0);assert.equal(s.electricalPowerW,0);
  for(const t of s.temperatureK)assert.ok(Math.abs(t-result.config.temperatureK)<=1e-9);
  close(sum(s.lightMass),1);close(sum(s.heavyMass),1);assert.deepEqual(s.lightMass,s.heavyMass);
 }
 assert.equal(result.budgets.electricWorkJ,0);assert.equal(result.budgets.angularResidualKgM2S,0);
 assert.match(result.assumptions.join(' '),/Equal-mass passive labels/);assert.match(result.assumptions.join(' '),/historical startup\/refinement failures remain/);
 assert.match(result.assumptions.join(' '),/not validated continuum limits/);assert.match(result.assumptions.join(' '),/no Knudsen or accommodation qualification/);
});

test('driven trajectory resolves non-rigid momentum, heat, electrode current and closed budgets',()=>{
 const r=simulateFuelSpatialExperiment(),initial=r.snapshots[0],last=r.snapshots.at(-1)!;
 assert.equal(initial.timeS,0);assert.equal(last.timeS,r.config.durationS);
 assert.ok(last.omegaRadS.some(v=>Math.abs(v)>0));assert.ok(Math.max(...last.omegaRadS)-Math.min(...last.omegaRadS)>0);
 assert.ok(r.budgets.electricWorkJ>0);assert.ok(last.electrodeCurrentA<0);
 for(const s of r.snapshots){
  close(s.electricalPowerW,-s.contactVoltageV*s.electrodeCurrentA,2e-9);
  for(const a of [s.radiusM,s.omegaRadS,s.temperatureK,s.densityKgM3,s.lightMass,s.heavyMass]){
   assert.equal(a.length,r.config.radialCells);assert.ok(a.every(Number.isFinite));
  }
  close(sum(s.lightMass),1);close(sum(s.heavyMass),1);assert.deepEqual(s.lightMass,s.heavyMass);
 }
 const scale=initial.gasEnergyJ+last.gasEnergyJ+Math.abs(initial.linerEnergyJ)+Math.abs(last.linerEnergyJ)+r.budgets.electricWorkJ;
 assert.ok(Math.abs(r.budgets.energyResidualJ)<=256*Number.EPSILON*r.config.steps*scale);
 const angularScale=Math.abs(last.angularMomentumKgM2S)+Math.abs(r.budgets.driveImpulseKgM2S)+Math.abs(r.budgets.wallImpulseKgM2S);
 assert.ok(Math.abs(r.budgets.angularResidualKgM2S)<=1e-9*angularScale);
 assert.ok(r.budgets.numericalLossJ>=0);
});

test('magnetic-field removal suppresses torque while voltage still supplies Joule heating',()=>{
 const r=simulateFuelSpatialExperiment({magneticT:0}),last=r.snapshots.at(-1)!;
 assert.ok(last.omegaRadS.every(v=>v===0));assert.ok(r.budgets.electricWorkJ>0);assert.ok(last.gasEnergyJ>r.snapshots[0].gasEnergyJ);
 assert.equal(r.budgets.driveImpulseKgM2S,0);assert.equal(r.budgets.wallImpulseKgM2S,0);
});

test('pulse switch preserves state and applies right-continuous shorted-contact diagnostics',()=>{
 const pulse=simulateFuelSpatialExperiment({driveFraction:.5,steps:32}),n=pulse.config.steps/2;
 const powered=simulateFuelSpatialExperiment({durationS:pulse.config.durationS/2,steps:16});
 const switchState=pulse.snapshots[n];assert.equal(switchState.contactVoltageV,0);assert.equal(switchState.electricalPowerW,0);
 assert.ok(switchState.omegaRadS.some(v=>v!==0));assert.ok(switchState.electrodeCurrentA>0,'shorted motional current reverses its source-side sign');
 assert.ok(pulse.budgets.electricWorkJ>0);assert.ok(pulse.snapshots.slice(n).every(s=>s.contactVoltageV===0));
 assert.equal(powered.snapshots.at(-1)!.timeS,switchState.timeS);
 assert.deepEqual(switchState.omegaRadS,powered.snapshots.at(-1)!.omegaRadS);
 assert.deepEqual(switchState.temperatureK,powered.snapshots.at(-1)!.temperatureK);
 close(pulse.budgets.electricWorkJ,powered.budgets.electricWorkJ);

});

test('zero duration keeps the initial state and validated domain refuses unsupported requests',()=>{
 const r=simulateFuelSpatialExperiment({durationS:0});assert.equal(r.snapshots.length,1);assert.equal(r.budgets.electricWorkJ,0);
 const original={...DEFAULT_SPATIAL_EXPERIMENT};simulateFuelSpatialExperiment({...original,durationS:0});assert.deepEqual(original,DEFAULT_SPATIAL_EXPERIMENT);
 for(const value of [null,[],{temperatureK:299},{temperatureK:1900},{magneticT:-1},{contactVoltageV:11},
  {durationS:1e-3},{numberDensityM3:0},{steps:128},{steps:16.5},{radialCells:5},{driveFraction:.3},{temperatureK:NaN},{voltage:1}])
  assert.throws(()=>validateFuelSpatialExperiment(value),RangeError);
 assert.deepEqual(validateFuelSpatialExperiment({}),DEFAULT_SPATIAL_EXPERIMENT);
});

test('voltage reversal flips current and rotation while scalar thermal and passive-label transport remain even',()=>{
 const positive=simulateFuelSpatialExperiment({contactVoltageV:.5}),negative=simulateFuelSpatialExperiment({contactVoltageV:-.5});
 for(let i=0;i<positive.snapshots.length;i++){
  const a=positive.snapshots[i],b=negative.snapshots[i];close(a.electrodeCurrentA,-b.electrodeCurrentA);
  a.omegaRadS.forEach((v,j)=>{if(v===0)assert.equal(Math.abs(b.omegaRadS[j]),0);else close(v,-b.omegaRadS[j]);});
  assert.deepEqual(a.temperatureK,b.temperatureK);assert.deepEqual(a.lightMass,b.lightMass);assert.deepEqual(a.heavyMass,b.heavyMass);
 }
 close(positive.budgets.electricWorkJ,negative.budgets.electricWorkJ);
});

test('zero driven fraction is the same shorted stationary trajectory as zero voltage',()=>{
 const grounded=simulateFuelSpatialExperiment({driveFraction:0}),zero=simulateFuelSpatialExperiment({contactVoltageV:0});
 assert.deepEqual(grounded.snapshots,zero.snapshots);assert.deepEqual(grounded.budgets,zero.budgets);
});


test('three short-window time refinements satisfy the unchanged 1% time screen and contract on shared clocks',()=>{
 const runs=[16,32,64].map(steps=>simulateFuelSpatialExperiment({durationS:2e-7,steps,contactVoltageV:.1}));
 const discrepancy=(a:typeof runs[number],b:typeof runs[number])=>{
  assert.equal(a.snapshots.at(-1)!.timeS,b.snapshots.at(-1)!.timeS);
  const ratio=b.config.steps/a.config.steps;
  const scale=Math.max(...b.snapshots.flatMap(s=>s.omegaRadS.map(Math.abs)));
  return Math.max(...a.snapshots.flatMap((s,i)=>s.omegaRadS.map((v,j)=>Math.abs(v-b.snapshots[i*ratio].omegaRadS[j]))))/scale;
 };
 const coarse=discrepancy(runs[0],runs[1]),fine=discrepancy(runs[1],runs[2]);
 assert.ok(coarse<.01&&fine<.01,`time differences ${coarse}, ${fine}`);
 assert.ok(fine<coarse,`time difference did not contract: ${coarse} → ${fine}`);
 assert.ok(runs.every(r=>r.numericallyQualified===false),'one bounded rotation comparison cannot qualify other observables or operating points');
});

test('zero-drive minimum-temperature state stays in the sourced material domain without clipping',()=>{
 const r=simulateFuelSpatialExperiment({contactVoltageV:0,temperatureK:300});
 for(const s of r.snapshots){
  assert.ok(s.temperatureK.every(v=>v>=300&&Math.abs(v-300)<1e-9));
  assert.ok(s.omegaRadS.every(v=>v===0));
 }
 assert.equal(r.budgets.electricWorkJ,0);
});

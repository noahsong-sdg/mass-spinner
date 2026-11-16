import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SPATIAL_EXPERIMENT,simulateFuelSpatialExperiment,validateFuelSpatialExperiment} from '../src/fuel-spatial-experiment.js';
import {advanceFuelSpatialOperation,createFuelSpatialStepper,type FuelSpatialSetup,type FuelSpatialState} from '../src/fuel-spatial-operation.js';
import {createFuelLiner,initialFuelLinerEnergy} from '../src/fuel-thermal.js';
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
 assert.match(result.assumptions.join(' '),/Joule heating is assigned directly to the common gas/);
});

test('driven trajectory resolves non-rigid momentum, heat, electrode current and closed budgets',()=>{
 const r=simulateFuelSpatialExperiment(),initial=r.snapshots[0],last=r.snapshots.at(-1)!;
 assert.equal(initial.timeS,0);assert.equal(last.timeS,r.config.durationS);
 assert.ok(last.omegaRadS.some(v=>Math.abs(v)>0));assert.ok(Math.max(...last.omegaRadS)-Math.min(...last.omegaRadS)>0);
 assert.ok(r.budgets.electricWorkJ>0);assert.ok(last.electrodeCurrentA<0);
 for(const s of r.snapshots){
  close(s.electricalPowerW,-s.contactVoltageV*s.electrodeCurrentA,2e-9);
  close(sum(s.gasCellEnergyJ),s.gasEnergyJ);close(sum(s.linerCellEnergyJ),s.linerEnergyJ);
  close(sum(s.jouleByGasCellW),s.joulePowerW);
  close(sum(s.inertiaKgM2.map((v,i)=>v*s.omegaRadS[i])),s.angularMomentumKgM2S);
  assert.equal(s.linerTemperatureK.length,3);assert.equal(s.inertiaKgM2.length,r.config.radialCells);
  assert.equal(s.linerCellEnergyCorrectionJ?.length,3);
  s.linerCellEnergyCorrectionJ!.forEach((low,i)=>assert.equal(s.linerCellEnergyJ[i]+low,s.linerCellEnergyJ[i]));
  assert.ok(Number.isFinite(s.maxCellCurrentResidualA)&&s.maxCellCurrentResidualA>=0);
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
 assert.ok(switchState.intervalElectricalWorkJ>0,'right-continuous zero voltage must not erase preceding driven work');
 assert.ok(switchState.intervalGasWallHeatJ>0,'zero-time switch diagnostics must not erase accepted wall heat');
 assert.equal(switchState.intervalGasWallHeatJ,powered.snapshots.at(-1)!.intervalGasWallHeatJ);
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
  {durationS:1e-3},{numberDensityM3:0},{steps:512},{steps:16.5},{radialCells:5},{driveFraction:.3},{temperatureK:NaN},{voltage:1}])
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


test('numerical controls accept only supported grading and never weaken the electrical solve',()=>{
 for(const axialSpacingPower of [1,2])assert.equal(validateFuelSpatialExperiment({axialSpacingPower}).axialSpacingPower,axialSpacingPower);
 for(const currentRelativeTolerance of [4*Number.EPSILON,1e-15,1e-13,1e-11])
  assert.equal(validateFuelSpatialExperiment({currentRelativeTolerance}).currentRelativeTolerance,currentRelativeTolerance);
 for(const setting of [{axialSpacingPower:0},{axialSpacingPower:1.5},{axialSpacingPower:3},
  {currentRelativeTolerance:0},{currentRelativeTolerance:Number.EPSILON},{currentRelativeTolerance:1.01e-11},
  {currentRelativeTolerance:NaN},{currentRelativeTolerance:'1e-13'}])
  assert.throws(()=>validateFuelSpatialExperiment(setting),RangeError);
 const prior:Record<string,unknown>={...DEFAULT_SPATIAL_EXPERIMENT};
 delete prior.axialSpacingPower;delete prior.currentRelativeTolerance;
 assert.deepEqual(validateFuelSpatialExperiment(prior),DEFAULT_SPATIAL_EXPERIMENT,'pre-control configs retain original numerical defaults');
});

test('default grid and current solve are unchanged when numerical controls are explicitly recorded',()=>{
 const implicit=simulateFuelSpatialExperiment();
 const explicit=simulateFuelSpatialExperiment({axialSpacingPower:1,currentRelativeTolerance:1e-11});
 assert.deepEqual(explicit,implicit);
});

test('graded zero-time magnetic-free current uses the actual charge solver and preserves Joule power identities',()=>{
 const r=simulateFuelSpatialExperiment({durationS:0,magneticT:0,axialCells:16,axialSpacingPower:2}),s=r.snapshots[0];
 assert.equal(r.snapshots.length,1);assert.equal(s.timeS,0);assert.ok(s.electrodeCurrentA<0);
 assert.ok(s.joulePowerW>0);assert.equal(s.mechanicalPowerW,0);assert.equal(s.kineticJ,0);
 assert.ok(s.omegaRadS.every(v=>v===0));assert.equal(r.budgets.electricWorkJ,0);
 close(s.joulePowerW,s.electricalPowerW,2e-9);close(s.electricalPowerW,-s.contactVoltageV*s.electrodeCurrentA,2e-9);
 close(sum(s.jouleByGasCellW),s.joulePowerW);assert.ok(s.maxCellCurrentResidualA>=0&&Number.isFinite(s.maxCellCurrentResidualA));
 assert.equal(r.config.axialSpacingPower,2);assert.equal(r.config.currentRelativeTolerance,1e-11);
 assert.equal(r.numericallyQualified,false);assert.equal(r.experimentallyQualified,false);
});

test('tightening current tolerance retains the same physical problem and exposes its actual residual',()=>{
 const config={durationS:0,magneticT:0,axialCells:16};
 const coarse=simulateFuelSpatialExperiment({...config,currentRelativeTolerance:1e-11});
 const fine=simulateFuelSpatialExperiment({...config,currentRelativeTolerance:1e-13});
 const a=coarse.snapshots[0],b=fine.snapshots[0];
 assert.deepEqual(coarse.conditions,fine.conditions);assert.equal(fine.config.axialSpacingPower,1);
 assert.equal(fine.config.currentRelativeTolerance,1e-13);assert.ok(b.maxCellCurrentResidualA<=a.maxCellCurrentResidualA);
 assert.ok(b.electrodeCurrentA<0);close(b.electricalPowerW,b.joulePowerW,2e-9);
 close(b.electricalPowerW,-b.contactVoltageV*b.electrodeCurrentA,2e-9);
 assert.equal(fine.numericallyQualified,false,'one residual check does not establish temporal or spatial convergence');
});

function currentControlFixture(){
 const nr=4,nz=4,R=.01,L=.1,N=1e19,T=1000,liner=createFuelLiner({radiusM:R,lengthM:L,thicknessM:.001,cells:3});
 const setup:FuelSpatialSetup={number:N,lightFraction:.5,speciesMassKg:[39.948*1.66053906892e-27,39.948*1.66053906892e-27],
  radiusM:R,lengthM:L,diffusivityM2S:.001,material:'argon',liner,boundary:{gasWallWK:.1,coolingWK:0,coolantK:T},
  electrical:{radialEdgesM:Array.from({length:nr+1},(_,i)=>R*Math.sqrt(i/nr)),axialEdgesM:Array.from({length:nz+1},(_,j)=>L*j/nz),
   sigmaPerpSM:Array(nr*nz).fill(.01),sigmaParallelSM:Array(nr*nz).fill(.1),magneticT:.5,
   innerVoltageV:Array(nz).fill(null),outerVoltageV:Array(nz).fill(1),lowerVoltageV:Array(nr).fill(null),
   upperVoltageV:Array.from({length:nr},(_,i)=>i<nr/2?0:null)}};
 const state:FuelSpatialState={lightMass:Array(nr).fill(1/nr),heavyMass:Array(nr).fill(1/nr),omegaRadS:Array(nr).fill(0),
  gasEnergyJ:Array(nr).fill(1.5*1.380649e-23*N*T/nr),linerEnergyJ:initialFuelLinerEnergy(liner,T)};
 return {setup,state};
}

test('both direct and prepared spatial paths forward the optional current tolerance and preserve legacy defaults',()=>{
 const {setup,state}=currentControlFixture();
 const direct=advanceFuelSpatialOperation(setup,state,0);
 assert.deepEqual(advanceFuelSpatialOperation({...setup,currentRelativeTolerance:1e-11},state,0),direct);
 assert.deepEqual(createFuelSpatialStepper(setup)(state,0),direct);
 assert.deepEqual(createFuelSpatialStepper({...setup,currentRelativeTolerance:1e-11})(state,0),direct);
 const invalid={...setup,currentRelativeTolerance:0};
 assert.throws(()=>advanceFuelSpatialOperation(invalid,state,0),/Current relative tolerance/);
 assert.throws(()=>createFuelSpatialStepper(invalid)(state,0),/Current relative tolerance/);
});

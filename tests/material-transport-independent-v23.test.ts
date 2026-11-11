import test from 'node:test';
import assert from 'node:assert/strict';
import {litStoppingCrossSection} from '../src/deuteron-stopping.js';
import {DEFAULT_FUSION_BEAM,dtCrossSectionM2,simulateFusionBeam} from '../src/fusion-reactor.js';
import {simulateTargetLoading,type LoadingSource} from '../src/target-loading.js';

function relative(actual:number,expected:number,tolerance:number){
 assert.ok(Math.abs(actual-expected)<=tolerance*Math.max(Math.abs(expected),1e-300),`${actual} versus ${expected}; relative ${Math.abs(actual/expected-1)}`);
}

// An energy-coordinate quadrature is independent of the production depth-RK4
// and midpoint hazard. Choose a desired exit E, then compute its material range.
function reference(e0:number,exit:number,loading:number,intervals=32768){
 const delta=(e0-exit)/intervals;
 let range=0,tau=0,stopped=0,lastSurvival=1;
 let lastE=e0,lastS=litStoppingCrossSection(e0).totalKeVM2;
 let lastHazard=loading*dtCrossSectionM2(.6*e0)/lastS;
 for(let i=1;i<=intervals;i++){
  const energy=e0-i*delta,stopping=litStoppingCrossSection(energy).totalKeVM2;
  const hazard=loading*dtCrossSectionM2(.6*energy)/stopping;
  range+=delta*(1/lastS+1/stopping)/2;
  tau+=delta*(lastHazard+hazard)/2;
  const survival=Math.exp(-tau);stopped+=delta*(lastSurvival+survival)/2;
  lastE=energy;lastS=stopping;lastHazard=hazard;lastSurvival=survival;
 }
 return {range,tau,stopped,exit:lastE,probability:-Math.expm1(-tau)};
}

test('independent energy-coordinate range and hazard quadrature verify material depth integration',()=>{
 for(const [entrance,exit,loading]of [[100,40,.7],[300,120,.25]]){
  const ref=reference(entrance,exit,loading),coarse=reference(entrance,exit,loading,16384);
  relative(ref.range,coarse.range,2e-8);relative(ref.tau,coarse.tau,2e-8);
  const r=simulateFusionBeam({...DEFAULT_FUSION_BEAM,beamEnergyKeV:entrance,
   stoppingModel:'geant4-bragg',materialColumnM2:ref.range,targetColumnM2:loading*ref.range,intervals:1600});
  relative(r.exitEnergyKeV,exit,2e-7);
  relative(r.fusionProbability,ref.probability,2e-6);
  relative(r.beamStoppingPowerW/r.beamPowerW,ref.stopped/entrance,2e-6);
  relative(r.transmittedBeamPowerW/r.beamPowerW,exit*Math.exp(-ref.tau)/entrance,2e-7);
  assert.ok(Math.abs(r.relativeEnergyResidual!)<1e-12);
  assert.ok(r.profiles.every((p,i,a)=>i===0||p.energyKeV<a[i-1].energyKeV));
 }
});

test('material stopping persists without tritium and depends on material column rather than reactive loading',()=>{
 const ref=reference(100,70,0),base={...DEFAULT_FUSION_BEAM,stoppingModel:'geant4-bragg' as const,
  materialColumnM2:ref.range,intervals:800};
 const empty=simulateFusionBeam({...base,targetColumnM2:0});
 const loaded=simulateFusionBeam({...base,targetColumnM2:ref.range});
 assert.equal(empty.exitEnergyKeV,loaded.exitEnergyKeV);
 assert.equal(empty.neutronRateS,0);
 relative(empty.beamStoppingPowerW/empty.beamPowerW,.3,2e-7);
 relative(empty.transmittedBeamPowerW/empty.beamPowerW,.7,2e-7);
 assert.ok(loaded.neutronRateS>0);
 const off=simulateFusionBeam({...base,targetColumnM2:ref.range,beamCurrentA:0});
 assert.equal(off.beamStoppingPowerW,0);assert.equal(off.neutronRateS,0);
 assert.throws(()=>simulateFusionBeam({...base,targetColumnM2:2*ref.range}),/site inventory/);
 assert.throws(()=>simulateFusionBeam({...base,targetColumnM2:0,materialColumnM2:1e30}),/fit domain|stopping reference/);
});

test('material yield converges to independent quadrature under depth refinement',()=>{
 const ref=reference(100,40,1),runs=[50,100,200,400].map(intervals=>simulateFusionBeam({
  ...DEFAULT_FUSION_BEAM,stoppingModel:'geant4-bragg',materialColumnM2:ref.range,
  targetColumnM2:ref.range,intervals}));
 const errors=runs.map(r=>Math.abs(r.fusionProbability-ref.probability));
 assert.ok(errors[1]<errors[0]/3,JSON.stringify(errors));
 assert.ok(errors[2]<errors[1]/3,JSON.stringify(errors));
 assert.ok(errors[3]<errors[2]/3,JSON.stringify(errors));
});

// Independent simultaneous ODE in dimensionless fluence u=incident_D/sites.
// This independent fixed-step RK4 integrates populations and atom ledgers
// directly; production advances transformed hazards using adaptive DP5(4).
function integrateLoading(source:LoadingSource,eta:number,steps=32768){
 const dose=source.particleRateS*source.config.exposureS/(source.config.beamAreaM2*source.siteColumnM2);
 const h=dose/steps;let y=[source.config.targetColumnM2/source.siteColumnM2,
  1-source.config.targetColumnM2/source.siteColumnM2,0,0,0,0,0,0];
 const derivative=(v:number[])=>{
  const [t,d,empty]=v,p=-Math.expm1(-source.unitLoadingOpticalDepth*t),capture=eta*(1-p);
  return [-p-capture*t,capture*(1-d),p-capture*empty,p,capture,
   (1-eta)*(1-p),capture*t,capture*d];
 };
 for(let i=0;i<steps;i++){
  const a=derivative(y),b=derivative(y.map((v,j)=>v+h*a[j]/2));
  const c=derivative(y.map((v,j)=>v+h*b[j]/2)),d=derivative(y.map((v,j)=>v+h*c[j]));
  y=y.map((v,j)=>v+h*(a[j]+2*b[j]+2*c[j]+d[j])/6);
 }
 return y;
}
const loadingSource:LoadingSource={config:{targetColumnM2:6.5e19,beamAreaM2:.01,exposureS:5},
 siteColumnM2:1e20,unitLoadingOpticalDepth:3,particleRateS:5e17};
const loadingVector=(r:ReturnType<typeof simulateTargetLoading>)=>{
 const s=r.final,scale=r.siteColumnM2*loadingSource.config.beamAreaM2;
 return [s.tritiumFraction,s.deuteriumFraction,s.vacancyFraction,s.fusedT/scale,
  s.retainedIncomingD/scale,s.unretainedD/scale,s.releasedT/scale,s.releasedD/scale];
};

test('independent coupled RK4 validates adaptive loading without the historical first-order splitting bias',()=>{
 const eta=.8,ref=integrateLoading(loadingSource,eta),finer=integrateLoading(loadingSource,eta,65536);
 assert.ok(ref.every((v,i)=>Math.abs(v-finer[i])<2e-12));
 const errors=[50,100,200,400,1600].map(intervals=>{
  const r=simulateTargetLoading(loadingSource,{replacementProbability:eta,intervals});
  return Math.max(...loadingVector(r).map((v,i)=>Math.abs(v-ref[i])));
 });
 // Historical v23 Lie splitting halved its error on plot-grid refinement,
 // yet still overpredicted high-dose fusion by 6.38% at 6400 steps.
 // Keep that failure documented; the simultaneous solver must be accurate
 // at every requested plot density instead of reproducing its error order.
 assert.ok(errors.every(error=>error<2e-10),JSON.stringify(errors));
 const r=simulateTargetLoading(loadingSource,{replacementProbability:eta,intervals:400});
 for(const state of r.history.filter((_,i)=>i%50===0)){
  const expected=integrateLoading({...loadingSource,config:{...loadingSource.config,exposureS:state.timeS}},eta,16384);
  for(const [actual,index]of [[state.tritiumFraction,0],[state.deuteriumFraction,1],[state.vacancyFraction,2]] as const)
   assert.ok(Math.abs(actual-expected[index])<2e-10);
  relative(state.neutronRateS,loadingSource.particleRateS*-Math.expm1(-3*state.tritiumFraction),1e-14);
 }
});

test('independent projectile and target isotope balances close throughout nontrivial exchange and fusion',()=>{
 const r=simulateTargetLoading(loadingSource,{replacementProbability:.8,intervals:400});
 const area=loadingSource.config.beamAreaM2,capacity=loadingSource.siteColumnM2*area;
 const initialT=loadingSource.config.targetColumnM2*area,initialD=capacity-initialT;
 for(const s of r.history){
  const t=s.tritiumColumnM2*area,d=s.deuteriumColumnM2*area,v=s.vacancyColumnM2*area;
  const tolerance=2e-13*capacity;
  assert.ok(Math.abs(t+d+v-capacity)<tolerance);
  assert.ok(Math.abs(initialT-t-s.releasedT-s.fusedT)<tolerance);
  assert.ok(Math.abs(initialD+s.incidentD-d-s.releasedD-s.unretainedD-s.fusedT)<tolerance);
  assert.ok(Math.abs(s.incidentD-s.fusedT-s.retainedIncomingD-s.unretainedD)<tolerance);
  assert.ok([t,d,v,s.releasedT,s.releasedD,s.unretainedD,s.cumulativeNeutrons].every(n=>n>=0));
  assert.equal(s.cumulativeNeutrons,s.fusedT);
 }
 assert.ok(r.final.vacancyFraction>0,'fusion must leave some vacancies, rather than silently replacing every T with D');
 assert.ok(r.final.releasedD>0,'D-on-D replacements must be counted');
});

test('opaque fusion counts small incident fluence and crosses target-exhaustion branches continuously',()=>{
 // For tau enormously above x, p=1 to vastly beyond floating precision:
 // the first substep must fuse every incident projectile even if T-Tnext
 // cannot be resolved by subtracting two order-one target inventories.
 for(const x of [1,10,1e6]){
  const tau=1e20,incoming=x/tau,source={config:{targetColumnM2:1,beamAreaM2:1,exposureS:1},
   siteColumnM2:1,unitLoadingOpticalDepth:tau,particleRateS:incoming*10};
  const first=simulateTargetLoading(source,{replacementProbability:0,intervals:10}).history[1];
  relative(first.fusedT,incoming,3e-15);relative(first.vacancyColumnM2,incoming,3e-15);
  assert.ok(first.fusedT>0);
 }
 for(const x of [999,1000,1001]){
  const tau=1000,source={config:{targetColumnM2:1,beamAreaM2:1,exposureS:1},
   siteColumnM2:1,unitLoadingOpticalDepth:tau,particleRateS:x/tau*10};
  const first=simulateTargetLoading(source,{replacementProbability:0,intervals:10}).history[1];
  // exp(-x) is below 1e-433 here; the exact remaining optical depth is
  // independently log(1+exp(tau-x)-exp(-x)), with a well-resolved remainder.
  const remaining=Math.log1p(Math.exp(tau-x));
  relative(first.tritiumColumnM2,remaining/tau,5e-13);
  relative(first.fusedT,1-remaining/tau,2e-15);
  assert.ok(first.fusedT<=first.incidentD&&first.tritiumColumnM2>=0);
 }
});

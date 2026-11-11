import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateCoupledTarget,DEFAULT_COUPLED_TARGET,type CoupledTargetConfig} from '../src/coupled-target.js';
import {DEFAULT_FUSION_BEAM} from '../src/fusion-reactor.js';

const beam={...DEFAULT_FUSION_BEAM,stoppingModel:'geant4-bragg' as const,materialColumnM2:1e22,exposureS:1};
const config=(overrides:Partial<CoupledTargetConfig>={}):CoupledTargetConfig=>({...DEFAULT_COUPLED_TARGET,depthCells:4,samples:10,cooldownS:0,maxStepS:.1,...overrides});
const close=(actual:number,expected:number,scale=1,tol=1e-9)=>assert.ok(Math.abs(actual-expected)<=tol*Math.max(scale,Math.abs(expected)),`${actual} != ${expected}`);

test('coupled material path rejects legacy stopping and invalid physical boundaries',()=>{
 assert.throws(()=>simulateCoupledTarget(DEFAULT_FUSION_BEAM,config()),/explicit material/);
 assert.throws(()=>simulateCoupledTarget({...beam,targetColumnM2:1e23},config()),RangeError);
 for(const c of [config({depthCells:1}),config({pulseDuty:1.1}),config({diffusivityM2S:-1}),config({implantationWeights:[1,1]}),config({relativeTolerance:0})])
  assert.throws(()=>simulateCoupledTarget(beam,c),RangeError);
});

test('closed zero-beam target preserves populations and temperatures',()=>{
 const r=simulateCoupledTarget({...beam,beamCurrentA:0,targetColumnM2:3e21},config());
 for(const s of r.history){
  assert.ok(s.temperatureK.every(t=>t===DEFAULT_COUPLED_TARGET.initialK));
  assert.ok(s.tritiumFraction.every(t=>t===.3));assert.ok(s.deuteriumFraction.every(t=>t===.7));
  assert.equal(s.cumulativeNeutrons,0);assert.equal(s.incidentD,0);
  assert.equal(s.beamOn,false);assert.equal(s.beamOnS,0);
 }
});

test('beam-off release converges to independent exponential without artificial heat coupling',()=>{
 const c=config({releaseAttemptRateS:.7,releaseActivationEV:0,relativeTolerance:1e-7,absoluteTolerance:1e-10});
 const r=simulateCoupledTarget({...beam,beamCurrentA:0,targetColumnM2:3e21},c);
 close(r.final.tritiumFraction[0],.3*Math.exp(-.7),1,5e-5);
 close(r.final.deuteriumFraction[0],.7*Math.exp(-.7),1,5e-5);
 close(r.final.releasedT+1e22*.01*r.final.tritiumFraction[0],3e19,3e19);
});

test('one shared state closes isotope, projectile, nuclear and thermal ledgers',()=>{
 const r=simulateCoupledTarget({...beam,beamCurrentA:.1,beamAreaM2:.001,targetColumnM2:6e21},config({replacementProbability:.6,releaseAttemptRateS:.02,renewalRateS:.01,diffusivityM2S:1e-13}));
 for(const s of r.history){
  assert.ok([...s.tritiumFraction,...s.deuteriumFraction,...s.vacancyFraction].every(x=>x>=0));
  for(const residual of Object.values(s.atomResiduals))close(residual,0,Math.max(s.incidentD,1e19));
  close(s.energy.beamResidualJ,0,Math.max(1,s.energy.incidentBeamJ+s.energy.nuclearJ));
  close(s.energy.thermalResidualJ,0,Math.max(1,s.energy.depositedJ));
 }
 assert.ok(r.solver.maxErrorRatio<=1);
});

test('pulse edges and shutoff preserve exact independently counted beam-on time',()=>{
 const c=config({pulsePeriodS:.3,pulseDuty:.4,cooldownS:.5});
 const r=simulateCoupledTarget({...beam,exposureS:1},c);
 const expected=.12+.12+.12+.1;
 close(r.final.beamOnS,expected,1,1e-12);
 for(const s of r.history.filter(s=>s.timeS>=1)){assert.equal(s.beamOn,false);assert.equal(s.neutronRateS,0);}
 const off=r.history.find(s=>s.timeS===1)!;
 assert.equal(r.final.cumulativeNeutrons,off.cumulativeNeutrons);
});

test('fuel-free material still deposits incident beam heat without false neutrons',()=>{
 const r=simulateCoupledTarget({...beam,targetColumnM2:0},config());
 assert.equal(r.final.cumulativeNeutrons,0);assert.ok(r.final.energy.depositedJ>0);
 close(r.final.energy.depositedJ,r.final.energy.incidentBeamJ,r.final.energy.incidentBeamJ);
});

test('replacement changes evolving source and cell heat instead of retaining initial outputs',()=>{
 const source={...beam,beamCurrentA:.1,beamAreaM2:1e-4};
 const c=config({replacementProbability:.8,relativeTolerance:5e-4});
 const r=simulateCoupledTarget(source,c),early=r.history[0],late=r.history.at(-2)!;
 assert.ok(late.neutronRateS<early.neutronRateS*.8);
 assert.ok(late.tritiumFraction[0]<early.tritiumFraction[0]);
 assert.notEqual(late.assemblyHeatW,early.assemblyHeatW);
});

test('temperature feedback acts through explicitly supplied Arrhenius release coefficients',()=>{
 const c=config({releaseAttemptRateS:10,releaseActivationEV:.1,backHeatTransferWM2K:0});
 const cold=simulateCoupledTarget({...beam,beamCurrentA:0},c);
 const hot=simulateCoupledTarget({...beam,beamCurrentA:0}, {...c,initialK:600,coolantK:600});
 assert.ok(hot.final.tritiumFraction[0]<cold.final.tritiumFraction[0]);
 const noRelease=simulateCoupledTarget({...beam,beamCurrentA:0},{...c,releaseAttemptRateS:0,initialK:600,coolantK:600});
 assert.equal(noRelease.final.tritiumFraction[0],1);
});

test('runtime null coefficients are rejected instead of coerced to zero',()=>{
 const c={...config(),releaseAttemptRateS:null} as unknown as CoupledTargetConfig;
 assert.throws(()=>simulateCoupledTarget(beam,c),RangeError);
});

test('large implicit diffusion preserves a uniform closed target without cancellation drift',()=>{
 const c=config({diffusivityM2S:1e-3,maxStepS:.2});
 const r=simulateCoupledTarget({...beam,beamCurrentA:0,targetColumnM2:3e21},c);
 for(const s of r.history){
  for(const f of s.tritiumFraction)close(f,.3,1,1e-10);
  for(const f of s.deuteriumFraction)close(f,.7,1,1e-10);
  close(s.atomResiduals.tritium,0,1e20,1e-10);
 }
});

test('a weak beam and large implicit diffusion retain valid material fractions',()=>{
 const r=simulateCoupledTarget({...beam,beamCurrentA:1e-8,targetColumnM2:3e21},config({diffusivityM2S:1e-3}));
 assert.ok(r.final.cumulativeNeutrons>0);
 for(const s of r.history)close(s.atomResiduals.sites,0,1e20,1e-10);
});

test('boundary release acts on the specified physical face with cell-width scaling',()=>{
 const c=config({surfaceReleaseVelocityMS:1e-7,relativeTolerance:1e-7,absoluteTolerance:1e-10});
 const r=simulateCoupledTarget({...beam,beamCurrentA:0},c);
 close(r.final.tritiumFraction[0],Math.exp(-1e-7/(c.filmThicknessM/c.depthCells)),1,5e-5);
 for(const t of r.final.tritiumFraction.slice(1))assert.equal(t,1);
 close(r.final.releasedT+(r.final.tritiumFraction.reduce((a,b)=>a+b,0)/c.depthCells)*1e20,1e20,1e20);
 assert.equal(r.final.temperatureK.length,c.depthCells+c.backingCells);
});

test('renewal can create a resolved reaction channel from an initially fuel-free matrix',()=>{
 const r=simulateCoupledTarget({...beam,targetColumnM2:0},config({renewalRateS:.5,renewalTritiumFraction:1}));
 assert.equal(r.initial.neutronRateS,0);assert.ok(r.final.cumulativeNeutrons>0);assert.ok(r.final.addedT>0);
 close(r.final.atomResiduals.tritium,0,1e20);
});

test('renewal from zero T retains a valid atomic composition at a nearly full lattice',()=>{
 const source={...beam,materialColumnM2:1e20,targetColumnM2:0,exposureS:.01};
 const r=simulateCoupledTarget(source,config({depthCells:2,maxStepS:.001,renewalRateS:.2}));
 assert.ok(r.final.cumulativeNeutrons>0);
 close(r.final.atomResiduals.sites,0,1e18,1e-10);
});

test('derived inventory outputs reject overflow despite finite primitive inputs',()=>{
 assert.throws(()=>simulateCoupledTarget({...beam,beamCurrentA:0,targetColumnM2:0,beamAreaM2:1e285},
  config({depthCells:2,renewalRateS:1000})),/output exceeds the finite numeric domain/);
});

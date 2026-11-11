import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateTargetLoading, type LoadingSource} from '../src/target-loading.js';

const fixture=(overrides:Partial<LoadingSource>={}):LoadingSource=>({
 config:{targetColumnM2:1e20,beamAreaM2:.1,exposureS:10},siteColumnM2:1e20,
 unitLoadingOpticalDepth:.8,particleRateS:1e18,...overrides,
});
const close=(a:number,b:number,scale=1,tol=2e-12)=>assert.ok(Math.abs(a-b)<=tol*Math.max(scale,Math.abs(b)),`${a} != ${b}`);

test('fusion-only loading matches exact nonlinear depletion and atom counts at every sample',()=>{
 const source=fixture(),r=simulateTargetLoading(source,{replacementProbability:0,intervals:50});
 const sigma=source.unitLoadingOpticalDepth/source.siteColumnM2,j=source.particleRateS/source.config.beamAreaM2;
 for(const s of r.history){
  const tau=Math.log1p(Math.expm1(.8)*Math.exp(-j*sigma*s.timeS));
  close(s.tritiumColumnM2,tau/sigma,1e20);
  close(s.cumulativeNeutrons,(1e20-tau/sigma)*.1,1e19);
  assert.equal(s.deuteriumColumnM2,0);
  close(s.vacancyColumnM2,1e20-s.tritiumColumnM2,1e20);
 }
});

test('exchange-only zero nuclear hazard matches exact site replacement including outgoing D',()=>{
 const source=fixture({unitLoadingOpticalDepth:0}),eta=.7,r=simulateTargetLoading(source,{replacementProbability:eta,intervals:10});
 for(const s of r.history){
  const incoming=source.particleRateS*s.timeS,retained=eta*incoming;
  const t=source.config.targetColumnM2*Math.exp(-retained/(source.siteColumnM2*source.config.beamAreaM2));
  close(s.tritiumColumnM2,t,1e20);
  close(s.deuteriumColumnM2,source.siteColumnM2-t,1e20);
  assert.equal(s.vacancyColumnM2,0);
  assert.equal(s.cumulativeNeutrons,0);
  close(s.releasedT,(1e20-t)*.1,1e19);
  close(s.releasedD,retained-s.deuteriumColumnM2*.1,1e19);
 }
});

test('simultaneous coupled dynamics preserve sites and incident/target ledgers without negative species',()=>{
 for(const eta of [0,.4,1])for(const initial of [0,.3,1]){
  const source=fixture({config:{targetColumnM2:initial*1e20,beamAreaM2:.1,exposureS:100},particleRateS:1e20});
  const r=simulateTargetLoading(source,{replacementProbability:eta,intervals:100});
  for(const s of r.history){
   for(const key of ['tritiumColumnM2','deuteriumColumnM2','vacancyColumnM2','cumulativeNeutrons','retainedIncomingD','unretainedD','releasedT','releasedD'] as const)
    assert.ok(s[key]>=0,`${key}: ${s[key]}`);
   for(const key of ['siteResidualNuclei','tritiumResidualNuclei','deuteriumResidualNuclei','incidentResidualNuclei'] as const)
    close(s[key],0,1e22);
   close(s.retainedIncomingD,eta*(s.incidentD-s.fusedT),1e22);
  }
 }
});

test('tiny exchange dose retains signed outgoing-D leading term instead of cancellation',()=>{
 const source=fixture({unitLoadingOpticalDepth:0,particleRateS:1}),r=simulateTargetLoading(source,{replacementProbability:1,intervals:10});
 assert.ok(r.final.releasedD>0);
 const arrivals=source.particleRateS*source.config.exposureS,sites=source.siteColumnM2*source.config.beamAreaM2;
 close(r.final.releasedD,arrivals*arrivals/(2*sites),1e-100,2e-12);
});

test('zero current and zero exposure preserve initial mixed sites and give zero events',()=>{
 for(const source of [fixture({particleRateS:0}),fixture({config:{targetColumnM2:3e19,beamAreaM2:.1,exposureS:0}})]){
  const r=simulateTargetLoading(source,{replacementProbability:1});
  close(r.final.tritiumColumnM2,source.config.targetColumnM2,1e20);
  assert.equal(r.final.cumulativeNeutrons,0);assert.equal(r.final.retainedIncomingD,0);
  assert.equal(r.final.incidentD,0);assert.equal(r.final.vacancyColumnM2,0);
 }
});

test('large optical depth and fluence stay finite without an exp(tau) overflow',()=>{
 const source=fixture({unitLoadingOpticalDepth:1000,particleRateS:1e22});
 const r=simulateTargetLoading(source,{replacementProbability:.2,intervals:10});
 assert.ok(r.history.every(s=>Object.values(s).every(Number.isFinite)));
 assert.ok(r.final.tritiumColumnM2>=0);assert.ok(r.final.cumulativeNeutrons<=1e19);
 close(r.final.incidentResidualNuclei,0,source.particleRateS*10);
});

test('opaque targets retain finite incident-limited fusion counts below the inventory subtraction scale',()=>{
 const source=fixture({config:{targetColumnM2:1,beamAreaM2:1,exposureS:1},
  siteColumnM2:1,unitLoadingOpticalDepth:1e20,particleRateS:1e-18});
 const r=simulateTargetLoading(source,{replacementProbability:0,intervals:10});
 // Every incident D reacts while T remains vastly larger than incident fluence.
 assert.ok(r.final.cumulativeNeutrons>0);
 close(r.final.cumulativeNeutrons,1e-18,1e-18,2e-14);
 close(r.final.vacancyColumnM2,1e-18,1e-18,2e-14);
 close(r.final.unretainedD,0,1e-18,2e-14);
});

test('fusion-only opaque target keeps tiny transmitted arrivals positive without clipping',()=>{
 const source=fixture({config:{targetColumnM2:.65,beamAreaM2:1,exposureS:1e-6},
  siteColumnM2:1,unitLoadingOpticalDepth:1000,particleRateS:1});
 const r=simulateTargetLoading(source,{replacementProbability:0,intervals:10});
 assert.ok(r.final.unretainedD>0);
 close(r.final.unretainedD,Math.log1p(Math.exp(.001-650)*-Math.expm1(-.001))/1000,1e-300,2e-14);
 for(const s of r.history){
  assert.ok(s.unretainedD>=0);
  assert.ok(s.cumulativeNeutrons<=s.incidentD);
 }
});

test('high-dose coupled fusion agrees with the independent simultaneous reference at different plot resolutions',()=>{
 const source=fixture({config:{targetColumnM2:.65,beamAreaM2:1,exposureS:1000},
  siteColumnM2:1,unitLoadingOpticalDepth:1e-6,particleRateS:1});
 // SciPy Radau and independent RK4 simultaneous-equation reference.
 const expected=8.124991164071884e-7;
 for(const intervals of [10,400,1600]){
  const r=simulateTargetLoading(source,{replacementProbability:.8,intervals});
  close(r.final.cumulativeNeutrons,expected,expected,2e-9);
  assert.ok(r.solver.maxAcceptedErrorRatio<=1);
  assert.ok(r.solver.maxScaledConservationResidual<2e-11);
  assert.ok(r.history.some(s=>s.timeS>0&&s.timeS<source.config.exposureS/intervals));
 }
});

test('dose ten million resolves exhaustion with bounded work and positive event ledgers',()=>{
 const source=fixture({config:{targetColumnM2:.65,beamAreaM2:1,exposureS:1e7},
  siteColumnM2:1,unitLoadingOpticalDepth:1e-6,particleRateS:1});
 const r=simulateTargetLoading(source,{replacementProbability:.8,intervals:20});
 close(r.final.cumulativeNeutrons,8.124991164071884e-7,1e-6,2e-9);
 assert.ok(r.solver.acceptedSteps<2500);
 assert.ok(r.solver.rejectedSteps<1000);
 assert.ok(r.history.every(s=>s.tritiumFraction>=0&&s.deuteriumFraction>=0&&s.vacancyFraction>=0));
 assert.ok(r.history.every(s=>s.releasedT>=0&&s.releasedD>=0&&s.unretainedD>=0));
 close(r.final.tritiumFraction+r.final.deuteriumFraction+r.final.vacancyFraction,1);
 assert.ok(r.solver.maxScaledConservationResidual<2e-11);
});

test('loading rejects absent sites, overfilled T and unphysical replacement settings',()=>{
 for(const source of [fixture({siteColumnM2:0}),fixture({siteColumnM2:1e19}),fixture({unitLoadingOpticalDepth:-1}),fixture({particleRateS:Infinity})])
  assert.throws(()=>simulateTargetLoading(source,{replacementProbability:0}),RangeError);
 for(const config of [{replacementProbability:-.1},{replacementProbability:1.1},{replacementProbability:0,intervals:9},{replacementProbability:0,intervals:6401},{replacementProbability:NaN},
  {replacementProbability:.5,relativeTolerance:1e-15},{replacementProbability:.5,absoluteTolerance:0}])
  assert.throws(()=>simulateTargetLoading(fixture(),config),RangeError);
});

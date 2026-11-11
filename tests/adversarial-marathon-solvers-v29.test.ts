import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUSION_BEAM,simulateFusionBeam,dtCrossSectionM2} from '../src/fusion-reactor.js';
import {simulateTargetLoading} from '../src/target-loading.js';
import {simulateTargetExposure,DEFAULT_TARGET_EXPOSURE} from '../src/target-exposure.js';
import {isotropicDiskReference} from '../src/neutron-geometry.js';

const close=(a:number,b:number,rel=1e-10,abs=0)=>assert.ok(Math.abs(a-b)<=abs+rel*Math.abs(b),`${a} != ${b}`);

test('adversarial opaque depletion retains residual T and instantaneous yield at the inventory crossover',()=>{
 for(const tau of [100,1e10,1e16,1e20]){
  const source={config:{targetColumnM2:1,beamAreaM2:1,exposureS:1},siteColumnM2:1,
   unitLoadingOpticalDepth:tau,particleRateS:1};
  const r=simulateTargetLoading(source,{replacementProbability:0,intervals:10});
  // Exact dT/du=-(1-exp(-tau*T)) gives tau*T=log(2-exp(-tau)) at u=T0=1.
  const residualOpticalDepth=Math.log(2-Math.exp(-tau));
  close(r.final.tritiumFraction,residualOpticalDepth/tau,1e-6);
  close(r.final.neutronRateS,-Math.expm1(-residualOpticalDepth),1e-6);
 }
});

test('fusion-only residual yield resolves neighboring opaque doses without corrupting event ledgers',()=>{
 for(const tau of [100,1e10,1e16,1e20])for(const f0 of [.25,1]){
  const doses=new Set([f0*(1-Number.EPSILON),f0,f0*(1+Number.EPSILON),f0-1/tau,f0+1/tau]);
  for(const dose of doses){
   const r=simulateTargetLoading({config:{targetColumnM2:f0,beamAreaM2:1,exposureS:dose},
    siteColumnM2:1,unitLoadingOpticalDepth:tau,particleRateS:1},{replacementProbability:0,intervals:10});
   const delta=tau*(f0-dose),factor=1-Math.exp(-tau*f0);
   const ratio=delta>30?Infinity:factor*Math.exp(delta);
   const expected=ratio===Infinity?1:ratio/(1+ratio);
   assert.equal(r.final.timeS,dose,'final sample must represent the requested exposure exactly');
   close(r.final.neutronRateS,expected,3e-12,1e-15);
   assert.ok(r.final.tritiumFraction>=0);
   close(r.final.tritiumFraction+r.final.fusedT,f0,0,64*Number.EPSILON);
   close(r.final.fusedT+r.final.unretainedD,dose,0,64*Number.EPSILON);
  }
 }
});

test('fusion-only analytic limits cover absent hazard/fuel/dose and thin UI slabs',()=>{
 for(const tau of [0,.005,1e20])for(const f0 of [0,.65,1])for(const dose of [0,.1]){
  const r=simulateTargetLoading({config:{targetColumnM2:f0,beamAreaM2:1,exposureS:dose},
   siteColumnM2:1,unitLoadingOpticalDepth:tau,particleRateS:1},{replacementProbability:0,intervals:10});
  if(tau===0||f0===0||dose===0){
   assert.equal(r.final.fusedT,0);assert.equal(r.final.tritiumFraction,f0);
  }
  for(const s of r.history)assert.ok(Object.values(s).every(Number.isFinite));
 }
 for(const dose of [.01,1,6]){
  const tau=.005,f0=.65,r=simulateTargetLoading({config:{targetColumnM2:f0,beamAreaM2:1,exposureS:dose},
   siteColumnM2:1,unitLoadingOpticalDepth:tau,particleRateS:1},{replacementProbability:0,intervals:10});
  const depth=Math.log1p(Math.expm1(tau*f0)*Math.exp(-tau*dose));
  close(r.final.tritiumFraction,depth/tau,3e-14);
  close(r.final.neutronRateS,-Math.expm1(-depth),3e-14);
 }
 for(const tau of [1e100,1e300]){
  const r=simulateTargetLoading({config:{targetColumnM2:1,beamAreaM2:1,exposureS:1},
   siteColumnM2:1,unitLoadingOpticalDepth:tau,particleRateS:1},{replacementProbability:0,intervals:10});
  close(r.final.tritiumFraction,Math.LN2/tau,1e-13);
  close(r.final.neutronRateS,.5,1e-13);
 }
});

test('analytic and coupled loading samples finish at the requested exposure, including neighboring doubles',()=>{
 for(const eta of [0,.4])for(const exposureS of [1-Number.EPSILON/2,.25-1e-16,100]){
  const r=simulateTargetLoading({config:{targetColumnM2:.65,beamAreaM2:1,exposureS},
   siteColumnM2:1,unitLoadingOpticalDepth:.005,particleRateS:1},{replacementProbability:eta,intervals:10});
  assert.equal(r.final.timeS,exposureS);
  assert.equal(r.final.incidentD,exposureS);
 }
});

// Independent RK4 of survival and energy event integrals in depth fraction.
// No production attenuation or conditional-reaction-position implementation is used.
function slabReference(energy:number,loss:number,column:number,n:number){
 const slope=energy*loss,h=1/n;let y=[1,0,0];
 const rhs=(u:number,v:number[])=>{
  const e=energy-slope*u,rate=column*dtCrossSectionM2(.6*e)*v[0];
  return [-rate,slope*v[0],e*rate];
 };
 for(let i=0;i<n;i++){
  const a=rhs(i*h,y),b=rhs((i+.5)*h,y.map((v,j)=>v+h*a[j]/2)),
   c=rhs((i+.5)*h,y.map((v,j)=>v+h*b[j]/2)),d=rhs((i+1)*h,y.map((v,j)=>v+h*c[j]));
  y=y.map((v,j)=>v+h*(a[j]+2*b[j]+2*c[j]+d[j])/6);
 }
 return {survival:y[0],stopping:y[1],reactionBeam:y[2]};
}

test('independent continuous-depth reference confirms slab refinement and the energy ledger',()=>{
 for(const beamEnergyKeV of [20,100,500]){
  const c={...DEFAULT_FUSION_BEAM,beamEnergyKeV,stoppingFraction:.9,targetColumnM2:1e25};
  const reference=slabReference(beamEnergyKeV,.9,1e25,32768),fineReference=slabReference(beamEnergyKeV,.9,1e25,65536);
  close(reference.survival,fineReference.survival,1e-12,1e-14);
  const results=[25,100,400,1600].map(intervals=>simulateFusionBeam({...c,intervals}));
  const errors=results.map(r=>Math.abs(r.transmittedFraction-reference.survival));
  assert.ok(errors[0]>errors[1]&&errors[1]>errors[2]&&errors[2]>errors[3]);
  const r=results[2],perParticleKeV=r.beamPowerW/c.beamEnergyKeV;
  close(r.beamStoppingPowerW/perParticleKeV,reference.stopping,3e-6);
  close(r.relativeEnergyResidual!,0,0,1e-13);
  assert.ok(errors[2]<2e-7);
 }
});

test('zero slowing gives exact attenuation and isotropic-CM product-energy means',()=>{
 for(const beamEnergyKeV of [20,100,500])for(const targetColumnM2 of [0,1e19,1e25]){
  const r=simulateFusionBeam({...DEFAULT_FUSION_BEAM,beamEnergyKeV,targetColumnM2,stoppingFraction:0});
  const p=-Math.expm1(-targetColumnM2*dtCrossSectionM2(.6*beamEnergyKeV));
  close(r.fusionProbability,p,3e-13,1e-30);
  close(r.neutronPowerW+r.alphaPowerW,r.nuclearPowerW+r.beamPowerW*p,1e-13,1e-20);
  close(r.transmittedBeamPowerW,r.beamPowerW*(1-p),1e-13);
 }
});

function loadingReference(tau:number,eta:number,f0:number,dose:number,n:number){
 let y=[f0,1-f0,0,0,0,0,0];const dt=dose/n;
 const rhs=(v:number[])=>{
  const p=-Math.expm1(-tau*v[0]),a=1-p,r=eta*a;
  return [-p-r*v[0],r*(1-v[1]),p-r*v[2],p,a,r*v[0],r*v[1]];
 };
 for(let i=0;i<n;i++){
  const a=rhs(y),b=rhs(y.map((v,j)=>v+dt*a[j]/2)),c=rhs(y.map((v,j)=>v+dt*b[j]/2)),d=rhs(y.map((v,j)=>v+dt*c[j]));
  y=y.map((v,j)=>v+dt*(a[j]+2*b[j]+2*c[j]+d[j])/6);
 }
 return y;
}

test('coupled transformed evolution matches independently advanced untransformed physical populations',()=>{
 for(const tau of [.005,.8,100])for(const eta of [.05,.8])for(const f0 of [.01,.65])for(const dose of [.1,10]){
  const a=loadingReference(tau,eta,f0,dose,32768),b=loadingReference(tau,eta,f0,dose,65536);
  a.forEach((v,i)=>close(v,b[i],1e-8,3e-12));
  const r=simulateTargetLoading({config:{targetColumnM2:f0,beamAreaM2:1,exposureS:dose},siteColumnM2:1,
   unitLoadingOpticalDepth:tau,particleRateS:1},{replacementProbability:eta,intervals:20});
  const s=r.final,actual=[s.tritiumFraction,s.deuteriumFraction,s.vacancyFraction,s.fusedT,s.incidentD-s.fusedT,s.releasedT,s.releasedD];
  actual.forEach((v,i)=>close(v,b[i],3e-8,3e-11));
  close(s.retainedIncomingD,eta*b[4],3e-8,3e-11);
 }
});

test('one-node thermal endpoints bound the entire history and conserve signed heat',()=>{
 const b=simulateFusionBeam({...DEFAULT_FUSION_BEAM,exposureS:3});
 for(const initialK of [200,293.15,2000])for(const heatTransferWM2K of [0,1e-12,1,1e8]){
  const c={...DEFAULT_TARGET_EXPOSURE,initialK,heatTransferWM2K,cooldownS:7};
  const r=simulateTargetExposure(b,c),max=Math.max(initialK,r.endOn.temperatureK,r.final.temperatureK);
  close(r.peakTemperatureK,max,1e-14);
  for(const s of r.history){
   assert.ok(s.temperatureK>0&&s.temperatureK<=max*(1+1e-14));
   close(s.storedEnergyJ,b.config.beamAreaM2*c.arealHeatCapacityJm2K*(s.temperatureK-initialK),1e-8,1e-7);
   close(s.depositedEnergyJ,s.storedEnergyJ+s.heatToCoolantJ,1e-12,1e-9);
  }
 }
});

test('isotropic disk current matches an independent surface quadrature across near/far geometry',()=>{
 for(const d of [.1,.5,3])for(const area of [1e-4,.001,.01]){
  const rate=1e12,r=isotropicDiskReference({neutronRateS:rate,distanceM:d,sampleAreaM2:area});
  // Integrate in s=r^2: dOmega/(4pi)=d/(4(d²+s)^(3/2)) ds.
  const top=area/Math.PI,n=10000,h=top/n;let sum=0;
  for(let i=0;i<=n;i++)sum+=(i===0||i===n?1:i%2?4:2)*d/(4*(d*d+i*h)**1.5);
  close(r.interceptedFraction,sum*h/3,2e-12);
  close(r.meanPlaneCurrentM2S,r.interceptedRateS/area,1e-14);
 }
});

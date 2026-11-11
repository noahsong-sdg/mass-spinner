import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUSION_BEAM,simulateFusionBeam,dtCrossSectionM2} from '../src/fusion-reactor.js';
import {litStoppingCrossSection} from '../src/deuteron-stopping.js';
import {simulateTargetLoading} from '../src/target-loading.js';
import {DEFAULT_TARGET_EXPOSURE,simulateTargetExposure} from '../src/target-exposure.js';

const close=(actual:number,expected:number,rel=2e-8,abs=2e-11)=>assert.ok(
 Math.abs(actual-expected)<=abs+rel*Math.abs(expected),`${actual} != ${expected}`);
function simpson(f:(x:number)=>number,a:number,b:number,n:number){
 const h=(b-a)/n;let sum=f(a)+f(b);
 for(let i=1;i<n;i++)sum+=(i%2?4:2)*f(a+i*h);
 return sum*h/3;
}

// Eliminate time from the physical T equation, then integrate scalar quadratures.
// No production RK tableau, log-survival state or event-ledger helper is used.
function fuelQuadrature(tau:number,eta:number,f0:number,dose:number,n:number){
 const at=(x:number)=>{
  const f=f0*Math.exp(-x),p=-Math.expm1(-tau*f),nonfusion=Math.exp(-tau*f);
  return {f,p,nonfusion,denominator:tau*(tau*f===0?1:p/(tau*f))+eta*nonfusion};
 };
 const elapsed=(x:number)=>simpson(z=>1/at(z).denominator,0,x,n);
 let low=0,high=(tau+eta)*dose;
 for(let i=0;i<55;i++){
  const mid=(low+high)/2;if(elapsed(mid)>dose)high=mid;else low=mid;
 }
 const x=(low+high)/2;
 const q=simpson(z=>{const a=at(z);return eta*a.nonfusion/a.denominator;},0,x,n);
 const fused=simpson(z=>{const a=at(z);return a.p/a.denominator;},0,x,n);
 return {t:f0*Math.exp(-x),d:1-f0*Math.exp(-q),v:f0*Math.exp(-q)-f0*Math.exp(-x),fused};
}

test('independent fuel-coordinate quadrature checks coupled replacement and fusion beyond prior dose grid',t=>{
 for(const [tau,eta,f0,dose]of [[.03,.3,.93,3.7],[2.4,.02,.18,.7],[11,.94,.87,1.4],[.4,.001,.37,19]]){
  const a=fuelQuadrature(tau,eta,f0,dose,4096),b=fuelQuadrature(tau,eta,f0,dose,8192);
  for(const key of ['t','d','v','fused']as const)close(a[key],b[key],1e-10,2e-12);
  const r=simulateTargetLoading({config:{targetColumnM2:f0,beamAreaM2:1,exposureS:dose},
   siteColumnM2:1,unitLoadingOpticalDepth:tau,particleRateS:1},{replacementProbability:eta,intervals:31});
  for(const [actual,expected]of [[r.final.tritiumFraction,b.t],[r.final.deuteriumFraction,b.d],
   [r.final.vacancyFraction,b.v],[r.final.fusedT,b.fused]])close(actual,expected,2e-9,3e-11);
  t.diagnostic(JSON.stringify({tau,eta,f0,dose,reference:b,actual:r.final,solver:r.solver}));
 }
});

test('material energy and reaction paths satisfy independent energy-coordinate column integrals',t=>{
 for(const [beamEnergyKeV,materialColumnM2]of [[20,2e21],[100,4e22],[500,1e23]]){
  const f=.37,c={...DEFAULT_FUSION_BEAM,beamEnergyKeV,stoppingModel:'geant4-bragg' as const,
   materialColumnM2,targetColumnM2:f*materialColumnM2};
  const coarse=simulateFusionBeam({...c,intervals:100}),fine=simulateFusionBeam({...c,intervals:3200});
  const path=(r:ReturnType<typeof simulateFusionBeam>,n:number)=>({
   column:simpson(e=>1/litStoppingCrossSection(e).totalKeVM2,r.exitEnergyKeV,beamEnergyKeV,n),
   depth:simpson(e=>dtCrossSectionM2(.6*e)/litStoppingCrossSection(e).totalKeVM2,r.exitEnergyKeV,beamEnergyKeV,n),
  });
  const a=path(fine,32768),b=path(fine,65536),old=path(coarse,65536);
  close(a.column,b.column,3e-10,0);close(a.depth,b.depth,3e-10,1e-18);
  close(b.column,materialColumnM2,2e-8,0);
  close(fine.unitLoadingOpticalDepth,b.depth,2e-7,1e-16);
  close(fine.opticalDepth,f*b.depth,2e-7,1e-16);
  const fineError=Math.abs(fine.unitLoadingOpticalDepth/b.depth-1),coarseError=Math.abs(coarse.unitLoadingOpticalDepth/old.depth-1);
  assert.ok(fineError<coarseError/50,'reaction quadrature must improve under slab refinement');
  t.diagnostic(JSON.stringify({beamEnergyKeV,materialColumnM2,exit: fine.exitEnergyKeV,columnResidual:b.column/materialColumnM2-1,fineError,coarseError}));
 }
});

test('alpha deposition changes target heat and thermal response while preserving source reaction probability',()=>{
 const zero=simulateFusionBeam({...DEFAULT_FUSION_BEAM,alphaDepositedFraction:0}),
  full=simulateFusionBeam({...DEFAULT_FUSION_BEAM,alphaDepositedFraction:1});
 assert.equal(zero.fusionProbability,full.fusionProbability);
 assert.equal(zero.neutronRateS,full.neutronRateS);
 close(full.targetLayerHeatW-zero.targetLayerHeatW,full.alphaPowerW,1e-12,1e-12);
 const c={...DEFAULT_TARGET_EXPOSURE,cooldownS:0},a=simulateTargetExposure(zero,c),b=simulateTargetExposure(full,c);
 const transfer=c.heatTransferWM2K,capacity=c.arealHeatCapacityJm2K,seconds=zero.config.exposureS;
 const expected=full.alphaPowerW/zero.config.beamAreaM2/transfer*(1-Math.exp(-transfer*seconds/capacity));
 close(b.endOn.temperatureK-a.endOn.temperatureK,expected,1e-10,1e-11);
 close(b.endOn.depositedEnergyJ-a.endOn.depositedEnergyJ,full.alphaPowerW*seconds,1e-12,1e-10);
});

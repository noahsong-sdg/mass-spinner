// Independent reviewer controls. Execute only in safe-dev, never on the host.
import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateLaurelin, ddReactivity} from '../../src/laurelin-physics.js';

const kev = 1.602176634e-16, md = 3.3435837724e-27;
const relative = (a,b,tolerance=3e-9) => assert.ok(
 Math.abs(a-b) <= tolerance*Math.max(Math.abs(b),1e-90), `${a} != ${b}`);

// Whole-phase analytic propagator, with a separately integrated work/loss
// integrand: not the production per-step energy-difference integral formula.
function integral(fn,a,b,tolerance){
 const simpson=(l,r,fl,fm,fr)=>(r-l)*(fl+4*fm+fr)/6;
 function split(l,r,fl,fm,fr,whole,tol,depth){
  const m=(l+r)/2, f1=fn((l+m)/2), f3=fn((m+r)/2);
  const left=simpson(l,m,fl,f1,fm),right=simpson(m,r,fm,f3,fr),error=left+right-whole;
  if(Math.abs(error)<=15*tol)return left+right+error/15;
  assert.ok(depth>0,'independent quadrature did not converge');
  return split(l,m,fl,f1,fm,left,tol/2,depth-1)+split(m,r,fm,f3,fr,right,tol/2,depth-1);
 }
 const fl=fn(a),fm=fn((a+b)/2),fr=fn(b);
 return split(a,b,fl,fm,fr,simpson(a,b,fl,fm,fr),tolerance,24);
}
function oracle(config){
 const volume=4*Math.PI*config.radiusM**2*(config.lengthM/2)/3;
 const N=volume*config.densityM3,initial=3*N*kev*config.temperatureKeV;
 const merge=.5*N*md*(config.speedKmS*1000)**2;
 const duration=config.durationUs*1e-6,tau=config.confinementUs*1e-6;
 let U=initial,loss=0,compression=0,expansion=0;
 const boundaries=[U];
 for(const [fraction,sign,power] of [
  [.12,0,0],[.20,0,merge/(.20*duration)],[.24,1,0],
  [.20,0,0],[.24,-1,0]]){
  const dt=fraction*duration,workCoefficient=sign*2*Math.log(config.compression)/(3*.24*duration);
  const a=workCoefficient-1/tau,start=U;
  const value=t=>Math.abs(a*dt)<1e-12?start+power*t:
   start*Math.exp(a*t)+power*Math.expm1(a*t)/a;
  const area=integral(value,0,dt,1e-11*Math.max(value(0),value(dt))*dt);
  U=value(dt);loss+=area/tau;
  if(sign>0)compression+=workCoefficient*area;
  if(sign<0)expansion-=workCoefficient*area;
  boundaries.push(U);
 }
 return {U,loss,compression,expansion,boundaries};
}

test('independent whole-phase propagation and work quadrature cover limiting regimes',()=>{
 const cases=[{}, {compression:1,speedKmS:0},
  {compression:30,durationUs:25,confinementUs:2000,temperatureKeV:5,speedKmS:600},
  {compression:1,durationUs:1000,confinementUs:10,speedKmS:0},
  {compression:Math.exp(.12),durationUs:100,confinementUs:300,speedKmS:0}];
 for(const input of cases)for(const steps of [100,500,4000]){
  const actual=simulateLaurelin(input,steps),expected=oracle(actual.config);
  for(const [a,b] of [[actual.remainingJ,expected.U],[actual.lossJ,expected.loss],
   [actual.compressionJ,expected.compression],[actual.expansionJ,expected.expansion]])relative(a,b);
  for(const [i,f] of [0,.12,.32,.56,.76,1].entries())
   relative(actual.samples[Math.round(f*steps)].energyJ,expected.boundaries[i]);
 }
});

test('DD full Padé form agrees on both branches throughout the published window',()=>{
 // PlasmaPy coefficient JSON reopened 2026-11-14. Full C1..C7 form,
 // including zero coefficients, avoids relying on production simplification.
 const rows={neutron:[5.43360e-12,5.85778e-3,7.68222e-3,0,-2.96400e-6,0,0],
  proton:[5.65718e-12,3.41267e-3,1.99167e-3,0,1.05060e-5,0,0]};
 for(const [branch,[C1,C2,C3,C4,C5,C6,C7]]of Object.entries(rows))
  for(const T of [.2,.5,1,3,10,30,60,100]){
   const theta=T/(1-T*(C2+T*(C4+T*C6))/(1+T*(C3+T*(C5+T*C7))));
   const xi=(31.397**2/(4*theta))**(1/3);
   const cm3=C1*theta*Math.sqrt(xi/(937814*T**3))*Math.exp(-3*xi);
   relative(ddReactivity(T,branch),cm3*1e-6,3e-14);
  }
});

test('branch normalization and inventory scaling are consistent independently',()=>{
 const result=simulateLaurelin(),s=result.samples[0],N=s.densityM3*s.volumeM3;
 relative(s.neutronRateS,.5*N*s.densityM3*ddReactivity(s.temperatureKeV,'neutron'));
 relative(result.burnFraction,2*(result.neutrons+result.protons)/N);
 relative(result.neutronJ,result.neutrons*2.45*1.602176634e-13);
 relative(result.chargedJ,(result.protons*4.03+result.neutrons*.82)*1.602176634e-13);
});

test('no fusion electrical gain can emerge from a lossy compression/recovery cycle',()=>{
 for(const compression of [1,8,30]){
  const perfect=simulateLaurelin({compression,driverEfficiency:1,recoveryEfficiency:1,parasiticKW:0});
  relative(perfect.netNonfusionJ,-perfect.lossJ-perfect.remainingJ);
  const lossy=simulateLaurelin({compression,driverEfficiency:.4,recoveryEfficiency:.6});
  assert.ok(lossy.netNonfusionJ<=-lossy.lossJ-lossy.remainingJ-lossy.parasiticJ);
  assert.equal(lossy.fusionElectricityJ,null);
 }
});

test('upper and lower fit-domain exits withhold whole-pulse estimates',()=>{
 const low=simulateLaurelin({temperatureKeV:.5,compression:1,speedKmS:0,confinementUs:600,durationUs:550});
 const high=simulateLaurelin({temperatureKeV:10,compression:30,speedKmS:600,durationUs:25,confinementUs:10000});
 assert.ok(low.samples.at(-1).temperatureKeV<.2);
 assert.ok(high.samples.some(s=>s.temperatureKeV>100));
 for(const result of [low,high]){
  assert.ok(result.unsupportedSteps>0);assert.equal(result.neutrons,null);
  assert.equal(result.chargedJ,null);assert.equal(result.diagnosticValid,false);
 }
});

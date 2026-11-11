import test from 'node:test';
import assert from 'node:assert/strict';
import {AMU,E_CHARGE,type Vec} from '../src/physics.js';
import {scatterCoulombPair} from '../src/coulomb.js';

const rng=(seed:number)=>()=>{seed=(seed+0x6d2b79f5)>>>0;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
const normal=(r:()=>number)=>Math.sqrt(-2*Math.log1p(-r()))*Math.cos(2*Math.PI*r());
const norm2=(v:Vec)=>v.reduce((s,x)=>s+x*x,0);

test('independent Maxwellian Landau energy moment fixes unequal-mass exchange rate in SI',t=>{
 // Maxwellian Landau moment: dTa/dt = nu_ab(Tb-Ta), with temperatures in eV.
 // This standard thermal-exchange coefficient is independently tabulated in
 // NRL Plasma Formulary (2019), Thermal Equilibration, p33–34 (cgs form).
 // Here it is written in SI via the Rutherford coupling K=qa qb/(4 pi eps0).
 const ma=40*AMU,mb=84*AMU,ta=2,tb=10,density=5e17,log=12,eps=8.8541878128e-12;
 const coupling=E_CHARGE**2/(4*Math.PI*eps);
 const frequency=8*Math.sqrt(2*Math.PI)/3*density*coupling**2*log/
  (ma*mb*(E_CHARGE*ta/ma+E_CHARGE*tb/mb)**1.5);
 const expected=frequency*(tb-ta),samples=16384,seeds=8;
 const rates=[];
 for(const dt of [1e-7,5e-8,2.5e-8]){
  const seedRates=[];
  for(let seed=0;seed<seeds;seed++){
   const random=rng(9957+seed*7919);let temperatureChange=0;
   const gVariance=E_CHARGE*(ta/ma+tb/mb),totalMass=ma+mb;
   const regression=E_CHARGE*(ta-tb)/(totalMass*gVariance);
   const residualVariance=E_CHARGE*(ma*ta+mb*tb)/totalMass**2-regression**2*gVariance;
   for(let i=0;i<samples;i++){
    const g=Array.from({length:3},()=>Math.sqrt(gVariance)*normal(random)) as Vec;
    const residual=Array.from({length:3},()=>Math.sqrt(residualVariance)*normal(random)) as Vec;
    const draws=[random(),random(),random()];
    // Antithetic CM residuals and phi/pi draws preserve the two Maxwellian
    // marginals while cancelling zero-mean conditional/azimuth noise. This
    // avoids the divergent variance of a naive g^-3 heat-moment estimator.
    let change=0;
    for(const sign of [-1,1]){
     const center=g.map((v,j)=>regression*v+sign*residual[j]);
     const a={massU:40,chargeState:1,velocity:g.map((v,j)=>center[j]+mb/totalMass*v) as Vec};
     const b={massU:84,chargeState:1,velocity:g.map((v,j)=>center[j]-ma/totalMass*v) as Vec};
     for(const offset of [0,.5]){
      let next=0;
      const result=scatterCoulombPair(a,b,density,log,dt,()=>{
       const at=next++;return at===2?(draws[at]+offset)%1:draws[at];
      });
      change+=(norm2(result.velocityA)-norm2(a.velocity))/4;
     }
    }
    temperatureChange+=ma/(3*E_CHARGE)*change;
   }
   seedRates.push(temperatureChange/(samples*dt));
  }
  const mean=seedRates.reduce((s,v)=>s+v,0)/seeds;
  const standardError=Math.sqrt(seedRates.reduce((s,v)=>s+(v-mean)**2,0)/(seeds*(seeds-1)));
  rates.push(mean);
  t.diagnostic(JSON.stringify({dtS:dt,meanRateEVPerS:mean,expectedRateEVPerS:expected,standardErrorEVPerS:standardError,relativeError:(mean-expected)/expected}));
  assert.ok(Math.abs(mean-expected)<4*standardError+.04*expected,'temperature-exchange coefficient must match the independent Landau moment');
 }
 assert.ok(Math.abs(rates.at(-1)!-expected)<.02*expected,'resolved initial moment must be within 2% of analytic rate');
 assert.ok(Math.abs(rates.at(-1)!-expected)<Math.abs(rates[0]-expected),'paired timestep refinement reduces the initial-moment bias');
});

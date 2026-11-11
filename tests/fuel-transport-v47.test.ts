import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,radialCDF,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {advanceFuelRadialMass,fuelTransportCDF,fuelTransportCollection,sampleFuelTransport,simulateFuelTransport} from '../src/fuel-transport.js';

const total=(a:readonly number[])=>a.reduce((x,y)=>x+y,0);
const error=(a:readonly number[],b:readonly number[])=>a.reduce((s,x,i)=>s+Math.abs(x-b[i]),0);
function close(a:number,b:number,tolerance=1e-10){assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);}
function equilibrium(n:number,beta:number){return Array.from({length:n},(_,i)=>radialCDF(beta,(i+1)/n)-radialCDF(beta,i/n));}
function evolve(n:number,steps:number,beta=3,duration=.15,rate=1){
 let p=Array<number>(n).fill(1/n);
 for(let i=0;i<steps;i++)p=advanceFuelRadialMass(p,beta,rate,duration/steps);
 return p;
}
function coarse(fine:number[],factor:number){
 return Array.from({length:fine.length/factor},(_,i)=>total(fine.slice(i*factor,(i+1)*factor)));
}

test('SG transport preserves inventory, positivity and the exact integrated Boltzmann equilibrium',()=>{
 for(const beta of [0,1e-9,.4,8,100,1e5])for(const n of [16,64]){
  const exact=equilibrium(n,beta),next=advanceFuelRadialMass(exact,beta,2,20);
  assert.ok(error(next,exact)<3e-11,`${n}, β=${beta}: ${error(next,exact)}`);
  close(total(next),1);assert.ok(next.every(x=>x>=0));
  const transient=advanceFuelRadialMass(Array<number>(n).fill(1/n),beta,2,20);
  close(total(transient),1);assert.ok(transient.every(x=>x>=0));
 }
});

test('fixed-potential free energy decreases, while concentration moves outwards',()=>{
 const n=32,beta=4,eq=equilibrium(n,beta);
 let p=Array<number>(n).fill(1/n);
 const kl=(a:number[])=>total(a.map((v,i)=>v? v*Math.log(v/eq[i]):0));
 let previous=kl(p),mean=.5;
 for(let i=0;i<60;i++){
  p=advanceFuelRadialMass(p,beta,1,.01);
  const entropy=kl(p),nextMean=total(p.map((v,j)=>v*(j+.5)/n));
  assert.ok(entropy<=previous+1e-12);assert.ok(nextMean>=mean-1e-12);
  previous=entropy;mean=nextMean;
 }
 assert.ok(mean>.65);assert.ok(previous<.01);
});

test('backward Euler transient agrees with an independent small-step explicit master equation',()=>{
 const n=12,beta=2.5,rate=.7,time=.04,steps=16000,dt=time/steps,z=beta/n;
 // Direct flux-divergence forward Euler oracle; it never calls the implicit solver.
 const B=(v:number)=>v/Math.expm1(v);
 let reference=Array<number>(n).fill(1/n);
 for(let j=0;j<steps;j++){
  const next=[...reference];
  for(let i=0;i<n-1;i++){
   const transfer=dt*rate*(i+1)*n*(B(-z)*reference[i]-B(z)*reference[i+1]);
   next[i]-=transfer;next[i+1]+=transfer;
  }
  reference=next;
 }
 const solved=evolve(n,2048,beta,time,rate);
 assert.ok(error(solved,reference)<3e-5);close(total(solved),1);
});

test('finite-time transport converges under independent time and radial refinement',()=>{
 const reference=evolve(64,8192),errors=[128,256,512].map(steps=>error(evolve(64,steps),reference));
 assert.ok(errors[1]<.57*errors[0]&&errors[2]<.57*errors[1],String(errors));
 const fine=evolve(256,8192),gridErrors=[16,32,64].map(n=>error(evolve(n,8192),coarse(fine,256/n)));
 assert.ok(gridErrors[1]<.65*gridErrors[0]&&gridErrors[2]<.65*gridErrors[1],String(gridErrors));
 assert.ok(gridErrors[2]<.002,String(gridErrors));
});

test('accepted spin-up gives finite-time separation, conservative physical-time interpolation and no fictitious extraction',()=>{
 const rotor=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,radialDiffusivityM2S:.003});
 const transport=simulateFuelTransport(rotor,{cells:32,steps:384}),first=transport.snapshots[0],last=transport.snapshots.at(-1)!;
 close(first.collection.innerLightPurity!,rotor.config.lightFraction);
 close(first.collection.lightRecovery!,rotor.config.cutFraction**2);
 close(first.neutralInertiaRatio,1);
 assert.ok(last.collection.innerLightPurity!>rotor.config.lightFraction);
 assert.ok(last.collection.innerLightPurity!<rotor.collection.innerLightPurity!);
 for(const sample of transport.snapshots){
  close(sample.balances.light,1);close(sample.balances.heavy,1);
  assert.equal(sample.balances.boundaryFlux,0);assert.ok(sample.balances.minimumMass>=0);
  assert.ok(sample.neutralInertiaRatio>=1-1e-10&&sample.neutralInertiaRatio<2);
  const x=rotor.config.lightFraction,[ml,mh]=rotor.pair.masses,w=x*ml/(x*ml+(1-x)*mh);
  const moment=(p:number[])=>total(p.map((v,i)=>v*(i+.5)/32));
  close(sample.neutralInertiaRatio,2*(w*moment(sample.lightMass)+(1-w)*moment(sample.heavyMass)));
  assert.equal(sample.profiles.length,81);assert.equal(sample.lightCDF.length,33);
 }
 const a=transport.snapshots[4],b=transport.snapshots[5],mid=sampleFuelTransport(transport,(a.timeS+b.timeS)/2);
 close(total(mid.lightMass),1);close(total(mid.heavyMass),1);
 for(let i=0;i<32;i++)close(mid.lightMass[i],(a.lightMass[i]+b.lightMass[i])/2);
 close(mid.neutralInertiaRatio,(a.neutralInertiaRatio+b.neutralInertiaRatio)/2);
 close(mid.collection.lightRecovery!,fuelTransportCDF(mid.lightMass,rotor.config.cutFraction));
 assert.equal(sampleFuelTransport(transport,100),last);
});

test('zero drive, zero duration, empty species and cut endpoints have explicit meanings',()=>{
 const off=simulateFuelTransport(simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA:0}),{cells:16,steps:32});
 for(const p of off.snapshots)for(const value of p.lightMass)close(value,1/16);
 const instant=simulateFuelTransport(simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,durationS:0}));
 assert.equal(instant.snapshots.length,1);
 for(const x of [0,1])for(const cutFraction of [0,1]){
  const run=simulateFuelTransport(simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,lightFraction:x,cutFraction}),{cells:16,steps:32});
  const p=run.snapshots.at(-1)!;
  if(x===0)assert.equal(p.collection.lightRecovery,null);
  if(cutFraction===0)assert.equal(p.collection.innerLightPurity,null);
  if(cutFraction===1)assert.equal(p.collection.outerHeavyPurity,null);
 }
 assert.throws(()=>advanceFuelRadialMass([.5,-.5],1,1,1),RangeError);
 assert.throws(()=>advanceFuelRadialMass([.5,.5],-1,1,1),RangeError);
 assert.throws(()=>simulateFuelTransport(simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE}),{cells:1}),RangeError);
 assert.throws(()=>sampleFuelTransport(off,-1),RangeError);
});

test('arbitrary current-cut helper matches direct inventory arithmetic and strict empty-product semantics',()=>{
 const light=[.75,.25],heavy=[.25,.75],cut=Math.SQRT1_2;
 const current=fuelTransportCollection(light,heavy,.2,cut);
 close(current.lightRecovery!,.75);close(current.innerFraction,.35);
 close(current.innerLightPurity!,3/7);close(current.outerHeavyPurity!,12/13);
 close(current.lightBalance,0);close(current.heavyBalance,0);
 for(const x of [0,.2,1]){
  const axis=fuelTransportCollection(light,heavy,x,0),wall=fuelTransportCollection(light,heavy,x,1);
  assert.equal(axis.innerLightPurity,null);assert.equal(wall.outerHeavyPurity,null);
  close(axis.innerFraction,0);close(wall.innerFraction,1);close(wall.innerLightPurity!,x);
  if(x===0){assert.equal(axis.lightRecovery,null);assert.equal(wall.lightRecovery,null);}
  else{close(axis.lightRecovery!,0);close(wall.lightRecovery!,1);}
 }
 assert.throws(()=>fuelTransportCollection(light,heavy,1.01,cut),RangeError);
 assert.throws(()=>fuelTransportCollection(light,heavy,.2,1.01),RangeError);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceFuelRadialMass,fuelTransportCDF,sampleFuelTransport,simulateFuelTransport} from '../src/fuel-transport.js';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';

const sum=(a:number[])=>a.reduce((x,y)=>x+y,0);
const l1=(a:number[],b:number[])=>sum(a.map((x,i)=>Math.abs(x-b[i])));
const meanY=(a:number[])=>sum(a.map((x,i)=>x*(i+.5)/a.length));
function close(a:number,b:number,tolerance=2e-11){
 assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=tolerance,`${a} != ${b}`);
}
function equilibrium(n:number,beta:number){
 if(beta===0)return Array(n).fill(1/n) as number[];
 // Independent exact integrals, expressed relative to the outer wall to avoid overflow.
 return Array.from({length:n},(_,i)=>Math.exp(-beta*(1-(i+1)/n))*(-Math.expm1(-beta/n))/(-Math.expm1(-beta)));
}
function evolve(initial:number[],beta:number,k:number,time:number,steps:number){
 let mass=initial.slice();
 for(let j=0;j<steps;j++)mass=advanceFuelRadialMass(mass,beta,k,time/steps);
 return mass;
}
function relativeEntropy(mass:number[],reference:number[]){
 return sum(mass.map((p,i)=>p===0?0:p*Math.log(p/reference[i])));
}

// Independent analytic cylindrical-diffusion oracle: J1's first root gives a
// reflecting-wall J0 eigenfunction, whose area integral is exactly zero.
const alpha=3.8317059702075125;
function j1(x:number){
 let term=x/2,total=term;
 for(let k=1;k<30;k++){
  term*=-(x*x/4)/(k*(k+1));total+=term;
 }
 return total;
}
function diffusionEigenmode(n:number,k:number,time:number){
 const amplitude=.5*Math.exp(-k*alpha*alpha*time/4);
 const integral=(y:number)=>2*Math.sqrt(y)*j1(alpha*Math.sqrt(y))/alpha;
 return Array.from({length:n},(_,i)=>1/n+amplitude*(integral((i+1)/n)-integral(i/n)));
}

test('independent zero-drive gate: uniform cylindrical density stays uniform',()=>{
 for(const n of [2,17,64])for(const dt of [0,.001,3]){
  const mass=Array(n).fill(1/n),next=advanceFuelRadialMass(mass,0,2.7,dt);
  close(sum(next),1);
  next.forEach(p=>close(p,1/n));
 }
});

test('independent exact equilibrium gate: SG preserves integrated Boltzmann bin masses',()=>{
 for(const beta of [1e-8,.5,8,50,300]){
  const initial=equilibrium(64,beta),next=advanceFuelRadialMass(initial,beta,1.3,.7);
  assert.ok(l1(initial,next)<3e-11,`stationary distribution changed at beta=${beta}`);
  close(sum(next),1);
 }
});

test('independent closed-wall gate: positivity and inventory survive stiff implicit steps',()=>{
 for(const n of [2,9,64])for(const beta of [0,2,100]){
  const raw=Array.from({length:n},(_,i)=>i%3===0?0:1+i),total=sum(raw);
  const initial=raw.map(x=>x/total);
  for(const dt of [1e-8,.2,20]){
   const next=advanceFuelRadialMass(initial,beta,1.7,dt);
   assert.ok(next.every(p=>Number.isFinite(p)&&p>=0));
   close(sum(next),sum(initial),3e-10);
  }
 }
});

test('independent fixed-potential thermodynamics gate: relative free energy decreases',()=>{
 const n=64,beta=8,reference=equilibrium(n,beta);
 let mass=Array(n).fill(1/n),previous=relativeEntropy(mass,reference);
 for(let step=0;step<120;step++){
  mass=advanceFuelRadialMass(mass,beta,2,.3);
  const current=relativeEntropy(mass,reference);
  assert.ok(current<=previous+3e-12,`free energy increased: ${previous} -> ${current}`);
  previous=current;
 }
 assert.ok(l1(mass,reference)<1e-9);
 // Shannon entropy alone need not rise: centrifugal concentration does work.
});

test('independent drift-sign gate: greater centrifugal mass moves inventory farther outward',()=>{
 const initial=Array(64).fill(1/64),light=advanceFuelRadialMass(initial,1,1,.01),heavy=advanceFuelRadialMass(initial,2,1,.01);
 assert.ok(meanY(light)>.5);
 assert.ok(meanY(heavy)>meanY(light));
 assert.ok(sum(heavy.slice(0,32))<sum(light.slice(0,32)));
});

test('independent units/rate gate: a step depends on diffusionRate times duration',()=>{
 const initial=diffusionEigenmode(48,1,0);
 const a=advanceFuelRadialMass(initial,3,.7,.2),b=advanceFuelRadialMass(initial,3,7,.02);
 assert.ok(l1(a,b)<2e-12);
});

test('independent cylindrical diffusion rate agrees with a reflecting Bessel eigenmode',()=>{
 const k=1.7,time=.27;
 const errors=[32,64,128].map(n=>l1(evolve(diffusionEigenmode(n,k,0),0,k,time,8192),diffusionEigenmode(n,k,time)));
 assert.ok(errors[2]<errors[0]*.8,`radial refinement failed: ${errors}`);
 assert.ok(errors[2]<2e-4,`diffusion-rate/distribution gate failed: ${errors}`);
});

test('independent transient timestep gate converges to the full distribution',()=>{
 const n=64,k=1.7,time=.27,initial=diffusionEigenmode(n,k,0);
 const reference=evolve(initial,0,k,time,2048);
 const errors=[8,16,32].map(steps=>l1(evolve(initial,0,k,time,steps),reference));
 assert.ok(errors[1]<errors[0]*.65&&errors[2]<errors[1]*.65,`time refinement failed: ${errors}`);
});

test('independent initial-condition and species inventory gates include interpolated timeline states',()=>{
 const transport=simulateFuelTransport(simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA:.01}),{cells:32,steps:128});
 for(const p of transport.snapshots[0].profiles){
  close(p.lightDensityRatio,1);close(p.heavyDensityRatio,1);
  close(p.lightFraction!,DEFAULT_FUEL_CENTRIFUGE.lightFraction);
 }
 const first=transport.snapshots[0];
 close(first.ionRadS,0);close(first.neutralRadS,0);
 close(first.neutralInertiaRatio,1);
 close(first.collection.innerFraction,DEFAULT_FUEL_CENTRIFUGE.cutFraction**2);
 for(const t of [0,.137,.5,transport.durationS,transport.durationS+2]){
  const p=sampleFuelTransport(transport,t);
  close(sum(p.lightMass),1,3e-10);close(sum(p.heavyMass),1,3e-10);
  assert.ok(p.lightMass.every(x=>x>=0)&&p.heavyMass.every(x=>x>=0));
  assert.ok(p.neutralInertiaRatio>=1-3e-10&&p.neutralInertiaRatio<=2+3e-10);
  assert.equal(p.balances.boundaryFlux,0);
  close(fuelTransportCDF(p.lightMass,.5),sum(p.lightMass.slice(0,8)));
 }
});

test('independent inventory-cut endpoints never assign purity to an empty compartment',()=>{
 for(const x of [0,.0759,1])for(const cut of [0,1]){
  const transport=simulateFuelTransport(simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,lightFraction:x,cutFraction:cut,currentA:.01}),{cells:32,steps:128});
  for(const p of [transport.snapshots.at(-1)!,sampleFuelTransport(transport,.137)]){
   if(cut===0){
    assert.equal(p.collection.innerFraction,0);
    assert.equal(p.collection.innerLightPurity,null);
    assert.equal(p.collection.lightRecovery,x===0?null:0);
   }else{
    assert.equal(p.collection.innerFraction,1);
    assert.equal(p.collection.outerHeavyPurity,null);
    assert.equal(p.collection.lightRecovery,x===0?null:1);
   }
  }
 }
});

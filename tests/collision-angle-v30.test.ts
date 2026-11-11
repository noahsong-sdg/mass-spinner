import test from 'node:test';
import assert from 'node:assert/strict';
import {AMU,type Vec} from '../src/physics.js';
import {sampleNanbuCosine,scatterCoulombPair,coulombVariance,collideCoulombCell,type CoulombIon} from '../src/coulomb.js';

const ion=(velocity:Vec,massU=40,chargeState=1):CoulombIon=>({velocity,massU,chargeState});
const norm2=(v:Vec)=>v.reduce((sum,x)=>sum+x*x,0);
const close=(a:number,b:number,tol:number)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b} (tol ${tol})`);
const rng=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

test('large-step Nanbu pair scattering relaxes toward isotropy instead of TA backward alignment',()=>{
 const a=ion([0,0,1e4]),b=ion([0,0,0],84),variance=10,dt=variance/coulombVariance(a,b,1e18,10,1);
 let mean=0;const count=65536,random=rng(584193);
 for(let i=0;i<count;i++){
  const out=scatterCoulombPair(a,b,1e18,10,dt,random,'nanbu');
  mean+=(out.velocityA[2]-out.velocityB[2])/1e4/count;
 }
 close(mean,Math.exp(-2*variance),.008);
});

test('Nanbu quantiles preserve first moment throughout small, middle and isotropic regimes',()=>{
 for(const s of [1e-9,.0001,.01,.049999,.05,.050001,.1,.5,1,2,3,6,9.21034,13.8155,20,100,744]){
  let first=0,second=0;const n=65536;
  for(let i=0;i<n;i++){
   const mu=sampleNanbuCosine(s,()=>(i+.5)/n);
   assert.ok(mu>=-1&&mu<=1&&Number.isFinite(mu));
   first+=mu/n;second+=(3*mu*mu-1)/2/n;
  }
  close(first,Math.exp(-s),3e-6);
  if(s>=20)close(second,Math.exp(-3*s),1e-9);
 }
});

test('Nanbu second moment remains an approximation and converges under cumulative substeps',()=>{
 // Independent bisection of coth(A)-1/A=r and analytic P2 of the exponential
 // density, not production's inverse-Langevin implementation.
 const p2=(s:number)=>{
  const r=Math.exp(-s);let lo=0,hi=1/(1-r);
  for(let i=0;i<80;i++){const a=(lo+hi)/2,mean=1/Math.tanh(a)-1/a;if(mean>r)hi=a;else lo=a;}
  return 1-3*r/((lo+hi)/2);
 };
 const totalS=1,exact=Math.exp(-3*totalS),moments=[1,2,4,8,16,32].map(n=>p2(totalS/n)**n);
 for(let i=1;i<moments.length;i++)assert.ok(Math.abs(moments[i]-exact)<Math.abs(moments[i-1]-exact));
 assert.ok(Math.abs(moments[0]-exact)>.02,'single-step Nanbu is not the exact diffusion kernel');
 assert.ok(Math.abs(moments.at(-1)!-exact)<.001);
 for(const s of [.1,.5,1,3,6]){
  let measured=0;const n=65536;
  for(let i=0;i<n;i++){const mu=sampleNanbuCosine(s,()=>(i+.5)/n);measured+=(3*mu*mu-1)/2/n;}
  close(measured,p2(s),7e-6);
 }
});

test('Nanbu branches are continuous at numerical transitions and finite at RNG endpoints',()=>{
 for(const s of [Number.MIN_VALUE,1e-300,1e-16,.05,Math.log(1e4),Math.log(1e6),710,744,745,1e308,Infinity]){
  assert.equal(sampleNanbuCosine(s,()=>0),1);
  for(const u of [Number.MIN_VALUE,1e-12,.25,.5,.9,1-Number.EPSILON/2]){
   const mu=sampleNanbuCosine(s,()=>u);assert.ok(Number.isFinite(mu)&&mu>=-1&&mu<=1,`${s}, ${u}: ${mu}`);
  }
 }
 for(const s of [.05,Math.log(1e4),Math.log(1e6)])for(const u of [.01,.5,.99])
  close(sampleNanbuCosine(s*(1-1e-9),()=>u),sampleNanbuCosine(s*(1+1e-9),()=>u),3e-9);
 // Independent review found log1p cancellation in this tiny backward tail.
 const tail=1-Number.EPSILON;
 for(const s of [.062,.0635]){
  const r=Math.exp(-s);let lo=0,hi=1/(1-r);
  for(let i=0;i<100;i++){const a=(lo+hi)/2;if(1/Math.tanh(a)-1/a>r)hi=a;else lo=a;}
  const a=(lo+hi)/2,reference=1+Math.log((1-tail)+tail*Math.exp(-2*a))/a;
  close(sampleNanbuCosine(s,()=>tail),reference,2e-13);
 }
 assert.ok(sampleNanbuCosine(.0635,()=>tail)<=sampleNanbuCosine(.062,()=>tail));
 assert.equal(sampleNanbuCosine(0,()=>{throw new Error('zero length must not draw');}),1);
 for(const s of [-1,NaN])assert.throws(()=>sampleNanbuCosine(s,()=>.5));
 for(const u of [-1,1,NaN,Infinity])assert.throws(()=>sampleNanbuCosine(1,()=>u));
});

test('Nanbu preserves unequal-mass energy, momentum, speed and actual cell impulse',()=>{
 for(const mass of [1,40,84,1e8])for(const variance of [1e-10,.01,.5,10,1e12]){
  const a=ion([1200,-3400,4500]),b=ion([-1100,2200,-1500],mass,2),g=Math.hypot(...a.velocity.map((v,i)=>v-b.velocity[i]));
  const dt=variance/coulombVariance(a,b,1e18,10,1),out=scatterCoulombPair(a,b,1e18,10,dt,rng(44),'nanbu');
  const oldEnergy=a.massU*norm2(a.velocity)+b.massU*norm2(b.velocity),newEnergy=a.massU*norm2(out.velocityA)+b.massU*norm2(out.velocityB);
  close(newEnergy/oldEnergy,1,3e-15);
  for(let j=0;j<3;j++)close((a.massU*out.velocityA[j]+b.massU*out.velocityB[j])/(Math.max(a.massU,b.massU)*1e4),
   (a.massU*a.velocity[j]+b.massU*b.velocity[j])/(Math.max(a.massU,b.massU)*1e4),3e-15);
  close(Math.hypot(...out.velocityA.map((v,j)=>v-out.velocityB[j]))/g,1,3e-15);
 }
 const a=ion([1000,3000,-2000]),b=ion([-3000,1000,500],84),before=structuredClone(a);let dp:Vec|undefined;
 collideCoulombCell([a,b],1e18,10,1e-7,()=>.5,(first,_other,impulse)=>{assert.equal(first,a);dp=impulse;},'nanbu');
 assert.ok(dp);for(let j=0;j<3;j++)close(dp[j]/(AMU*1e5),(a.velocity[j]-before.velocity[j])*a.massU/1e5,1e-14);
 assert.throws(()=>scatterCoulombPair(a,b,1e18,10,1e-7,()=>.5,'unknown' as never));
 for(const [ions,density,dt] of [[[],0,0],[[a],1e18,1e-7],[[a,b],0,1e-7],[[a,b],1e18,0]] as const)
  assert.throws(()=>collideCoulombCell([...ions],density,10,dt,()=>.5,undefined,'unknown' as never));
});

test('omitted scattering method preserves the exact TA baseline and its RNG stream',()=>{
 const a=ion([1e4,-2e4,3e4]),b=ion([-4000,5000,-6000],84);
 const legacy=scatterCoulombPair(a,b,1e18,10,1e-7,rng(991));
 assert.deepEqual(scatterCoulombPair(a,b,1e18,10,1e-7,rng(991),'takizuka-abe'),legacy);
 const zero=scatterCoulombPair(a,b,0,10,1,()=>{throw new Error('zero density must not draw');},'nanbu');
 assert.deepEqual(zero.velocityA,a.velocity);assert.deepEqual(zero.velocityB,b.velocity);
});

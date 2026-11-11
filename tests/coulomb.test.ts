import test from 'node:test';
import assert from 'node:assert/strict';
import {AMU,E_CHARGE,type Vec} from '../src/physics.js';
import {collideCoulombCell,coulombVariance,scatterCoulombPair,type CoulombIon} from '../src/coulomb.js';

const rng=(seed:number)=>()=>{seed=(seed+0x6d2b79f5)>>>0;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
const normal=(r:()=>number)=>Math.sqrt(-2*Math.log1p(-r()))*Math.cos(2*Math.PI*r());
const norm2=(v:Vec)=>v.reduce((s,x)=>s+x*x,0);
const totals=(ions:CoulombIon[])=>({energy:ions.reduce((s,p)=>s+p.massU*norm2(p.velocity)/2,0),
 momentum:[0,1,2].map(i=>ions.reduce((s,p)=>s+p.massU*p.velocity[i],0))});
const close=(a:number,b:number,tolerance=2e-12)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const ion=(velocity:Vec,massU=40,chargeState=1):CoulombIon=>({velocity,massU,chargeState});

test('Coulomb pair kinematics conserve momentum/energy for signed directions and unequal masses',()=>{
 for(const mass of [1,40,84,1e8])for(const seed of [1,2,9]){
  const a=ion([1200,-3400,4500]),b=ion([-1100,2200,-1500],mass,2),before=totals([a,b]);
  const p=scatterCoulombPair(a,b,1e18,10,1e-7,rng(seed));
  const after=totals([{...a,velocity:p.velocityA},{...b,velocity:p.velocityB}]);
  close(before.energy,after.energy);before.momentum.forEach((v,i)=>close(v,after.momentum[i]));
  close(Math.hypot(...a.velocity.map((v,i)=>v-b.velocity[i])),Math.hypot(...p.velocityA.map((v,i)=>v-p.velocityB[i])));
 }
 const p=ion([2,3,4]),same=scatterCoulombPair(p,p,1e20,10,1,rng(1));
 assert.deepEqual(same.velocityA,p.velocity);assert.equal(same.variance,0);
 assert.equal(coulombVariance(p,ion([0,0,0]),0,10,1),0);
 assert.throws(()=>coulombVariance(p,ion([0,0,0]),1e18,0,1));
 assert.throws(()=>scatterCoulombPair(p,ion([0,0,0]),1e18,10,1,()=>1));
});

test('mixed and odd-cell matching gives each represented partner exactly its density in the generator',()=>{
 // For N=2 each particle always meets its only partner. For N=3 each ordered
 // distinct pair is selected with probability 1/3. A zero normal draw keeps
 // velocities unchanged, allowing an exact independent enumeration of matching.
 for(const n of [2,3,4,5]){
  const ions=Array.from({length:n},(_,i)=>ion([1000+100*i,2000,3000],i%2?84:40,i%2?2:1));
  const before=structuredClone(ions),density=1e17,dt=1e-9,log=10;
  const random=rng(n),observed=collideCoulombCell(ions,density,log,dt,random);
  assert.equal(observed.pairs,Math.floor(n/2));assert.equal(observed.unpaired,n%2);
  assert.deepEqual(ions.map(p=>[p.massU,p.chargeState]),before.map(p=>[p.massU,p.chargeState]));
  const old=totals(before),next=totals(ions);close(old.energy,next.energy);old.momentum.forEach((v,i)=>close(v,next.momentum[i]));
  // Derive rate independently: pair inclusion probability, times density
  // assigned to a selected pair, must equal physical weight/cell volume=n/N.
  const probability=n%2?1/n:1/(n-1),effective=density*(n%2?1:(n-1)/n);
  close(probability*effective,density/n);
 }
});

test('pair observer supplies the exact impulse for local torque accounting',()=>{
 const a=ion([1200,3000,-1000]),b=ion([-500,1000,700],84),before=structuredClone(a);
 let calls=0,impulse:Vec=[0,0,0],observed:CoulombIon|undefined;
 collideCoulombCell([a,b],1e18,10,1e-6,()=>.5,(first,_second,dp)=>{calls++;observed=first;impulse=dp;});
 assert.equal(calls,1);assert.ok(observed===a||observed===b);
 const deltaA=a.velocity.map((v,j)=>(v-before.velocity[j])*a.massU*AMU);
 for(let j=0;j<3;j++)close(impulse[j]/(AMU*1e5),(observed===a?deltaA[j]:-deltaA[j])/(AMU*1e5));
});

test('actual mixed-charge random matching reproduces the independently density-weighted Rutherford rate, including odd cells',()=>{
 const density=1e18,log=10,speed=1e5,m=40*AMU,eps=8.8541878128e-12;
 const b90=E_CHARGE**2/(4*Math.PI*eps*m*speed**2),coefficient=2*Math.PI*density*speed*b90*b90*log;
 const dt=1e-4/coefficient,trials=30000;
 for(const n of [2,3,4,5,9]){
  let loss=0;const random=rng(n+18),chargeSquares=Array.from({length:n-1},(_,i)=>(i%2+1)**2).reduce((a,b)=>a+b,0);
  for(let k=0;k<trials;k++){
   const ions=[ion([0,0,speed]),...Array.from({length:n-1},(_,i)=>ion([0,0,0],4e10,i%2+1))];
   collideCoulombCell(ions,density,log,dt,random);
   loss+=1-ions[0].velocity[2]/Math.hypot(...ions[0].velocity);
  }
  const expected=2*coefficient*dt*chargeSquares/n;
  assert.ok(Math.abs(loss/trials/expected-1)<.04,`N=${n}: measured ${loss/trials}; density-weighted theory ${expected}`);
 }
});

test('the scattering distribution transforms covariantly under oblique rotation',()=>{
 const directions:Vec[]=[[0,0,1],[1/3,2/3,2/3]],samples=30000;
 const summaries=directions.map((direction,k)=>{
  const a=ion(direction.map(v=>1e5*v) as Vec),b=ion([0,0,0],4e10),random=rng(880+k);
  const dt=.02/coulombVariance(a,b,1e18,10,1),mean=[0,0,0],second=Array.from({length:3},()=>[0,0,0]);
  for(let n=0;n<samples;n++){
   const p=scatterCoulombPair(a,b,1e18,10,dt,random).velocityA,unit=p.map(v=>v/Math.hypot(...p));
   for(let i=0;i<3;i++){mean[i]+=unit[i]/samples;for(let j=0;j<3;j++)second[i][j]+=unit[i]*unit[j]/samples;}
  }
  return {mean,second};
 });
 const parallel=summaries[0].second[2][2],perpendicular=(summaries[0].second[0][0]+summaries[0].second[1][1])/2,n=directions[1];
 for(let i=0;i<3;i++){
  assert.ok(Math.abs(summaries[1].mean[i]-n[i]*summaries[0].mean[2])<.004);
  for(let j=0;j<3;j++)assert.ok(Math.abs(summaries[1].second[i][j]-((i===j?perpendicular:0)+(parallel-perpendicular)*n[i]*n[j]))<.003);
 }
});

test('cold-target Rutherford pitch-angle diffusion fixes SI time normalization and converges in dt',t=>{
 // Rutherford θ≈2b90/b gives d<θ²>/dt=8π n g b90² lnΛ.
 // For infinite target mass b90=ZaZb e²/(4π ε0 m g²). On the sphere,
 // <P_l(cosθ)> = exp[-l(l+1) D t], D=(d<θ²>/dt)/4.
 const n=1e18,log=10,mass=40*AMU,speed=1e5,eps=8.8541878128e-12;
 const b90=E_CHARGE**2/(4*Math.PI*eps*mass*speed**2);
 const diffusion=2*Math.PI*n*speed*b90*b90*log,elapsed=.15/diffusion;
 const exact=[Math.exp(-2*diffusion*elapsed),Math.exp(-6*diffusion*elapsed)];
 const errors=[];
 for(const steps of [15,30,60]){
  let p1=0,p2=0;
  const samples=4096,seeds=4;
  for(let seed=0;seed<seeds;seed++){
   const random=rng(seed+1234);
   for(let i=0;i<samples;i++){
    const a=ion([0,0,speed]),b=ion([0,0,0],4e10);
    for(let j=0;j<steps;j++)a.velocity=scatterCoulombPair(a,b,n,log,elapsed/steps,random).velocityA;
    const cosine=a.velocity[2]/Math.hypot(...a.velocity);p1+=cosine;p2+=(3*cosine*cosine-1)/2;
   }
  }
  const means=[p1/(samples*seeds),p2/(samples*seeds)];
  const error=Math.max(...means.map((v,i)=>Math.abs(v-exact[i])));errors.push(error);
  assert.ok(error<.018,`Rutherford Legendre moments disagree: ${means}, expected ${exact}`);
  t.diagnostic(JSON.stringify({steps,elapsedS:elapsed,meanP1:means[0],meanP2:means[1],exactP1:exact[0],exactP2:exact[1],maxAbsoluteError:error}));
 }
 assert.ok(errors[2]<.008,'dt/4 reaches the analytic Lorentz-limit moments');
});

function population(seed:number,n:number,temperatures:[number,number],drifts:[number,number]=[0,0],anisotropy=1){
 const random=rng(seed);
 return Array.from({length:n},(_,i)=>{
  const species=i%2,mass=species?84:40,sigma=Math.sqrt(E_CHARGE*temperatures[species]/(mass*AMU));
  return ion([sigma*normal(random),sigma*normal(random),sigma*normal(random)*anisotropy+drifts[species]],mass);
 });
}
function moments(ions:CoulombIon[]){
 return [40,84].map(mass=>{
  const group=ions.filter(p=>p.massU===mass),mean=[0,1,2].map(i=>group.reduce((s,p)=>s+p.velocity[i],0)/group.length);
  const components=[0,1,2].map(i=>mass*AMU/E_CHARGE*group.reduce((s,p)=>s+(p.velocity[i]-mean[i])**2,0)/group.length);
  return {mean,components,temperature:components.reduce((s,v)=>s+v,0)/3};
 });
}
const maxwellCdf=(ions:CoulombIon[])=>[-2,-1,0,1,2].map(z=>ions.filter(p=>p.velocity[0]/Math.sqrt(5*E_CHARGE/(p.massU*AMU))<=z).length/ions.length);

test('Maxwellian stationarity, temperature exchange, anisotropy relaxation and drag survive timestep refinement',t=>{
 const refinements:{temperatureGapRatio:number;driftGapRatio:number;anisotropyRatio:number}[]=[];
 for(const steps of [160,320,640]){
  const metrics=[];
  for(const seed of [30,60,90,120]){
   const isotropic=population(seed,1024,[5,5]),hotCold=population(seed+1,1024,[8,2]),drift=population(seed+2,1024,[5,5],[2500,-2500]),anisotropic=population(seed+3,1024,[5,5],[0,0],1.8);
   const ensembles=[isotropic,hotCold,drift,anisotropic],initial=ensembles.map(moments),before=ensembles.map(totals);
   const initialCdf=maxwellCdf(isotropic);
   for(let j=0;j<steps;j++)for(let k=0;k<ensembles.length;k++)collideCoulombCell(ensembles[k],1e18,10,2e-4/steps,rng(seed+j*997+k*31));
   const final=ensembles.map(moments);
   ensembles.forEach((ions,k)=>{const after=totals(ions);close(after.energy,before[k].energy,1e-11);after.momentum.forEach((v,i)=>close(v,before[k].momentum[i],1e-10));});
   metrics.push({stationarity:final[0].map((s,i)=>s.temperature-initial[0][i].temperature),
    cdfChange:maxwellCdf(isotropic).map((v,i)=>v-initialCdf[i]),
    temperatureGap:Math.abs(final[1][0].temperature-final[1][1].temperature)/Math.abs(initial[1][0].temperature-initial[1][1].temperature),
    driftGap:Math.abs(final[2][0].mean[2]-final[2][1].mean[2])/Math.abs(initial[2][0].mean[2]-initial[2][1].mean[2]),
    anisotropy:final[3].map(s=>s.components[2]-(s.components[0]+s.components[1])/2).reduce((a,b)=>a+b,0)/initial[3].map(s=>s.components[2]-(s.components[0]+s.components[1])/2).reduce((a,b)=>a+b,0)});
  }
  const mean=(fn:(m:typeof metrics[number])=>number)=>metrics.reduce((s,m)=>s+fn(m),0)/metrics.length;
  const summary={temperatureGapRatio:mean(m=>m.temperatureGap),driftGapRatio:mean(m=>m.driftGap),anisotropyRatio:mean(m=>m.anisotropy)};
  refinements.push(summary);t.diagnostic(JSON.stringify({steps,...summary}));
  assert.ok(Math.abs(mean(m=>m.stationarity[0]))<.35);assert.ok(Math.abs(mean(m=>m.stationarity[1]))<.35);
  for(let i=0;i<5;i++)assert.ok(Math.abs(mean(m=>m.cdfChange[i]))<.035,'stationary Maxwellian velocity CDF changes beyond sampling allowance');
  assert.ok(mean(m=>m.temperatureGap)<.9);assert.ok(mean(m=>m.driftGap)<.9);assert.ok(mean(m=>m.anisotropy)<.9);
 }
 for(const name of ['temperatureGapRatio','driftGapRatio','anisotropyRatio'] as const)
  assert.ok(Math.abs(refinements[2][name]-refinements[0][name])<.04,`${name} unresolved under dt/4`);
});

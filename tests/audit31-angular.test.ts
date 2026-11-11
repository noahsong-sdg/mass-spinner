import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {coulombVariance,scatterCoulombPair,collideCoulombCell,sampleNanbuCosine,type CoulombIon} from '../src/coulomb.js';
import type {Vec} from '../src/physics.js';

const evidence:Record<string,unknown>={};
test.after(()=>{if(process.env.AUDIT31_ANGULAR_EVIDENCE)writeFileSync(process.env.AUDIT31_ANGULAR_EVIDENCE,JSON.stringify(evidence,null,2)+'\n');});
const ion=(velocity:Vec,massU=40,chargeState=1):CoulombIon=>({velocity,massU,chargeState});
const rng=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const norm2=(v:number[])=>v.reduce((sum,x)=>sum+x*x,0);
const near=(actual:number,expected:number,relative:number)=>assert.ok(Math.abs(actual-expected)<=relative*Math.abs(expected),`${actual} != ${expected}`);

test('weak Nanbu scattering retains representable transverse deflection below cosine resolution',()=>{
 const records=[];
 for(const s of [1e-12,1e-16,1e-18,1e-24,1e-100])for(const u of [.5,Number.MIN_VALUE]){
  const a=ion([0,0,1e4]),b=ion([0,0,0],84),rate=2*coulombVariance(a,b,1e18,10,1);
  let draw=0;const draws=[u,0];
  const out=scatterCoulombPair(a,b,1e18,10,s/rate,()=>draws[draw++],'nanbu');
  const relative=out.velocityA.map((v,j)=>v-out.velocityB[j]);
  const inverseA=-Math.expm1(-s),logProbability=Math.log1p(-u),q=-inverseA*logProbability;
  // Retain square-root factors: q itself can underflow while the transverse
  // velocity is representable. The exp(-2A) correction is below underflow here.
  const expected=1e4*Math.sqrt(inverseA*(2-q))*Math.sqrt(-logProbability),actual=Math.hypot(relative[0],relative[1]);
  records.push({s,u,actual,expected,cosine:sampleNanbuCosine(s,()=>u)});
  assert.equal(draw,2);
 }
 evidence.weakScattering=records;
 for(const row of records)near(row.actual,row.expected,2e-12);
});

test('pair collision energy and relative velocity are Galilean-covariant in the resolved regime',()=>{
 const a=ion([1700,-2300,4100],40,3),b=ion([-1200,3700,-900],84,2),boost=[1e5,-2e5,3e5];
 const records=[];
 for(const method of ['nanbu','takizuka-abe'] as const)for(const s of [.001,.1,1,100]){
  const dt=s/(2*coulombVariance(a,b,1e18,10,1));
  const shiftedA=ion(a.velocity.map((v,j)=>v+boost[j]) as Vec,a.massU,a.chargeState);
  const shiftedB=ion(b.velocity.map((v,j)=>v+boost[j]) as Vec,b.massU,b.chargeState);
  const original=scatterCoulombPair(a,b,1e18,10,dt,rng(713),method),shifted=scatterCoulombPair(shiftedA,shiftedB,1e18,10,dt,rng(713),method);
  let worst=0;
  for(let j=0;j<3;j++)for(const key of ['velocityA','velocityB'] as const)
   worst=Math.max(worst,Math.abs(shifted[key][j]-boost[j]-original[key][j]));
  assert.ok(worst<2e-10);
  const energy0=a.massU*norm2(a.velocity)+b.massU*norm2(b.velocity);
  near(a.massU*norm2(original.velocityA)+b.massU*norm2(original.velocityB),energy0,4e-15);
  records.push({method,s,maxBoostVelocityErrorMS:worst});
 }
 evidence.galilean=records;
});

test('odd and even random batches preserve declared pairing probabilities and density normalization',()=>{
 // Enumerate every Fisher-Yates permutation exactly for N<=5. The initial
 // unlike/same pair geometry is constant, so no concentration/RNG reference
 // helper is needed to recover the expected finite-N first-moment transfer.
 const records=[];
 for(const count of [2,3,4,5]){
  const permutations:number[][]=[];
  const add=(prefix:number[])=>{if(prefix.length===count-1){permutations.push(prefix);return;}
   const i=count-1-prefix.length;for(let j=0;j<=i;j++)add([...prefix,j]);};add([]);
  let actual=0;
  const dt=1e-9,density=1e18,log=10;
  const make=()=>Array.from({length:count},(_,i)=>ion(i===0?[0,0,1e4]:[0,0,0],i===0?40:84));
  for(const permutation of permutations){
   const ions=make();let shuffle=0,angle=0;
   const random=()=>{
    if(shuffle<count-1){const draw=(permutation[shuffle]+.5)/(count-shuffle);shuffle++;return draw;}
    angle++;return angle%2===1?.5:0;
   };
   collideCoulombCell(ions,density,log,dt,random,undefined,'nanbu');
   actual+=(ions[0].velocity[2]-1e4)/permutations.length;
  }
  const [a,b]=make(),s=2*coulombVariance(a,b,density*(count%2?1:(count-1)/count),log,dt);
  // A stratified single draw u=.5 is not the exponential angular mean; here
  // enumerate pair selection and use its known selected median quantile.
  const mu=sampleNanbuCosine(s,()=>.5),pairedProbability=count%2?(count-1)/count:1;
  const expected=pairedProbability*84/(40+84)*1e4*(mu-1);
  near(actual,expected,2e-9);records.push({count,permutations:permutations.length,actual,expected});
 }
 evidence.finiteNPairSelection=records;
});

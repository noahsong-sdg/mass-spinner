import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_CONFIG,simulate,type SpeciesResult} from '../src/physics.js';
import {recoveryInterval,arrivalCurves,collectionSummary,summarizeEnsemble,independentSeeds} from '../src/ensemble.js';
const close=(a:number,b:number,tol=1e-12)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
function fixture(seed=42) {
 const config={...DEFAULT_CONFIG,seed,particlesPerSpecies:4,duration:1e-5};
 const species=(massU:number):SpeciesResult=>({massU,chargeState:1,injected:4,end:1,wall:1,source:1,remaining:1,
  wallAxialBins:[1,0],endRadialBins:[1,0],maxRelativeEnergyError:0,maxRelativeImpactEnergyError:0,collisions:0,
  rfWorkEV:0,neutralEnergyEV:0,meanInitialKineticEV:1,paths:[],impacts:[
   {destination:'source',time:0,kineticEV:1,position:[0,0,0]},
   {destination:'wall',time:4e-6,kineticEV:2,position:[.48,0,1]},
   {destination:'end',time:8e-6,kineticEV:3,position:[.1,0,2.8]},
  ]});
 return {config,species:[species(40),species(84)],cutoffMassU:69};
}

test('Wilson intervals respect count endpoints and an independent score-inversion value',()=>{
 const none=recoveryInterval(0,10),all=recoveryInterval(10,10),middle=recoveryInterval(5,10);
 assert.equal(none.low,0);close(none.high,.2775327998628892);
 assert.equal(all.high,1);close(all.low,1-none.high);
 close(middle.low,.236593090512564);close(middle.high,1-middle.low);
 assert.ok(recoveryInterval(50,100).high-recoveryInterval(50,100).low < middle.high-middle.low);
 for(const [k,n] of [[-1,10],[11,10],[0,0],[.5,10],[1,NaN]])assert.throws(()=>recoveryInterval(k,n));
});

test('arrival cumulative incidence retains every destination and censored ion at every event sample',()=>{
 const r=fixture(),curves=arrivalCurves(r);
 for(const label of ['A','B']){
  const group=curves.filter(c=>c.yLabel===`Fraction of injected ${label} ions`);
  assert.equal(group.length,4);
  group[0].x.forEach((_,j)=>close(group.reduce((sum,c)=>sum+c.y[j],0),1));
  assert.equal(group[0].x.at(-1),10);
  group.forEach(c=>assert.equal(c.y.at(-1),.25));
  const source=group.find(c=>c.label.endsWith('source'))!;
  assert.equal(source.x[0],0);assert.equal(source.y[0],0);assert.equal(source.y[1],.25);
 }
 const energy=curves.find(c=>c.yLabel==='Energy CDF conditional on collected ions')!;
 assert.equal(energy.y.at(-1),1);
 const radial=curves.find(c=>c.yLabel==='Injected fraction per radial bin')!;
 assert.equal(radial.y.reduce((a,b)=>a+b,0),.25);
 assert.equal(collectionSummary(r).species[0].outcomes.remaining.fraction,.25);
});

test('arrival accounting includes a horizon hit and rejects stale or inconsistent records',()=>{
 const r=fixture();r.species[0].impacts[2].time=r.config.duration;
 const c=arrivalCurves(r).find(c=>c.label==='A end')!;
 assert.equal(c.y.at(-1),.25);
 r.species[0].impacts[2].time=2*r.config.duration;assert.throws(()=>arrivalCurves(r));
 r.species[0].impacts[2].time=r.config.duration+1e-13;assert.throws(()=>arrivalCurves(r));
 r.species[0].impacts[2].time=8e-6;r.species[0].remaining=0;assert.throws(()=>collectionSummary(r));
});

test('independent-seed generation is deterministic, unique and stays uint32 across wraparound',()=>{
 const a=independentSeeds(0xffffffff,64);
 assert.deepEqual(a,independentSeeds(0xffffffff,64));assert.equal(new Set(a).size,64);
 assert.ok(a.every(s=>Number.isSafeInteger(s)&&s>=0&&s<=0xffffffff));
 assert.equal(a[0],0xffffffff);
 for(const args of [[-1,4],[1,0],[1,65],[1.5,4]])assert.throws(()=>independentSeeds(args[0],args[1]));
});

test('paired-batch bootstrap preserves shared-species variation instead of fabricating purity noise',()=>{
 const runs=independentSeeds(10,4).map(seed=>fixture(seed));
 // Vary counts identically for both species within every paired batch.
 runs[1].species.forEach(s=>{s.end=2;s.remaining=0;s.impacts.push({...s.impacts[2]});s.endRadialBins[0]++;});
 runs[2].species.forEach(s=>{s.wall=2;s.remaining=0;s.impacts.push({...s.impacts[1]});s.wallAxialBins[0]++;});
 const a=summarizeEnsemble(runs),b=summarizeEnsemble(runs);
 assert.deepEqual(a,b);
 for(const p of [a.purity.endA,a.purity.wallB]){
  assert.equal(p.fraction,.5);assert.equal(p.low,.5);assert.equal(p.high,.5);
  assert.equal(p.validResamples,4096);assert.equal(p.undefinedResamples,0);
 }
 assert.equal(a.species[0].injected,16);assert.equal(a.species[0].outcomes.end.count,5);
});

test('sparse bootstrap does not silently discard empty-collector resamples',()=>{
 const a=fixture(1),b=fixture(2);
 b.species.forEach(s=>{s.end=0;s.remaining=2;s.impacts=s.impacts.filter(p=>p.destination!=='end');s.endRadialBins=[0,0];});
 const p=summarizeEnsemble([a,b]).purity.endA;
 assert.equal(p.fraction,.5);assert.ok(p.undefinedResamples>0);assert.equal(p.low,null);assert.equal(p.high,null);
 assert.equal(p.validResamples+p.undefinedResamples,4096);
 assert.equal(p.intervalUnavailableReason,'empty collector in bootstrap resample');
});

test('unobserved collector components retain zero/one point purity without fictitious certainty',()=>{
 for(const reverse of [false,true]){
  const runs=independentSeeds(10,4).map(seed=>fixture(seed));
  for(const run of runs)run.species.forEach((s,i)=>{
   const wall=Boolean(i)!==reverse;
   s.end=wall?0:4;s.wall=wall?4:0;s.source=0;s.remaining=0;
   s.impacts=Array.from({length:4},()=>({...s.impacts[wall?1:2],destination:wall?'wall' as const:'end' as const}));
   s.endRadialBins=[s.end,0];s.wallAxialBins=[s.wall,0];
  });
  const summary=summarizeEnsemble(runs);
  for(const p of Object.values(summary.purity)){
   assert.equal(p.fraction,reverse?0:1);
   assert.equal(p.low,null);assert.equal(p.high,null);
   assert.equal(p.intervalUnavailableReason,'one species unobserved in collector');
   assert.equal(p.validResamples,4096);assert.equal(p.undefinedResamples,0);
  }
  assert.ok(summary.species[0].outcomes.end.low<summary.species[0].outcomes.end.high);
 }
});

test('ensemble rejects repeated seeds, changed settings and absent batches',()=>{
 assert.throws(()=>summarizeEnsemble([fixture()]));
 assert.throws(()=>summarizeEnsemble([fixture(),fixture()]));
 const a=fixture(1),b=fixture(2);b.config.voltage=0;assert.throws(()=>summarizeEnsemble([a,b]));
 b.config.voltage=a.config.voltage;b.species.reverse();assert.throws(()=>summarizeEnsemble([a,b]));
});

test('actual independent simulate runs satisfy arrival/summary invariants and reproduce the ensemble',()=>{
 const runs=independentSeeds(42,3).map(seed=>simulate({...DEFAULT_CONFIG,seed,particlesPerSpecies:8,duration:2e-5}));
 assert.ok(runs.every(r=>arrivalCurves(r).length>=8));
 const a=summarizeEnsemble(runs);
 const again=independentSeeds(42,3).map(seed=>simulate({...DEFAULT_CONFIG,seed,particlesPerSpecies:8,duration:2e-5}));
 assert.deepEqual(a,summarizeEnsemble(again));
});

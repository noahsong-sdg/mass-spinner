import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_DOUBLEWELL,simulateDoublewell} from '../src/doublewell-dynamics.js';
import {seedInterval,equivalence,executeSeed,observeDoublewell,summarizeConvergence,validateConvergencePlan,
 type ConvergencePlan,type SeedRun} from '../src/convergence.js';

const plan:ConvergencePlan={id:'test',description:'Declared before observing output',
 seeds:[11,22,33,44],levels:[{id:'coarse',config:DEFAULT_DOUBLEWELL},
  {id:'fine',config:{...DEFAULT_DOUBLEWELL,dt:DEFAULT_DOUBLEWELL.dt/2}}],
 comparisons:[{kind:'timestep',coarse:'coarse',fine:'fine'}],
 tolerances:{fraction:.01,radiusFraction:.01,temperatureEV:.1,timeFraction:.02,normalizedAngularMomentum:.001,
  maxRawMomentumResidual:.001,maxUnresolvedExposure:.01,minimumSeeds:4}};
function run(level:string,seed:number,value:number|null):SeedRun {
 return {level,seed,config:{...plan.levels.find(l=>l.id===level)!.config,seed},durationMs:1,status:'complete',
  randomSource:plan.levels.find(l=>l.id===level)!.config.randomSource,
  observables:{'A.fraction.end':value},diagnostics:{maxRawMomentumResidual:0,maxEnergyResidual:0,
   unresolvedExposure:0,outsideSnapshots:0,unpairedExposure:0,particleSteps:1}};
}

test('whole-run Student-t uncertainty remains undefined for one run and matches an independent small-sample example',()=>{
 assert.deepEqual(seedInterval([]),{n:0,mean:null,standardError:null,halfWidth95:null});
 assert.deepEqual(seedInterval([3]),{n:1,mean:3,standardError:null,halfWidth95:null});
 const result=seedInterval([1,2,3,4]);
 assert.equal(result.mean,2.5);
 assert.ok(Math.abs(result.standardError!-Math.sqrt(5/12))<1e-15);
 assert.ok(Math.abs(result.halfWidth95!-3.182446*Math.sqrt(5/12))<1e-12);
 assert.throws(()=>seedInterval([1,NaN]),/finite/);
});

test('equivalence requires the entire confidence interval inside the declared budget, with pass/fail/unknown distinct',()=>{
 assert.equal(equivalence(seedInterval([.0008,.0009,.0011,.0012]),.01,4),'pass');
 assert.equal(equivalence(seedInterval([.0298,.0299,.0301,.0302]),.01,4),'fail');
 assert.equal(equivalence(seedInterval([0,0,0,0]),.01,4),'unknown','An unobserved tail cannot be bounded by identical finite outcomes.');
 assert.equal(equivalence(seedInterval([-.1,.1,-.1,.1]),.01,4),'unknown');
 assert.equal(equivalence(seedInterval([0,0]),.01,4),'unknown');
 assert.throws(()=>equivalence(seedInterval([0,0]),0,2),/positive/);
});

test('run-paired refinement retains shared seed covariance while missing directions keep the full gate open',()=>{
 const runs=plan.seeds.flatMap((seed,i)=>[run('coarse',seed,.1*i),run('fine',seed,.1*i+.002+.0001*i)]);
 const summary=summarizeConvergence(plan,runs),delta=summary.comparisons[0].observables['A.fraction.end'];
 assert.equal(summary.comparisons[0].status,'pass');
 assert.ok(Math.abs(delta.mean!-.00215)<1e-15);assert.ok(delta.halfWidth95!>0&&delta.halfWidth95!<.001);
 assert.equal(summary.status,'unknown','A timestep comparison is not a complete physical or spatial validation.');
 assert.ok(summary.checks.some(c=>c.name==='spatial: required coverage'&&c.status==='unknown'));
});

test('failed, duplicated and undefined-population runs cannot become a partial convergence certificate',()=>{
 const full=plan.seeds.flatMap(seed=>[run('coarse',seed,.5),run('fine',seed,.5)]);
 const missing=full.slice(1),duplicate=[...full,full[0]];
 assert.equal(summarizeConvergence(plan,missing).status,'fail');
 assert.equal(summarizeConvergence(plan,duplicate).status,'fail');
 const failed=full.map((r,i)=>i===0?{...r,status:'error' as const,error:'integration failed',diagnostics:undefined,observables:{}}:r);
 assert.equal(summarizeConvergence(plan,failed).status,'fail');
 const undefinedRuns=plan.seeds.flatMap(seed=>[run('coarse',seed,null),run('fine',seed,null)]);
 assert.equal(summarizeConvergence(plan,undefinedRuns).comparisons[0].status,'unknown');
});

test('comparison rejects a changed physical horizon or density disguised as numerical refinement',()=>{
 validateConvergencePlan(plan);
 for(const change of [{duration:1e-5},{densityM3:1e17}]){
  const mutated=structuredClone(plan);Object.assign(mutated.levels[1].config,change);
  assert.throws(()=>validateConvergencePlan(mutated),/horizon|undeclared/);
 }
 const repeated=structuredClone(plan);repeated.seeds=[11,11];
 assert.throws(()=>validateConvergencePlan(repeated),/distinct/);
});

test('production all-exited pulse keeps survivor observations undefined and preserves unconditional radial inventory',()=>{
 const config={...DEFAULT_DOUBLEWELL,magneticT:0,voltage:0,ionTemperatureEV:.01,beamEV:100,
  rotationMode:'common' as const,rotationRadS:0,particlesPerSpecies:8,collisions:false,dt:1e-6,duration:7e-5};
 const actual=simulateDoublewell(config),observed=observeDoublewell(actual),run=executeSeed({id:'ballistic',config},17);
 for(const label of ['A','B']){
  assert.equal(observed[`${label}.fraction.end`],1);assert.equal(observed[`${label}.fraction.active`],0);
  assert.equal(observed[`${label}.radius`],null);assert.equal(observed[`${label}.temperature`],null);
  assert.equal(observed[`${label}.cdf.19`],0);
  assert.ok(observed[`${label}.impactTime.0.5`]!>0&&observed[`${label}.impactTime.0.5`]!<=1);
  assert.ok(Math.abs(observed[`${label}.angularTransfer`]!)<1e-12);
 }
 assert.equal(run.status,'complete');assert.equal(run.raw!.species[0].injected,8);
 assert.ok(run.diagnostics!.unresolvedExposure!>0&&run.diagnostics!.unresolvedExposure!<1,'Partial sparse exposure is retained even for a collision-free control.');
 assert.equal(run.raw!.regimeHistory.at(-1)!.assessment.observed.unresolvedRepresentativeFraction,null,'All-exited local estimates remain undefined.');
 const bad=executeSeed({id:'invalid',config:{...config,dt:1e-3,voltage:20}},17);
 assert.equal(bad.status,'error');assert.match(bad.error!,/timestep/);
});

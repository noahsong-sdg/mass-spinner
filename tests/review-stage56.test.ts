import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_DOUBLEWELL,simulateDoublewell} from '../src/doublewell-dynamics.js';
import {summarizeConvergence,validateConvergencePlan,seedInterval,equivalence,type ConvergencePlan,type SeedRun} from '../src/convergence.js';

function plan():ConvergencePlan{
 const base={...DEFAULT_DOUBLEWELL,collisions:false,duration:1e-6};
 return {id:'independent-review',description:'Controlled gate fixtures, not experimental evidence',seeds:[11,22],
  levels:[{id:'coarse',config:base},{id:'fine',config:{...base,dt:base.dt/2}}],
  comparisons:[{kind:'timestep',coarse:'coarse',fine:'fine'}],
  tolerances:{fraction:.01,radiusFraction:.01,temperatureEV:.1,timeFraction:.02,normalizedAngularMomentum:.001,
   maxRawMomentumResidual:.001,maxUnresolvedExposure:.01,minimumSeeds:2}};
}

test('independent review: unsupported orientation and grid-shift settings cannot masquerade as executed sensitivity checks',()=>{
 for(const [kind,key]of [['orientation','initialAzimuth'],['alignment','collisionGridOffset']] as const){
  const p=plan();p.comparisons=[{kind,coarse:'coarse',fine:'fine'}];
  p.levels[1].config={...p.levels[0].config,[key]:.17};
  assert.throws(()=>validateConvergencePlan(p),/unsupported|not implemented|not supported/i,
   'The solver does not read these fields; identical paths cannot establish invariance.');
 }
});

test('independent review: stale declared-level settings cannot contribute a passing refinement comparison',()=>{
 const p=plan();
 const runs:SeedRun[]=p.levels.flatMap(level=>p.seeds.map(seed=>({
  level:level.id,seed,config:{...p.levels[0].config,seed},durationMs:0,status:'complete' as const,
  observables:{'A.fraction.end':.5},
 })));
 // Both labels contain coarse dt, so the alleged refined run was not executed.
 const result=summarizeConvergence(p,runs);
 assert.equal(result.status,'fail');
 assert.ok(result.checks.some(c=>c.status==='fail'&&/identity|settings|config|stale/i.test(c.name+' '+c.reason)));
 assert.notEqual(result.comparisons[0].status,'pass');
});

test('independent review: a collision-on/off effect must compare identical physics and actual opposite switches',()=>{
 const p=plan();
 p.levels=[{id:'coarse',config:{...p.levels[0].config,collisions:false}},
  {id:'fine',config:{...p.levels[0].config,collisions:true}}];
 p.comparisons=[];p.physicalEffect={control:'coarse',collisional:'fine'};
 validateConvergencePlan(p);
 const sameSwitch=structuredClone(p);sameSwitch.levels[0].config.collisions=true;
 assert.throws(()=>validateConvergencePlan(sameSwitch),/effect|collision|control/i);
 const changedPhysics=structuredClone(p);changedPhysics.levels[1].config.densityM3/=10;
 assert.throws(()=>validateConvergencePlan(changedPhysics),/effect|physics|settings|control/i);
});

test('independent review: adaptive diagnostics cannot modify trajectories when collisions are switched off',()=>{
 const c={...DEFAULT_DOUBLEWELL,collisions:false,particlesPerSpecies:32,duration:2e-6};
 const fixed=simulateDoublewell(c),adaptive=simulateDoublewell({...c,collisionMethod:'adaptive'});
 assert.deepEqual(fixed.species,adaptive.species);
 assert.deepEqual(fixed.history,adaptive.history);
 assert.deepEqual(fixed.conservation,adaptive.conservation);
 assert.equal(adaptive.collisions.pairs,0);
});

test('independent review: renaming identical settings does not execute a refinement',()=>{
 const p=plan();p.levels[1].config={...p.levels[0].config};
 assert.throws(()=>validateConvergencePlan(p),/resolution|refinement/i);
});

test('independent review: unobserved seed spread cannot produce a zero-width rare-tail convergence certificate',()=>{
 for(const differences of [[0,0,0,0,0,0],[.001,.001,.001,.001,.001,.001]]){
  const interval=seedInterval(differences);
  assert.equal(interval.halfWidth95,null);
  assert.equal(equivalence(interval,.01,6),'unknown');
 }
});

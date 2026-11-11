import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULT_DOUBLEWELL,simulateDoublewell,validateDoublewell,type DoublewellConfig} from '../src/doublewell-dynamics.js';
import {executeSeed,summarizeConvergence,validateConvergencePlan,type ConvergencePlan,type SeedRun} from '../src/convergence.js';

const fixture=JSON.parse(readFileSync('tests/fixtures/rng-legacy-v33.json','utf8'));
const legacy=():DoublewellConfig=>structuredClone(fixture.config);
const phi='philox4x32-10-u32-v1' as const;
const plan=(config:DoublewellConfig):ConvergencePlan=>({...structuredClone(fixture.plan),levels:[{id:'tiny',config}]});
const persisted=(value:unknown)=>JSON.parse(JSON.stringify(value));
const strip=(run:SeedRun)=>{const {durationMs,randomSource,...rest}=run;return rest;};
const incomplete=(declared:ConvergencePlan,runs:SeedRun[],hash:string)=>
 summarizeConvergence(declared,runs,hash).checks.some(c=>c.name.endsWith('complete batch')&&c.status==='fail');

test('new double-well defaults explicitly select versioned Philox',()=>{assert.equal(DEFAULT_DOUBLEWELL.randomSource,phi);});
test('omitted and explicit legacy selectors preserve the frozen v33 trajectory and raw run',()=>{
 for(const config of [legacy(),{...legacy(),randomSource:'mulberry32-v1' as const}]){
  assert.deepEqual(persisted(simulateDoublewell(config)),{...fixture.trajectory,config});
  assert.deepEqual(persisted(strip(executeSeed({id:'tiny',config},42,'same'))),{...strip(fixture.seedRun),config:{...config,seed:42}});
 }
});
test('new valid runs write resolved RNG provenance without migrating omitted legacy config',()=>{
 for(const [config,expected] of [[legacy(),'mulberry32-v1'],[{...legacy(),randomSource:phi},phi]] as const){
  const actual=executeSeed({id:'tiny',config},42,'same','research');
  assert.equal(actual.status,'complete');assert.equal(actual.randomSource,expected);assert.equal(actual.executionMode,'research');
  assert.deepEqual(actual.config,{...config,seed:42});
 }
});
test('null and unknown RNG selectors are invalid even in plans without comparisons',()=>{
 for(const randomSource of [null,'unknown',false,0]){
  const config={...legacy(),randomSource} as unknown as DoublewellConfig;
  assert.throws(()=>validateDoublewell(config),/random source/);assert.throws(()=>validateConvergencePlan(plan(config)),/random source/);
  const run=executeSeed({id:'tiny',config},42);assert.equal(run.status,'error');assert.match(run.error!,/random source/);
  assert.equal(run.randomSource,undefined);
 }
});
test('historical omitted-source plan and records retain their full frozen summary',()=>{
 assert.deepEqual(summarizeConvergence(fixture.plan,fixture.runs,'old'),fixture.summary);
});
test('missing/null/mismatched source headers and relabelled old runs cannot certify Philox',()=>{
 const declared=plan({...legacy(),randomSource:phi}),good=declared.seeds.map(seed=>executeSeed(declared.levels[0],seed,'new'));
 assert.equal(incomplete(declared,good,'new'),false);
 for(const source of [undefined,null,'mulberry32-v1','unknown'])
  assert.equal(incomplete(declared,good.map(r=>({...r,randomSource:source})) as SeedRun[],'new'),true);
 const relabelled=fixture.runs.map((r:SeedRun)=>({...r,sourceHash:'new',config:{...declared.levels[0].config,seed:r.seed}}));
 assert.equal(incomplete(declared,relabelled,'new'),true);
});
test('Philox headers on legacy configs and changed execution modes are rejected',()=>{
 const declared=plan(legacy()),runs=declared.seeds.map(seed=>executeSeed(declared.levels[0],seed,'new'));
 for(const mutate of [(r:SeedRun)=>({...r,randomSource:phi}),(r:SeedRun)=>({...r,executionMode:'research' as const})])
  assert.equal(incomplete(declared,runs.map(mutate),'new'),true);
});
test('RNG changes cannot masquerade as timestep, particle, spatial or method refinement',()=>{
 for(const [kind,change] of [['timestep',{dt:5e-8}],['particle',{particlesPerSpecies:16}],['spatial',{cellsAcross:4}],['method',{collisionMethod:'axisymmetric'}]] as const){
  const declared=plan(legacy());declared.levels.push({id:'fine',config:{...legacy(),...change,randomSource:phi}});
  declared.comparisons=[{kind,coarse:'tiny',fine:'fine'}];assert.throws(()=>validateConvergencePlan(declared),/undeclared/);
 }
});

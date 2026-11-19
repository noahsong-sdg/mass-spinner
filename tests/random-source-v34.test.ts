import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULT_DOUBLEWELL,simulateDoublewell,validateDoublewell,type DoublewellConfig} from '../src/doublewell-dynamics.js';
import {executeSeed,summarizeConvergence,validateConvergencePlan,type ConvergencePlan,type SeedRun} from '../src/convergence.js';

// Only derived diagnostics may differ by two relative machine epsilons across V8.
// Every trajectory, RNG sample, count, scientific metadata field and other number stays exact.
function frozenReport(actual:unknown,expected:unknown,allowRoundoff=false):void{
 if(allowRoundoff&&typeof actual==='number'&&typeof expected==='number'){
  assert.ok(Number.isFinite(actual)&&Number.isFinite(expected));
  assert.ok(Math.abs(actual-expected)<=2*Number.EPSILON*Math.abs(expected),`${actual} differs from frozen ${expected}`);return;
 }
 if(actual&&expected&&typeof actual==='object'&&typeof expected==='object'){
  assert.equal(Array.isArray(actual),Array.isArray(expected));
  assert.deepEqual(Object.keys(actual),Object.keys(expected));
  const a=actual as Record<string,unknown>,b=expected as Record<string,unknown>;
  for(const key of Object.keys(a)){
   const diagnostic=['normalizedAbsolutePairTorque','localityQuadraticVariationScale','particlesPerDebyeSphere','debyePopulation'].includes(key);
   const metric=key==='value'&&typeof a.label==='string'&&[
    'Accumulated absolute pair torque / P scale','Pair torque quadratic-variation scale / P scale','Initial electrons per Debye sphere',
   ].includes(a.label);
   frozenReport(a[key],b[key],diagnostic||metric);
  }
 }else assert.deepEqual(actual,expected);
}

const fixture=JSON.parse(readFileSync('tests/fixtures/rng-legacy-v33.json','utf8'));
// Keep the historical fixture intact. Only these reviewed display strings changed.
const legacyAssumptions=[fixture.trajectory.assumptions[0],
 'This exploratory kinetic model uses multiple species with equal-weight particles and prescribed fields. It does not include self-consistent electrons, potential, magnetic field, source circuit or instabilities. It does not give calibrated apparatus predictions.',
 'The initial pulse occupies a uniform disk and finite axial length at t=0. Source, wall and end boundaries then absorb particles. This is not continuous injection or steady throughput.',
 'Active equal-weight representatives and exact cylinder-cut Cartesian cell volumes give density. Finite cell occupancy and spatial separation between collision partners bias relaxation and add measured numerical torque. Cell and particle-count refinement must occur together.',
 'Takizuka–Abe small-angle pair rotations preserve pair energy and linear momentum. The finite timestep approximates Landau scattering. The model reports large angular variances without a relative-speed floor. Time and seed convergence are necessary.',
 'Absolute pair-torque sums show cancellation but can increase during time refinement for stochastic impulses. The torque quadratic-variation scale is a diagnostic, not a confidence bound. Raw signed Pθ drift is the measured conservation error.',
 'Collisions correlate sampling errors. Outlet fractions are descriptive counts. Uncertainty estimates must use independently seeded ensembles, not independent-ion Wilson purity bands.',
 'Initial screening uses a conservative species-peak/charge-density bound and declared temperatures. Sampled local checks subtract each species mean drift and use at least four representatives per present species. Sparse cells are unresolved. Domain violations identify the run without changes to trajectories. These checks give no proof between sample times. Electron temperature and the Coulomb logarithm are prescribed inputs.',
 'Survivor flow, temperature and radius apply only to the particles that stay in the domain. Fitted rigid-rotation subtraction is a diagnostic, not a local thermodynamic temperature. Empty survivor populations have undefined properties.',
 'Species-specific zero-canonical mean rotation gives only the initial flow. Thermal velocity gives a distribution of Pθ. Interspecies collisions exchange angular momentum. No thermostat drives species to their separate effective-well Boltzmann profiles.',
];
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
  frozenReport(persisted(simulateDoublewell(config)),{...fixture.trajectory,config,assumptions:legacyAssumptions});
  frozenReport(persisted(strip(executeSeed({id:'tiny',config},42,'same'))),{...strip(fixture.seedRun),config:{...config,seed:42}});
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

test('frozen diagnostic allowance rejects material drift and never applies to trajectories',()=>{
 frozenReport({debyePopulation:1+Number.EPSILON},{debyePopulation:1});
 assert.throws(()=>frozenReport({debyePopulation:1+4*Number.EPSILON},{debyePopulation:1}));
 assert.throws(()=>frozenReport({position:1+Number.EPSILON},{position:1}));
 assert.throws(()=>frozenReport({debyePopulation:NaN},{debyePopulation:1}));
});

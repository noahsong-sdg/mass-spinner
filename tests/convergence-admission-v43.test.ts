import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_DOUBLEWELL} from '../src/doublewell-dynamics.js';
import {summarizeConvergence,type ConvergencePlan,type SeedRun} from '../src/convergence.js';

const plan:ConvergencePlan={id:'diagnostic-admission',description:'Synthetic diagnostic boundary; no transport qualification',
 seeds:[11,22],levels:[{id:'tiny',config:DEFAULT_DOUBLEWELL}],comparisons:[],
 tolerances:{fraction:.01,radiusFraction:.01,temperatureEV:.1,timeFraction:.02,normalizedAngularMomentum:.001,
  maxRawMomentumResidual:.001,maxUnresolvedExposure:.01,minimumSeeds:2}};
function records():SeedRun[]{
 return plan.seeds.map(seed=>({level:'tiny',seed,config:{...DEFAULT_DOUBLEWELL,seed},sourceHash:'same',
  randomSource:DEFAULT_DOUBLEWELL.randomSource,durationMs:1,status:'complete',observables:{'A.fraction.end':.5},
  diagnostics:{maxRawMomentumResidual:0,maxEnergyResidual:0,unresolvedExposure:0,outsideSnapshots:0,unpairedExposure:0,particleSteps:1}}));
}
const check=(runs:SeedRun[],name:string,p=plan)=>summarizeConvergence(p,runs,'same').checks.find(c=>c.name===`tiny: ${name}`)!;
function patched(field:string,value:unknown){
 const runs=records();Object.assign(runs[0].diagnostics!,{[field]:value});return runs;
}

test('coverage admits valid fraction boundaries and preserves budget/domain decisions',()=>{
 for(const value of [0,.01])assert.equal(check(patched('unresolvedExposure',value),'sampled local coverage').status,'pass');
 const fullBudget={...plan,tolerances:{...plan.tolerances,maxUnresolvedExposure:1}};
 assert.equal(check(patched('unresolvedExposure',1),'sampled local coverage',fullBudget).status,'pass');
 assert.equal(check(patched('unresolvedExposure',.02),'sampled local coverage').status,'unknown');
 assert.equal(check(patched('outsideSnapshots',1),'sampled local coverage').status,'fail');
});

test('coverage never admits malformed exposure fractions or sampled outside counts',()=>{
 for(const value of [undefined,null,-.5,1.001,NaN,Infinity,-Infinity,true,'0'])
  assert.equal(check(patched('unresolvedExposure',value),'sampled local coverage').status,'unknown',String(value));
 for(const value of [undefined,null,-1,.5,NaN,Infinity,true,'0',Number.MAX_SAFE_INTEGER+1])
  assert.equal(check(patched('outsideSnapshots',value),'sampled local coverage').status,'unknown',String(value));
 // A genuine observed domain exit remains a failure even when another measure is unavailable.
 const outside=patched('outsideSnapshots',1);delete (outside[0].diagnostics! as Partial<NonNullable<SeedRun['diagnostics']>>).unresolvedExposure;
 assert.equal(check(outside,'sampled local coverage').status,'fail');
});

test('raw angular budget admits finite nonnegative norms only and retains measured excess failure',()=>{
 for(const value of [0,.001])assert.equal(check(patched('maxRawMomentumResidual',value),'raw angular-momentum budget').status,'pass');
 assert.equal(check(patched('maxRawMomentumResidual',.0011),'raw angular-momentum budget').status,'fail');
 for(const value of [undefined,null,-1,NaN,Infinity,-Infinity,true,'0'])
  assert.equal(check(patched('maxRawMomentumResidual',value),'raw angular-momentum budget').status,'unknown',String(value));
 const exceeded=patched('maxRawMomentumResidual',NaN);exceeded[1].diagnostics!.maxRawMomentumResidual=.002;
 assert.equal(check(exceeded,'raw angular-momentum budget').status,'fail');
});

test('persisted records predating diagnostic members remain unassessed instead of acquiring passing defaults',()=>{
 for(const field of ['unresolvedExposure','outsideSnapshots','maxRawMomentumResidual','diagnostics']){
  const saved=records() as unknown as Record<string,unknown>[];
  for(const run of saved){
   if(field==='diagnostics')delete run.diagnostics;
   else delete (run.diagnostics as Record<string,unknown>)[field];
  }
  const loaded=JSON.parse(JSON.stringify(saved)) as SeedRun[],summary=summarizeConvergence(plan,loaded,'same');
  assert.equal(summary.status,'unknown');
  const name=field==='maxRawMomentumResidual'?'raw angular-momentum budget':'sampled local coverage';
  assert.equal(check(loaded,name).status,'unknown',field);
  if(field==='diagnostics')assert.equal(check(loaded,'raw angular-momentum budget').status,'unknown');
  assert.ok(!summary.checks.some(c=>c.name.endsWith(': complete batch')&&c.status==='fail'));
 }
});

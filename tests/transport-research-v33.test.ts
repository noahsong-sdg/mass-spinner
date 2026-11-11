import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_DOUBLEWELL,simulateDoublewell,validateDoublewell,type DoublewellConfig} from '../src/doublewell-dynamics.js';
import {executeSeed,summarizeConvergence,type ConvergencePlan} from '../src/convergence.js';

const config={...DEFAULT_DOUBLEWELL,particlesPerSpecies:8,duration:1e-7};
const tolerances={fraction:.01,radiusFraction:.01,temperatureEV:.1,timeFraction:.02,
 normalizedAngularMomentum:.001,maxRawMomentumResidual:.001,maxUnresolvedExposure:.01,minimumSeeds:6};

test('explicit research admission extends particle/work ceilings while preserving interactive limits',()=>{
 const high={...config,particlesPerSpecies:16384,dt:1e-7,duration:2e-4};
 assert.throws(()=>validateDoublewell(high),/representatives/);
 assert.doesNotThrow(()=>validateDoublewell(high,'research'));
 assert.doesNotThrow(()=>validateDoublewell({...high,particlesPerSpecies:65536,dt:5e-7},'research'));
 assert.doesNotThrow(()=>validateDoublewell({...high,particlesPerSpecies:65536},'research'));
 assert.throws(()=>validateDoublewell({...high,particlesPerSpecies:65536,dt:5e-8},'research'),/320 million particle steps/);
 assert.throws(()=>validateDoublewell({...high,particlesPerSpecies:4096,dt:1e-8}),/80 million particle steps/);
 assert.throws(()=>validateDoublewell({...high,particlesPerSpecies:65537,dt:5e-7},'research'),/representatives/);
 for(const mode of ['other',null,1])assert.throws(()=>validateDoublewell(config,mode as never),/execution mode/);
});

test('omitted interactive mode and research mode execute identical admissible physics',()=>{
 assert.deepEqual(simulateDoublewell(config),simulateDoublewell(config,'interactive'));
 assert.deepEqual(simulateDoublewell(config),simulateDoublewell(config,'research'));
});

test('research runs record admission mode and stale unmarked records cannot fill their plan',()=>{
 const plan:ConvergencePlan={id:'research-mode',description:'Mode provenance test',executionMode:'research',
  seeds:[101,202,303,404,505,606],levels:[{id:'one',config}],comparisons:[],tolerances};
 const runs=plan.seeds.map(seed=>executeSeed(plan.levels[0],seed,'source','research'));
 assert.ok(runs.every(r=>r.status==='complete'&&r.executionMode==='research'));
 const check=(records:typeof runs,p=plan)=>summarizeConvergence(p,records,'source').checks.find(c=>c.name==='one: complete batch');
 assert.equal(check(runs),undefined);
 const legacy=runs.map(({executionMode,...r})=>r);
 assert.equal(check(legacy)?.status,'fail');
 const {executionMode,...legacyPlan}=plan;
 assert.equal(check(legacy,legacyPlan),undefined,'absent historical mode means interactive');
 const corrupt=legacy.map(r=>({...r,executionMode:null as never}));
 assert.equal(check(corrupt,legacyPlan)?.status,'fail','explicit null is not a legacy omitted mode');
 assert.equal(check(runs,legacyPlan)?.status,'fail');
});

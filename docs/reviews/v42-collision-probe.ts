import assert from 'node:assert/strict';
import {DEFAULT_DOUBLEWELL} from '../../src/doublewell-dynamics.ts';
import {summarizeConvergence,type ConvergencePlan,type SeedRun} from '../../src/convergence.ts';

// Saved-record boundary witness only. This does not execute a trajectory.
const config={...structuredClone(DEFAULT_DOUBLEWELL),collisions:true};
const plan:ConvergencePlan={id:'v42-invalid-coverage-witness',description:'Synthetic malformed saved diagnostics',
 levels:[{id:'one',config}],seeds:[1,2],comparisons:[],
 tolerances:{fraction:.01,radiusFraction:.01,temperatureEV:.1,timeFraction:.02,
  normalizedAngularMomentum:.001,maxRawMomentumResidual:.001,maxUnresolvedExposure:.01,minimumSeeds:2}};
const rows=[];
for(const exposure of [-.5,NaN,undefined]){
 const runs:SeedRun[]=plan.seeds.map(seed=>({level:'one',seed,config:{...config,seed},sourceHash:'witness',
  randomSource:config.randomSource,executionMode:'interactive',durationMs:0,status:'complete',observables:{},
  diagnostics:{maxRawMomentumResidual:0,maxEnergyResidual:0,unresolvedExposure:exposure as number,
   outsideSnapshots:0,unpairedExposure:0,particleSteps:0}}));
 const report=summarizeConvergence(plan,runs,'witness');
 const gate=report.checks.find(check=>check.name==='one: sampled local coverage')!;
 assert.equal(gate.status,'pass','Witness expected pre-fix acceptance of invalid coverage');
 assert.equal(report.status,'unknown','Missing continuum coverage must still prevent global qualification');
 rows.push({exposure:Number.isNaN(exposure)?'NaN':exposure===undefined?'missing':exposure,gate:gate.status,overall:report.status});
}
console.log(JSON.stringify({scope:'Malformed saved diagnostics accepted by coverage gate; no retained cohort corruption demonstrated',rows}));

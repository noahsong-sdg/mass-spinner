import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateTargetLoading, type LoadingSource} from '../src/target-loading.js';

const config={replacementProbability:.8,intervals:40,relativeTolerance:1e-11,absoluteTolerance:1e-13};
const source:LoadingSource={config:{targetColumnM2:.65,beamAreaM2:1,exposureS:1e7},
 siteColumnM2:1,unitLoadingOpticalDepth:1e-6,particleRateS:1};
const close=(a:number,b:number,relative=3e-9,absolute=2e-13)=>assert.ok(
 Math.abs(a-b)<=absolute+relative*Math.abs(b),`${a} != ${b}`);

test('future exposure horizon does not change the resolved initial transient or small fusion ledger',()=>{
 const long=simulateTargetLoading(source,config);
 const early=long.history.filter(s=>s.timeS>0&&s.timeS<2);
 assert.ok(early.length>=4,'adaptive history must retain early-time states');
 for(const state of early.filter((_,i)=>i%Math.max(1,Math.floor(early.length/5))===0)){
  const short=simulateTargetLoading({...source,config:{...source.config,exposureS:state.timeS}},config).final;
  for(const key of ['tritiumFraction','deuteriumFraction','vacancyFraction','retainedIncomingD','unretainedD','releasedT','releasedD'] as const)
   close(state[key],short[key]);
  close(state.fusedT,short.fusedT,3e-9,1e-20);
 }
});

test('areal-dose coordinates preserve populations and scale total nuclei with illuminated area',()=>{
 const base={...source,config:{...source.config,exposureS:5}};
 const a=simulateTargetLoading(base,config),b=simulateTargetLoading({...base,
  config:{...base.config,beamAreaM2:10},particleRateS:10},config);
 for(const key of ['tritiumFraction','deuteriumFraction','vacancyFraction'] as const)close(a.final[key],b.final[key],2e-14);
 for(const key of ['cumulativeNeutrons','incidentD','retainedIncomingD','unretainedD','releasedT','releasedD'] as const)
  close(10*a.final[key],b.final[key],2e-14,1e-20);
 close(10*a.final.neutronRateS,b.final.neutronRateS,2e-14,1e-20);
});

test('inverse beam-current and exposure scaling preserves accumulated loading, not instantaneous neutron rate',()=>{
 const base={...source,config:{...source.config,exposureS:5}};
 const a=simulateTargetLoading(base,config),b=simulateTargetLoading({...base,
  config:{...base.config,exposureS:.5},particleRateS:10},config);
 for(const key of ['tritiumFraction','deuteriumFraction','vacancyFraction','cumulativeNeutrons','incidentD','retainedIncomingD','unretainedD','releasedT','releasedD'] as const)
  close(a.final[key],b.final[key],2e-14,1e-20);
 close(10*a.final.neutronRateS,b.final.neutronRateS,2e-14,1e-20);
 close(a.final.timeS,10*b.final.timeS,2e-14);
});

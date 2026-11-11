import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {simulateTargetLoading, type TargetLoadingConfig} from '../src/target-loading.js';

type Case={id:string;tau:number;eta:number;dose:number;initialT:number};
type Reference={case:Case;fine:{values:number[]};coarse:{values:number[]};second:{values:number[]}|null};
const references=JSON.parse(readFileSync(new URL('../scientific/loading-independent-v24/reference-v24.json',import.meta.url),'utf8')).cases as Reference[];
const run=(c:Case,config:Partial<TargetLoadingConfig>={})=>simulateTargetLoading({
 config:{targetColumnM2:c.initialT,beamAreaM2:1,exposureS:c.dose},siteColumnM2:1,
 unitLoadingOpticalDepth:c.tau,particleRateS:1,
},{replacementProbability:c.eta,intervals:40,...config});
const vector=(s:ReturnType<typeof run>['final'])=>[s.tritiumFraction,s.deuteriumFraction,s.vacancyFraction,
 s.fusedT,s.retainedIncomingD,s.unretainedD,s.releasedT,s.releasedD];
const close=(a:number,b:number,relative:number,absolute:number,label:string)=>assert.ok(
 Math.abs(a-b)<=absolute+relative*Math.abs(b),`${label}: ${a} vs independent ${b}`);

test('historical high-dose bias is removed against independently integrated Radau reference',()=>{
 const reference=references.find(r=>r.case.id==='historical-high-dose')!;
 close(run(reference.case).final.fusedT,reference.fine.values[3],2e-8,1e-26,'high-dose fusion');
});

test('all eight populations and event channels match independent SciPy references across 42 extreme cases',()=>{
 assert.equal(references.length,42);
 for(const reference of references){
  const actual=vector(run(reference.case).final);
  actual.forEach((value,i)=>close(value,reference.fine.values[i],2e-8,i===3?1e-26:2e-10,`${reference.case.id} channel ${i}`));
 }
});

test('adaptive histories retain positivity, sites and separately recomputed isotope/projectile budgets',()=>{
 for(const {case:c} of references){
  const result=run(c);let previous=result.initial;
  for(const s of result.history){
   assert.ok(vector(s).every(x=>Number.isFinite(x)&&x>=0),`${c.id}: negative/nonfinite channel`);
   close(s.tritiumFraction+s.deuteriumFraction+s.vacancyFraction,1,0,2e-14,`${c.id}: sites`);
   close(s.tritiumFraction+s.fusedT+s.releasedT,c.initialT,0,2e-9,`${c.id}: target T`);
   const budgetTolerance=2e-9+64*Number.EPSILON*Math.max(1,s.incidentD);
   close(s.incidentD,s.fusedT+s.retainedIncomingD+s.unretainedD,0,budgetTolerance,`${c.id}: incident D`);
   close(s.deuteriumFraction-(1-c.initialT),s.retainedIncomingD-s.releasedD,0,budgetTolerance,`${c.id}: target D`);
   assert.ok(s.tritiumFraction<=previous.tritiumFraction+2e-15,`${c.id}: T increases`);
   assert.ok(s.fusedT>=previous.fusedT&&s.releasedT>=previous.releasedT&&s.releasedD>=previous.releasedD,`${c.id}: event ledger decreases`);
   previous=s;
  }
  assert.ok(result.solver.maxAcceptedErrorRatio<=1);
 }
});

test('plot density no longer selects the reaction/exchange timestep',()=>{
 for(const id of ['historical-high-dose','joint-moderate']){
  const reference=references.find(r=>r.case.id===id)!;
  const results=[20,200,1600].map(intervals=>run(reference.case,{intervals}));
  for(const result of results)close(result.final.fusedT,reference.fine.values[3],2e-8,1e-26,`${id}: plot density`);
  close(results[0].final.fusedT,results[2].final.fusedT,2e-8,1e-26,`${id}: density independence`);
 }
});

test('tighter local error tolerances recover independent transient fusion with positive histories',()=>{
 for(const id of ['historical-high-dose','joint-moderate']){
  const reference=references.find(r=>r.case.id===id)!;
  const loose=run(reference.case,{relativeTolerance:1e-5,absoluteTolerance:1e-7,intervals:10});
  const tight=run(reference.case,{relativeTolerance:1e-12,absoluteTolerance:1e-14,intervals:10});
  const looseError=Math.abs(loose.final.fusedT-reference.fine.values[3]);
  const tightError=Math.abs(tight.final.fusedT-reference.fine.values[3]);
  assert.ok(tightError<looseError,`${id}: tolerance refinement did not improve error`);
  close(tight.final.fusedT,reference.fine.values[3],2e-9,1e-26,`${id}: refined fusion`);
 }
});

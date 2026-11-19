import test from 'node:test';
import assert from 'node:assert/strict';
import {validateExperiment,parseValidationCase,parsePredictionArtifact,type ValidationCase,type PredictionArtifact} from '../src/experimental-validation.js';

const model={name:'prescribed-gaussian',version:'test-only-1',sourceSha256:'a'.repeat(64)};
function fixture():{data:ValidationCase;predictions:PredictionArtifact}{
 const data:ValidationCase={schemaVersion:1,id:'comparison-contract',source:{kind:'measured',citation:'TEST FIXTURE: not a real experimental source'},expectedModel:{...model},
  acceptance:{maxStandardizedResidual:3,maxNumericalErrorFraction:.25},
  conditions:[{id:'fit',split:'calibration',settings:{rotationRadS:1000},measurements:[{observable:'density',unit:'m^-3',value:10,standardUncertainty:1}]},
   {id:'holdout',split:'heldout',settings:{rotationRadS:2000},measurements:[{observable:'density',unit:'m^-3',value:20,standardUncertainty:1,coordinate:{name:'r',unit:'m',value:.5}}]}]};
 const predictions:PredictionArtifact={schemaVersion:1,caseId:data.id,model:{...model},convergence:{established:true,evidence:'TEST-only converged flag; not physical validation'},calibratedOn:['fit'],
  conditions:[{id:'fit',settings:{rotationRadS:1000},series:[{observable:'density',unit:'m^-3',values:[10],predictiveStandardUncertainty:[0],numericalErrorBound:[.1]}]},
   {id:'holdout',settings:{rotationRadS:2000},series:[{observable:'density',unit:'m^-3',values:[10,30],predictiveStandardUncertainty:[.2,.2],numericalErrorBound:[.1,.1],coordinate:{name:'r',unit:'m',values:[0,1]}}]}]};
 return {data,predictions};
}
test('matched profile comparison interpolates within its grid and exposes independent uncertainty and numerical bounds',()=>{
 const {data,predictions}=fixture(),report=validateExperiment(data,predictions);
 assert.equal(report.status,'consistent');assert.equal(report.heldoutCount,1);assert.equal(report.calibrationCount,1);
 const heldout=report.residuals[1];assert.equal(heldout.predicted,20);assert.equal(heldout.residual,0);
 assert.equal(heldout.predictiveUncertainty,.2);assert.equal(heldout.measurementUncertainty,1);assert.equal(heldout.numericalErrorBound,.1);
 assert.ok(Math.abs(heldout.scoreUpper-.1/Math.hypot(1,.2))<1e-14);
 assert.equal(report.interpretation.includes('Independent inspection of data sources, model limits, uncertainty assumptions and independence is necessary'),true);
});
test('synthetic data and unestablished numerical convergence cannot pass experimental comparison',()=>{
 const {data,predictions}=fixture();data.source.kind='synthetic';predictions.convergence.established=false;
 const r=validateExperiment(data,predictions);assert.equal(r.status,'blocked');assert.ok(r.reasons.some(s=>s.includes('The source is synthetic')));assert.ok(r.reasons.some(s=>s.includes('convergence')));
});
test('explicit a-priori comparison permits independently specified inputs without fitting measured outputs',()=>{
 const {data,predictions}=fixture();
 data.design={kind:'a-priori',protocol:{citation:'TEST-only frozen protocol',sourceSha256:'b'.repeat(64)},inputEvidence:'TEST-only independently measured input metadata'};
 data.conditions=data.conditions.slice(1);predictions.conditions=predictions.conditions.slice(1);predictions.calibratedOn=[];
 const report=validateExperiment(data,predictions);
 assert.equal(report.status,'consistent');assert.equal(report.calibrationCount,0);assert.equal(report.heldoutCount,1);
 assert.match(report.interpretation,/declarations/);assert.match(report.interpretation,/do not show that inputs preceded exposure to measurements/);
});
test('a-priori protocol declarations are required and never admit fitted conditions',()=>{
 const make=()=>{
  const {data,predictions}=fixture();
  data.design={kind:'a-priori',protocol:{citation:'TEST-only protocol',sourceSha256:'b'.repeat(64)},inputEvidence:'TEST-only input sources'};
  return {data,predictions};
 };
 let {data,predictions}=make();
 assert.equal(validateExperiment(data,predictions).status,'blocked');
 assert.ok(validateExperiment(data,predictions).reasons.some(s=>s.includes('A-priori')));
 data.conditions=data.conditions.slice(1);predictions.conditions=predictions.conditions.slice(1);
 assert.ok(validateExperiment(data,predictions).reasons.some(s=>s.includes('fitted')));
 for(const mutate of [
  (d:ValidationCase)=>d.design!.protocol.citation='',
  (d:ValidationCase)=>d.design!.protocol.sourceSha256='old-source',
  (d:ValidationCase)=>d.design!.inputEvidence='',
 ]){
  ({data,predictions}=make());mutate(data);assert.throws(()=>validateExperiment(data,predictions));
 }
 assert.throws(()=>parseValidationCase({...make().data,design:{kind:'no-fit'}}),/a-priori/);
});
test('a-priori mode retains synthetic, convergence, identity, numerical and measurement gates',()=>{
 for(const mutate of [
  (d:ValidationCase,p:PredictionArtifact)=>d.source.kind='synthetic',
  (d:ValidationCase,p:PredictionArtifact)=>p.convergence.established=false,
  (d:ValidationCase,p:PredictionArtifact)=>p.model.sourceSha256='c'.repeat(64),
  (d:ValidationCase,p:PredictionArtifact)=>p.conditions[0].series[0].numericalErrorBound=[.3,.3],
  (d:ValidationCase,p:PredictionArtifact)=>d.conditions[0].measurements=[],
 ]){
  const {data,predictions}=fixture();
  data.design={kind:'a-priori',protocol:{citation:'TEST-only protocol',sourceSha256:'b'.repeat(64)},inputEvidence:'TEST-only independent inputs'};
  data.conditions=data.conditions.slice(1);predictions.conditions=predictions.conditions.slice(1);predictions.calibratedOn=[];
  mutate(data,predictions);assert.equal(validateExperiment(data,predictions).status,'blocked');
 }
});
test('legacy cases still require documented calibration and cannot silently opt into no-fit validation',()=>{
 const {data,predictions}=fixture();predictions.calibratedOn=[];
 const report=validateExperiment(data,predictions);
 assert.equal(report.status,'blocked');assert.ok(report.reasons.some(s=>s.includes('calibration condition')));
});
test('case, model version and source hash mismatches block stale predictions before displaying residuals',()=>{
 for(const mutate of [(p:PredictionArtifact)=>p.model.version='old',(p:PredictionArtifact)=>p.model.sourceSha256='b'.repeat(64),(p:PredictionArtifact)=>p.caseId='old-case']){
  const {data,predictions}=fixture();mutate(predictions);const r=validateExperiment(data,predictions);
  assert.equal(r.status,'blocked');assert.equal(r.residuals.length,0);
 }
});
test('held-out fitting, renamed duplicate physical conditions and absent holdout cannot create validation',()=>{
 let {data,predictions}=fixture();predictions.calibratedOn.push('holdout');assert.ok(validateExperiment(data,predictions).reasons.some(s=>s.includes('leakage')));
 ({data,predictions}=fixture());data.conditions[1].settings={...data.conditions[0].settings};predictions.conditions[1].settings={...data.conditions[0].settings};
 assert.ok(validateExperiment(data,predictions).reasons.some(s=>s.includes('physical settings are the same')));
 ({data,predictions}=fixture());data.conditions=data.conditions.slice(0,1);assert.equal(validateExperiment(data,predictions).status,'blocked');
 ({data,predictions}=fixture());data.conditions[0].measurements=[];assert.ok(validateExperiment(data,predictions).reasons.some(s=>s.includes('No matched calibration')));
});
test('missing predictions, wrong units/settings/coordinate and extrapolation remain blocked, never substituted',()=>{
 const mutations=[(p:PredictionArtifact)=>p.conditions.pop(),(p:PredictionArtifact)=>p.conditions[1].series[0].unit='cm^-3',
  (p:PredictionArtifact)=>p.conditions[1].settings.rotationRadS=999,(p:PredictionArtifact)=>p.conditions[1].series[0].coordinate!.unit='cm',
  (p:PredictionArtifact)=>p.conditions[1].series[0].coordinate!.values=[.6,1]];
 for(const mutate of mutations){const {data,predictions}=fixture();mutate(predictions);assert.equal(validateExperiment(data,predictions).status,'blocked');}
});
test('declared numerical budget and ambiguous threshold cannot become a successful comparison',()=>{
 let {data,predictions}=fixture();predictions.conditions[1].series[0].numericalErrorBound=[.3,.3];assert.equal(validateExperiment(data,predictions).status,'blocked');
 ({data,predictions}=fixture());data.conditions[1].measurements[0].value=20-3*Math.hypot(1,.2);
 assert.ok(validateExperiment(data,predictions).reasons.some(s=>s.includes('at or below, and above')));
 ({data,predictions}=fixture());data.conditions[1].measurements[0].value=40;assert.equal(validateExperiment(data,predictions).status,'inconsistent');
});
test('obsolete schemas and malformed/undefined physical quantities fail explicitly',()=>{
 const {data,predictions}=fixture();
 assert.throws(()=>parseValidationCase({...data,schemaVersion:0}),/schemaVersion/);
 assert.throws(()=>parsePredictionArtifact({...predictions,schemaVersion:0}),/schemaVersion/);
 data.conditions[0].measurements[0].standardUncertainty=0;assert.throws(()=>parseValidationCase(data),/positive/);
 predictions.conditions[1].series[0].coordinate!.values=[1,0];assert.throws(()=>parsePredictionArtifact(predictions),/increase without repeated values/);
 predictions.conditions[1].series[0].coordinate!.values=[0,1];predictions.conditions[0].series[0].numericalErrorBound=[];
 assert.throws(()=>parsePredictionArtifact(predictions),/must match/);
});
test('finite inputs that overflow comparison arithmetic cannot produce consistency or nonfinite report residuals',()=>{
 const {data,predictions}=fixture();data.conditions[0].measurements[0].value=-Number.MAX_VALUE;predictions.conditions[0].series[0].values=[Number.MAX_VALUE];
 const r=validateExperiment(data,predictions);assert.equal(r.status,'blocked');assert.ok(r.reasons.some(s=>s.includes('numeric range')));
 assert.equal(r.residuals.some(s=>!Number.isFinite(s.residual)),false);
});

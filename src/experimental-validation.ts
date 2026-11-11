/** Comparison infrastructure, not an assertion that supplied data are experimental. */
export interface ModelIdentity {name:string;version:string;sourceSha256:string}
export interface Coordinate {name:string;unit:string;value:number}
export interface Measurement {observable:string;unit:string;value:number;standardUncertainty:number;coordinate?:Coordinate}
export interface ValidationCase {
 schemaVersion:1;id:string;source:{kind:'measured'|'synthetic';citation:string};expectedModel:ModelIdentity;
 acceptance:{maxStandardizedResidual:number;maxNumericalErrorFraction:number};
 conditions:{id:string;split:'calibration'|'heldout';settings:Record<string,string|number>;measurements:Measurement[]}[];
}
export interface PredictionSeries {
 observable:string;unit:string;values:number[];predictiveStandardUncertainty:number[];numericalErrorBound:number[];
 coordinate?:{name:string;unit:string;values:number[]};
}
export interface PredictionArtifact {
 schemaVersion:1;caseId:string;model:ModelIdentity;convergence:{established:boolean;evidence:string};
 calibratedOn:string[];conditions:{id:string;settings:Record<string,string|number>;series:PredictionSeries[]}[];
}
export interface ValidationResidual {
 condition:string;split:'calibration'|'heldout';observable:string;unit:string;coordinate?:Coordinate;
 measured:number;predicted:number;residual:number;measurementUncertainty:number;predictiveUncertainty:number;
 numericalErrorBound:number;standardizedResidual:number;scoreLower:number;scoreUpper:number;
}
export interface ValidationReport {
 schemaVersion:1;caseId:string;status:'blocked'|'inconsistent'|'consistent';reasons:string[];
 residuals:ValidationResidual[];heldoutCount:number;calibrationCount:number;interpretation:string;
}
type ObjectValue=Record<string,unknown>;
const object=(value:unknown,label:string):ObjectValue=>{
 if(value===null||typeof value!=='object'||Array.isArray(value))throw new Error(`${label} must be an object.`);
 return value as ObjectValue;
};
const text=(v:unknown,label:string)=>{if(typeof v!=='string'||!v.trim())throw new Error(`${label} must be nonempty text.`);return v;};
const finite=(v:unknown,label:string)=>{if(typeof v!=='number'||!Number.isFinite(v))throw new Error(`${label} must be finite.`);return v;};
const positive=(v:unknown,label:string,zero=false)=>{const n=finite(v,label);if(zero?n<0:n<=0)throw new Error(`${label} must be ${zero?'nonnegative':'positive'}.`);return n;};
const array=(v:unknown,label:string)=>{if(!Array.isArray(v))throw new Error(`${label} must be an array.`);return v as unknown[];};
function identity(v:unknown):ModelIdentity{
 const m=object(v,'model');text(m.name,'model.name');text(m.version,'model.version');
 if(typeof m.sourceSha256!=='string'||!/^[a-f0-9]{64}$/.test(m.sourceSha256))throw new Error('model.sourceSha256 must be a lowercase SHA-256.');
 return m as unknown as ModelIdentity;
}
function settings(v:unknown){
 const s=object(v,'settings');
 if(!Object.keys(s).length)throw new Error('Physical settings cannot be empty.');
 for(const x of Object.values(s))if(typeof x!=='string'&&(typeof x!=='number'||!Number.isFinite(x)))throw new Error('settings values must be finite numbers or strings.');
 return s as Record<string,string|number>;
}
function unique(ids:string[],label:string){if(new Set(ids).size!==ids.length)throw new Error(`Duplicate ${label}.`);}
function coordinate(v:unknown){const c=object(v,'coordinate');text(c.name,'coordinate.name');text(c.unit,'coordinate.unit');return c;}

/** Reject obsolete/invalid schema rather than silently interpreting old units. */
export function parseValidationCase(v:unknown):ValidationCase{
 const d=object(v,'validation case');if(d.schemaVersion!==1)throw new Error('Unsupported validation-case schemaVersion; expected 1.');
 text(d.id,'id');identity(d.expectedModel);
 const source=object(d.source,'source');if(!['measured','synthetic'].includes(source.kind as string))throw new Error('source.kind must be measured or synthetic.');text(source.citation,'source.citation');
 const a=object(d.acceptance,'acceptance');positive(a.maxStandardizedResidual,'maxStandardizedResidual');positive(a.maxNumericalErrorFraction,'maxNumericalErrorFraction');
 const conditions=array(d.conditions,'conditions');if(!conditions.length)throw new Error('conditions cannot be empty.');
 const ids=conditions.map(v=>{
  const c=object(v,'condition'),id=text(c.id,'condition.id');settings(c.settings);
  if(!['calibration','heldout'].includes(c.split as string))throw new Error('condition.split must be calibration or heldout.');
  for(const v of array(c.measurements,'measurements')){
   const m=object(v,'measurement');text(m.observable,'observable');text(m.unit,'unit');finite(m.value,'measurement.value');positive(m.standardUncertainty,'measurement.standardUncertainty');
   if(m.coordinate!==undefined)finite(coordinate(m.coordinate).value,'coordinate.value');
  }
  return id;
 });unique(ids,'condition id');return d as unknown as ValidationCase;
}
export function parsePredictionArtifact(v:unknown):PredictionArtifact{
 const d=object(v,'prediction artifact');if(d.schemaVersion!==1)throw new Error('Unsupported prediction schemaVersion; expected 1.');
 text(d.caseId,'caseId');identity(d.model);
 const c=object(d.convergence,'convergence');if(typeof c.established!=='boolean')throw new Error('convergence.established must be boolean.');text(c.evidence,'convergence.evidence');
 const calibration=array(d.calibratedOn,'calibratedOn').map(v=>text(v,'calibratedOn id'));unique(calibration,'calibration id');
 const ids=array(d.conditions,'conditions').map(v=>{
  const c=object(v,'condition'),id=text(c.id,'condition.id');settings(c.settings);
  const keys=array(c.series,'series').map(v=>{
   const s=object(v,'series'),observable=text(s.observable,'observable');text(s.unit,'unit');
   const values=array(s.values,'values');if(!values.length)throw new Error('prediction values cannot be empty.');values.forEach(x=>finite(x,'prediction.value'));
   for(const name of ['predictiveStandardUncertainty','numericalErrorBound']){
    const a=array(s[name],name);if(a.length!==values.length)throw new Error(`${name} must match prediction values.`);a.forEach(x=>positive(x,name,true));
   }
   if(s.coordinate===undefined){if(values.length!==1)throw new Error('Scalar prediction requires one value.');}
   else{
    const x=array(coordinate(s.coordinate).values,'coordinate.values');
    if(x.length!==values.length)throw new Error('Coordinate and prediction arrays must match.');
    x.forEach((v,i)=>{finite(v,'coordinate value');if(i&&Number(v)<=Number(x[i-1]))throw new Error('Prediction coordinates must strictly increase.');});
   }
   return observable;
  });unique(keys,'condition observable');return id;
 });unique(ids,'prediction condition id');return d as unknown as PredictionArtifact;
}

function at(series:PredictionSeries,m:Measurement):{value:number;predictive:number;numerical:number}|null{
 let i=0,j=0,w=0;
 if(m.coordinate){
  const x=series.coordinate;if(!x||x.name!==m.coordinate.name||x.unit!==m.coordinate.unit)return null;
  const value=m.coordinate.value;if(value<x.values[0]||value>x.values.at(-1)!)return null;
  j=x.values.findIndex(v=>v>=value);i=Math.max(0,j-1);w=i===j?0:(value-x.values[i])/(x.values[j]-x.values[i]);
 }else if(series.coordinate)return null;
 const lerp=(a:number[])=>a[i]*(1-w)+a[j]*w;
 // Interpolating standard deviations linearly is conservative for arbitrary
 // correlation between neighboring prediction errors. Bounds interpolate only
 // if they also cover interpolation error, as required by the artifact contract.
 return {value:lerp(series.values),predictive:lerp(series.predictiveStandardUncertainty),numerical:lerp(series.numericalErrorBound)};
}
const sameSettings=(a:Record<string,string|number>,b:Record<string,string|number>)=>{
 const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(k=>Object.hasOwn(b,k)&&a[k]===b[k]);
};

/** Consistency scores are descriptive; no Gaussian coverage or p-value claimed. */
export function validateExperiment(caseInput:unknown,predictionInput:unknown):ValidationReport{
 const d=parseValidationCase(caseInput),p=parsePredictionArtifact(predictionInput),reasons:string[]=[],residuals:ValidationResidual[]=[];
 const add=(s:string)=>{if(!reasons.includes(s))reasons.push(s);};
 const report=(status:ValidationReport['status']):ValidationReport=>({schemaVersion:1,caseId:d.id,status,reasons,residuals,
  heldoutCount:residuals.filter(r=>r.split==='heldout').length,calibrationCount:residuals.filter(r=>r.split==='calibration').length,
  interpretation:'Consistency with supplied measurements only; provenance, model scope, uncertainty assumptions and independence require external review. No experimental validity follows from synthetic data or calibration fit.'});
 if(d.id!==p.caseId)add('Prediction case identity differs.');
 if(['name','version','sourceSha256'].some(k=>d.expectedModel[k as keyof ModelIdentity]!==p.model[k as keyof ModelIdentity]))add('Prediction model/version/source hash differs from expected model; regenerate or explicitly review the case.');
 if(reasons.length)return report('blocked');
 if(d.source.kind!=='measured')add('Synthetic source: comparison is not experimental evidence.');
 if(!p.convergence.established)add('Model numerical convergence is not established.');
 const calibration=d.conditions.filter(c=>c.split==='calibration').map(c=>c.id);
 if(!calibration.length||!p.calibratedOn.length)add('A documented calibration condition is required.');
 for(const id of p.calibratedOn)if(!calibration.includes(id))add(`Calibration leakage or unknown condition: ${id}.`);
 if(!d.conditions.some(c=>c.split==='heldout'&&c.measurements.length))add('A distinct held-out condition with measurements is required.');
 for(const a of d.conditions.filter(c=>c.split==='calibration'))for(const b of d.conditions.filter(c=>c.split==='heldout'))
  if(sameSettings(a.settings,b.settings))add(`Calibration and held-out physical settings coincide: ${a.id}/${b.id}.`);
 for(const c of d.conditions){
  const predicted=p.conditions.find(s=>s.id===c.id);
  if(!predicted){add(`Missing predictions for ${c.id}.`);continue;}
  if(!sameSettings(c.settings,predicted.settings)){add(`Physical settings differ for ${c.id}.`);continue;}
  for(const m of c.measurements){
   const s=predicted.series.find(s=>s.observable===m.observable);
   if(!s||s.unit!==m.unit){add(`Missing observable or mismatched units: ${c.id}/${m.observable}.`);continue;}
   const result=at(s,m);if(!result){add(`Missing/mismatched coordinate or forbidden extrapolation: ${c.id}/${m.observable}.`);continue;}
   const residual=result.value-m.value,sigma=Math.hypot(m.standardUncertainty,result.predictive),absolute=Math.abs(residual);
   const scoreLower=Math.max(0,absolute-result.numerical)/sigma,scoreUpper=(absolute+result.numerical)/sigma;
   if(![result.value,result.predictive,result.numerical,residual,sigma,scoreLower,scoreUpper].every(Number.isFinite)){
    add(`Unresolved numeric range in comparison: ${c.id}/${m.observable}.`);continue;
   }
   residuals.push({condition:c.id,split:c.split,observable:m.observable,unit:m.unit,coordinate:m.coordinate,
    measured:m.value,predicted:result.value,residual,measurementUncertainty:m.standardUncertainty,
    predictiveUncertainty:result.predictive,numericalErrorBound:result.numerical,
    standardizedResidual:residual/sigma,scoreLower,scoreUpper});
   if(result.numerical>d.acceptance.maxNumericalErrorFraction*m.standardUncertainty)add(`Numerical error budget exceeded: ${c.id}/${m.observable}.`);
  }
 }
 for(const id of p.calibratedOn)if(!residuals.some(r=>r.condition===id))add(`No matched calibration measurements for ${id}.`);
 if(!residuals.some(r=>r.split==='heldout'))add('No matched held-out measurements.');
 if(reasons.length)return report('blocked');
 const threshold=d.acceptance.maxStandardizedResidual;
 if(residuals.some(r=>r.scoreLower>threshold)){add('Measurement discrepancy exceeds the declared score threshold even after numerical bounds.');return report('inconsistent');}
 if(residuals.some(r=>r.scoreUpper>threshold)){add('Numerical bounds straddle the declared comparison threshold.');return report('blocked');}
 return report('consistent');
}

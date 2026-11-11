import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {rotorResponse,radialPDF} from '../../src/fuel-centrifuge.js';
import {fitRigid,rigidMetric,lambdaEnvelope,type Marker} from './metrics.js';

const inputBytes=readFileSync(process.argv[2]);
const data=JSON.parse(inputBytes.toString('utf8'));
const out=process.argv[3];mkdirSync(out,{recursive:true});
// All inertias, collision and wall torque coefficients scale with inventory.
// Rates are dimensionless reference choices; normalization removes their values.
// These are not estimated Ar coefficients or a hidden unsupported gas preset.
function reference(inventory:number,torque:number,timeS:number){
 const ii=.01*inventory,nn=.99*inventory;
 return rotorResponse(ii,nn,ii*100,nn*2,torque,timeS).neutral;
}
const points:Marker[]=data.profile.map((p:Omit<Marker,'split'>)=>({...p,split:p.rCm<=3?'train':'test'}));
const omega=fitRigid(points);
const pressureTimes=[.001,.01,.1,1,10,100].map(timeS=>({timeS,
 predictedTestRatio:reference(3,1,timeS)/reference(1,1,timeS)}));
const maxima=data.sweeps.temperature.map((p:{B:number;value:number})=>{
 const velocity=data.sweeps.velocity.find((q:{B:number})=>Math.abs(q.B-p.B)<1e-5);
 if(!velocity)throw new Error('Missing matched-B velocity marker.');
 return {B:p.B,velocityMS:velocity.value,temperatureK:p.value,
  ...lambdaEnvelope(39.948,velocity.value,p.value,.15),inputRelativeHalfWidth:.15,
  confidenceInterval:false,maximaAtSameLocation:false};
});
const training=maxima.reduce((a:typeof maxima[number],b:typeof maxima[number])=>Math.abs(a.B-.17)<Math.abs(b.B-.17)?a:b);
const magnetic=maxima.map((p:typeof training)=>{
 const predictedMS=training.velocityMS*reference(training.temperatureK/p.temperatureK,p.B/training.B,1)/reference(1,1,1);
 return {...p,split:Math.abs(p.B-training.B)<1e-5?'train':'test',predictedMS,
 relativeError:Math.abs(predictedMS-p.velocityMS)/p.velocityMS};
});
const checks=[];
for(const massU of [6.0151228874,39.948,131.293])for(const velocityMS of [0,100,1000]){
 const temperatureK=500,raFraction=.4,rbFraction=.9;
 const beta=massU*1.66053906892e-27*velocityMS**2/(2*1.380649e-23*temperatureK);
 checks.push({massU,velocityMS,temperatureK,raFraction,rbFraction,
 productionLogRatio:Math.log(radialPDF(beta,rbFraction**2)/radialPDF(beta,raFraction**2))});
}
const packet={schemaVersion:1,sourceSHA256:data.sourceSHA256,
 extractedDataSHA256:createHash('sha256').update(inputBytes).digest('hex'),
 matchedExperimentalValidation:false,prospectiveSignalErrorTarget:.2,
 pressureScaling:{backend:'analytic-reference',trainPressureTorr:3,testPressureTorr:9,trainMS:1,
  measuredTestRatio:2/3,predictedTestRatio:pressureTimes.at(-1)!.predictedTestRatio,
  temperatureRatio:1,constantDrag:true,pressureTimes,
  inventoryProxy:'Neutral inventory proportional to filling pressure / prescribed uniform temperature',
  measuredRatioConfidenceLevel:null,matchedExperimentalValidation:false},
 profile:{radiusM:.06,fitOmegaRadS:omega,metricDenominatorMS:Math.max(...points.map(p=>p.vMS)),
  heldoutRmsOverPeak:rigidMetric(points,omega),
  points:points.map(p=>({...p,predictedMS:omega*p.rCm*.01})),matchedExperimentalValidation:false,
  reproducibility:{relativeHalfWidth:.15,semantics:'common-scale-sensitivity-not-confidence'},
  operator:'Rigid tangential velocity projects to line-of-sight centroid Omega*x for arbitrary emissivity, assuming no additional chord-dependent line flow',
  sourcePrecision:'0.5 PDF point extraction range; original-to-reproduction digitization error unknown'},
 magneticScaling:{backend:'analytic-reference',trainingB:training.B,points:magnetic,
  matchedExperimentalValidation:false,inventoryProxy:'Filling pressure / measured diagnostic Tmax',
  warning:'Tmax is not a measured volume-mean gas temperature; rates and geometry held fixed'},
 mechanism:{checks,maximaUncertainty:maxima},
 unavailable:[
  {id:'marathon-forward-performance',reason:'No complete public device dataset with matched inputs and measured outputs found'},
  {id:'kaneko-he-ar-separation',reportedOuterToFeed:1.55,reason:'Mixture velocity/temperature, sampling/inventory map and uncertainty incomplete'},
  {id:'wijnakker-ar-xe-separation',reportedOddsRatio:2.15,radiiM:[.04,.06],reason:'Matched mixture velocity/temperature profiles unavailable; pure-Ar profiles cannot substitute'},
  {id:'compact-ar-negative-control',reason:'Annular apparatus and unreported transport coefficients not matched by full-cylinder live model'},
  {id:'thermal-transient',reason:'Measured boundary thermocouple temperatures cannot directly validate gas energy; sensor/contact model missing'}],
 sourceDiscrepancies:[{id:'fig11-first-lambda',textValue:.21,plottedValue:data.sweeps.lambda[0].value,
  reconstructedFromMaxima:maxima[0].lambda,action:'Retain discrepancy; use V/T markers, not prose value'},
  {id:'fig10-peak',textApproxMS:950,plottedPeakMS:Math.max(...points.map(p=>p.vMS)),action:'Do not overwrite marker extraction to match coarse prose'}]};
writeFileSync(`${out}/comparison.json`,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({profile:packet.profile.heldoutRmsOverPeak,pressure:packet.pressureScaling.predictedTestRatio,
 magnetic:magnetic.map((p:typeof training)=>({B:p.B,relativeError:p.relativeError})),maxima},null,2));

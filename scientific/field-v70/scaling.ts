import {fuelArgonNeutralTransport} from '../../src/fuel-neutral-transport.js';

export type FieldPoint={B:number;velocityMS:number;temperatureK:number;
 BHalfWidth:number;velocityHalfWidth:number;temperatureHalfWidth:number};
export type Candidate='fixed-rate-inventory'|'constant-viscosity'|'neutral-viscosity';
export const candidates:Candidate[]=['fixed-rate-inventory','constant-viscosity','neutral-viscosity'];
const fields=[.13,.17,.21,.255];
const positive=(x:number)=>Number.isFinite(x)&&x>0;

export function matchedPoints(data:any):FieldPoint[]{
 if(data.temperatureCalibrationTicks?.length!==3)throw new RangeError('Require corrected temperature extraction.');
 const temperatures=data.sweeps.temperature,velocities=data.sweeps.velocity;
 if(temperatures.length!==4)throw new RangeError('Require four frozen matched fields.');
 const points=fields.map(B=>{
  const t=temperatures.filter((p:any)=>Math.abs(p.B-B)<1e-5),v=velocities.filter((p:any)=>Math.abs(p.B-B)<1e-5);
  if(t.length!==1||v.length!==1)throw new RangeError('Require one temperature and velocity per frozen field.');
  return {B:v[0].B,velocityMS:v[0].value,temperatureK:t[0].value,BHalfWidth:v[0].BHalfWidth,
   velocityHalfWidth:v[0].valueHalfWidth,temperatureHalfWidth:t[0].valueHalfWidth};
 });
 validate(points);return points;
}
function validate(points:readonly FieldPoint[]){
 if(points.length!==4||points.some((p,i)=>Math.abs(p.B-fields[i])>=1e-5||
  !Object.values(p).every(positive)))throw new RangeError('Need ordered positive frozen field markers and extraction widths.');
}

/** Steady scaling only: a central optical temperature is a proxy, not μ(r). */
export function score(candidate:Candidate,points:readonly FieldPoint[],temperatureScale=1){
 if(!candidates.includes(candidate)||!positive(temperatureScale)||points.length!==4||
  points.some(p=>!positive(p.B)||!positive(p.velocityMS)||!positive(p.temperatureK)))throw new RangeError('Invalid field scaling inputs.');
 const viscosities=points.map(p=>candidate==='neutral-viscosity'?
  fuelArgonNeutralTransport(p.temperatureK*temperatureScale).viscosityPaS:null);
 const training=points[1];
 const rows=points.map((p,i)=>{
  const factor=candidate==='fixed-rate-inventory'?p.temperatureK/training.temperatureK:
   candidate==='neutral-viscosity'?viscosities[1]!/viscosities[i]!:1;
  const predictedMS=training.velocityMS*p.B/training.B*factor;
  return {...p,proxyTemperatureK:p.temperatureK*temperatureScale,viscosityPaS:viscosities[i],
   split:i===1?'train':'test',predictedMS,relativeError:Math.abs(predictedMS-p.velocityMS)/p.velocityMS};
 });
 const heldout=rows.filter(p=>p.split==='test');
 const maximumHeldoutRelativeError=Math.max(...heldout.map(p=>p.relativeError));
 const increasingTrend=rows.every((p,i)=>i===0||p.predictedMS>rows[i-1].predictedMS);
 return {points:rows,maximumHeldoutRelativeError,increasingTrend,
  conditionedScreenPassed:maximumHeldoutRelativeError<=.2&&increasingTrend};
}

export function cornerSensitivity(candidate:Candidate,points:readonly FieldPoint[],temperatureScale:number,kind:'extraction'|'independent-reproducibility'){
 const dimensions=kind==='extraction'?12:8,count=2**dimensions;
 let minimum=Infinity,maximum=-Infinity,available=0,unavailable=0;
 for(let mask=0;mask<count;mask++){
  let dimension=0;const sign=()=>((mask>>dimension++)&1)?1:-1;
  const varied=points.map(p=>({...p,
   B:p.B+(kind==='extraction'?sign()*p.BHalfWidth:0),
   velocityMS:p.velocityMS+sign()*(kind==='extraction'?p.velocityHalfWidth:.15*p.velocityMS),
   temperatureK:p.temperatureK+sign()*(kind==='extraction'?p.temperatureHalfWidth:.15*p.temperatureK)}));
  // The property table's domain is real; unavailable corners remain failures
  // of admission, not substituted/extrapolated material data.
  if(candidate==='neutral-viscosity'&&varied.some(p=>p.temperatureK*temperatureScale<300||p.temperatureK*temperatureScale>20000)){
   unavailable++;continue;
  }
  const result=score(candidate,varied,temperatureScale);available++;
  minimum=Math.min(minimum,result.maximumHeldoutRelativeError);maximum=Math.max(maximum,result.maximumHeldoutRelativeError);
 }
 return {kind,cornerCount:count,availableCorners:available,outsidePropertyDomain:unavailable,
  maximumErrorRange:available?[minimum,maximum]:null,
  allAvailableCornersWithin20Percent:available>0&&maximum<=.2,
  allCornersWithin20Percent:unavailable===0&&available===count&&maximum<=.2,
  confidenceInterval:false,continuousExtremaBound:false};
}

/** Source accuracy="5" is not a statistical distribution. This is a separate
 * independent Q22-coordinate sensitivity; common multiplicative error cancels.
 */
export function transportSensitivity(points:readonly FieldPoint[],temperatureScale:number){
 const baseline=score('neutral-viscosity',points,temperatureScale);
 const errors=Array.from({length:16},(_,mask)=>{
  const q=points.map((_,i)=>((mask>>i)&1)?1.05:.95);
  return Math.max(...baseline.points.filter(p=>p.split==='test').map(p=>{
   const i=baseline.points.indexOf(p),predicted=p.predictedMS*q[i]/q[1];
   return Math.abs(predicted-p.velocityMS)/p.velocityMS;
  }));
 });
 return {sourceAccuracyAnnotation:5,cornerCount:16,maximumErrorRange:[Math.min(...errors),Math.max(...errors)],
  allCornersWithin20Percent:Math.max(...errors)<=.2,confidenceInterval:false,
  interpretation:'Independent ±5% collision-integral coordinates; source correlation and confidence semantics unspecified'};
}

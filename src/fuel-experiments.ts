import {simulateFuelCentrifuge,type FuelConfig} from './fuel-centrifuge.js';
import type {FuelTransportResult} from './fuel-transport.js';
import {producingCode,type ProducingCodeIdentity} from './producing-code.js';

type FuelResult=ReturnType<typeof simulateFuelCentrifuge>&{transport?:FuelTransportResult};
type Accepted={result:FuelResult;producingCode?:ProducingCodeIdentity|null};
type Layer='composition'|'density'|'speed';
type Domain=[number,number];
type Camera={position:number[];target:number[];up?:number[]};
const K=1.380649e-23;
const geometryKeys=['radiusM','lengthM','application','pair','stages','cutFraction','driveInnerFraction'] as const;
function freeze<T>(value:T):T{
 if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}
 return value;
}
function acceptedResult(accepted:Accepted):FuelResult{
 const r=accepted?.result;
 if(!r||r.schemaVersion!==1||!r.config||!r.samples?.length||!r.profiles?.length)
  throw new RangeError('Pin an accepted centrifuge result.');
 return r;
}

/** Capture result-owned configuration, never the in-flight slider configuration.
 * Identity stays null for old/unbundled results; snapshot ownership is immutable. */
export function pinFuelExperiment(accepted:Accepted,{camera,timeS=0,mode='equilibrium'}:{camera?:Camera;timeS?:number;mode?:string}={}){
 const result=acceptedResult(accepted);
 if(!Number.isFinite(timeS)||timeS<0||timeS>result.config.durationS)throw new RangeError('Pinned time must lie within the computed spin interval.');
 if(camera&&[camera.position,camera.target,...(camera.up?[camera.up]:[])].some(v=>v.length!==3||!v.every(Number.isFinite)))
  throw new RangeError('Camera coordinates must be finite SI vectors.');
 return freeze(structuredClone({schemaVersion:1 as const,result,config:result.config,
  producingCode:producingCode(accepted.producingCode),camera:camera??null,timeS,mode}));
}

/** Physical color values, shared by both cases: no separately fitted color ranges. */
export function comparisonDomain(results:FuelResult[],layer:Layer):Domain{
 if(layer==='composition')return [0,1];
 let max=0;
 for(const r of results){
  const accepted=r.transport?.checkpoints??r.transport?.snapshots??[];
  if(layer==='speed'){
   for(const p of r.samples)max=Math.max(max,p.neutralMS);
   for(const p of accepted)max=Math.max(max,Math.abs(p.neutralRadS)*r.config.radiusM);
  }
  else if(layer==='density'){
   const n=r.config.pressurePa/(K*r.config.gasK),x=r.config.lightFraction;
   for(const p of r.profiles)max=Math.max(max,n*(x*p.lightDensityRatio+(1-x)*p.heavyDensityRatio));
   for(const s of accepted)for(let i=0;i<s.lightMass.length;i++)max=Math.max(max,n*s.lightMass.length*(x*s.lightMass[i]+(1-x)*s.heavyMass[i]));
  }else throw new RangeError('Unsupported physical color layer.');
 }
 return [0,max]; // [0,0] is the physically constant no-motion domain, not invented speed.
}

export function comparisonFrame(pinned:ReturnType<typeof pinFuelExperiment>,current:Accepted,timeS:number){
 const a=pinned.result,b=acceptedResult(current),timeLimitS=Math.min(a.config.durationS,b.config.durationS);
 if(!Number.isFinite(timeS)||timeS<0)throw new RangeError('Comparison time must be finite and nonnegative.');
 const changedGeometry=geometryKeys.filter(key=>a.config[key]!==b.config[key]);
 return {timeS:Math.min(timeS,timeLimitS),timeLimitS,camera:pinned.camera,lengthUnit:'m' as const,
  geometryBounds:{radiusM:Math.max(a.config.radiusM,b.config.radiusM),lengthM:Math.max(a.config.lengthM,b.config.lengthM)},
  sameGeometry:changedGeometry.length===0,changedGeometry,
  sameProducingCode:pinned.producingCode!==null&&pinned.producingCode.sourceHash===producingCode(current.producingCode)?.sourceHash,
  domains:{composition:comparisonDomain([a,b],'composition'),density:comparisonDomain([a,b],'density'),speed:comparisonDomain([a,b],'speed')}};
}

export const FUEL_MAP_AXES={
 magneticT:{label:'Magnetic field',unit:'T',domain:[.05,2],scale:'linear'},
 currentA:{label:'Discharge current',unit:'A',domain:[0,.2],scale:'linear'},
 gasK:{label:'Gas temperature',unit:'K',domain:[300,2000],scale:'linear'},
 pressurePa:{label:'Neutral pressure',unit:'Pa',domain:[1,100],scale:'log'},
} as const;
export const FUEL_MAP_METRICS={
 purity:{label:'Inner inventory purity',unit:'fraction',scope:'Equilibrium inventory cut; not flowing product purity.'},
 recovery:{label:'Inner inventory recovery',unit:'fraction',scope:'Equilibrium inventory cut; not flowing product recovery.'},
 power:{label:'Input power',unit:'W',scope:'Instantaneous mechanical plus Ohmic power at the selected duration.'},
 throughput:{label:'Outer gas load',unit:'Pa·m³/s',scope:'Conditional one-outlet pressure-flow model; no flow back-reaction.'},
} as const;
type Axis=keyof typeof FUEL_MAP_AXES;
type Metric=keyof typeof FUEL_MAP_METRICS;
type MapOptions={xKey?:Axis;yKey?:Axis;metric?:Metric;size?:number;xDomain?:Domain;yDomain?:Domain};
type Diagnostic='civ-reference-exceeded'|'radial-relaxation-unresolved'|'residence-shorter-than-radial-time';
function diagnostics(r:FuelResult):Diagnostic[]{
 const list:Diagnostic[]=[];
 if(r.mechanics.slipCIV>1)list.push('civ-reference-exceeded');
 if(r.config.durationS<r.mechanics.radialDiffusionTimeS)list.push('radial-relaxation-unresolved');
 if(r.pumping.turnoverS!==null&&r.pumping.turnoverS<r.mechanics.radialDiffusionTimeS)list.push('residence-shorter-than-radial-time');
 return list;
}
function metricValue(r:FuelResult,key:Metric){
 return key==='purity'?r.collection.innerLightPurity:key==='recovery'?r.collection.lightRecovery:
  key==='power'?r.samples.at(-1)!.totalInputW:r.pumping.gasLoadPaM3S;
}
function axis(key:Axis,domain:Domain|undefined,size:number){
 if(!Object.hasOwn(FUEL_MAP_AXES,key))throw new RangeError('Unsupported operating-map axis.');
 const definition=FUEL_MAP_AXES[key],[lo,hi]=domain??definition.domain;
 if(!Number.isFinite(lo)||!Number.isFinite(hi)||lo>=hi||(definition.scale==='log'&&lo<=0))
  throw new RangeError('Operating-map axes require finite increasing bounds (positive for log axes).');
 const values=Array.from({length:size},(_,i)=>definition.scale==='log'?Math.exp(Math.log(lo)+Math.log(hi/lo)*i/(size-1)):lo+(hi-lo)*i/(size-1));
 values[0]=lo;values[size-1]=hi;
 return {key,...definition,domain:[lo,hi] as Domain,values};
}

/** Bounded, worker-friendly parameter study of the existing conditional model.
 * CIV and mixing-time diagnostics do not define validated instability boundaries.
 * No cache: every cell owns a configuration; worker cancellation owns batch lifetime. */
export function computeFuelOperatingMap(config:FuelConfig,options:MapOptions={},simulate=simulateFuelCentrifuge){
 const {xKey='magneticT',yKey='currentA',metric='purity',size=9}=options;
 if(!Number.isSafeInteger(size)||size<2||size>15)throw new RangeError('Operating-map size must be an integer from 2 to 15.');
 if(xKey===yKey)throw new RangeError('Operating-map axes must differ.');
 if(!Object.hasOwn(FUEL_MAP_METRICS,metric))throw new RangeError('Unsupported operating-map metric.');
 const x=axis(xKey,options.xDomain,size),y=axis(yKey,options.yDomain,size);
 const points:{ix:number;iy:number;x:number;y:number;config:FuelConfig;status:'valid'|'invalid';value:number|null;diagnostics:Diagnostic[];error:string|null}[]=[];
 for(let iy=0;iy<size;iy++)for(let ix=0;ix<size;ix++){
  const c={...config,[xKey]:x.values[ix],[yKey]:y.values[iy]};
  try{
   const r=simulate(c),value=metricValue(r,metric);
   if(value!==null&&!Number.isFinite(value))throw new Error('Operating-map metric is nonfinite.');
   points.push({ix,iy,x:x.values[ix],y:y.values[iy],config:{...r.config},status:'valid',value,diagnostics:diagnostics(r),error:null});
  }catch(error){
   if(!(error instanceof RangeError))throw error;
   points.push({ix,iy,x:x.values[ix],y:y.values[iy],config:c,status:'invalid',value:null,diagnostics:[],error:error.message});
  }
 }
 const values=points.flatMap(p=>p.status==='valid'&&p.value!==null?[p.value]:[]);
 const domain:Domain=metric==='purity'||metric==='recovery'?[0,1]:[0,Math.max(0,...values)];
 return {schemaVersion:1 as const,config:{...config},x,y,size,metric,...FUEL_MAP_METRICS[metric],domain,points,
  interpretation:'Uniform-inertia equilibrium reference; not the coupled transient. Diagnostic warnings are not validated physical failure thresholds.'};
}

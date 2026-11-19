import {radialPDF,radialCDF} from './fuel-centrifuge.js';
import {sampleFuelField, type FuelFieldResult, type FuelFieldState} from './fuel-field.js';
import type {PlotCurve} from './laboratory.js';
export type FuelLearningKind = 'temperature' | 'rotation' | 'collection';

/** Shared 3D sampler, preserving the finite-volume jumps rather than smoothing percentages. */
function profileSamples(result: FuelFieldResult, state: FuelFieldState){
 const R=result.config.radiusM,n=state.lightMass?.length;
 return n?Array.from({length:n},(_,i)=>{
  const lo=R*Math.sqrt(i/n),hi=R*Math.sqrt((i+1)/n),sample=sampleFuelField(result,(lo+hi)/2,state);
  return [{...sample,radiusM:lo},{...sample,radiusM:hi}];
 }).flat():result.profiles.map(p=>sampleFuelField(result,p.radiusM,state));
}
export function fuelCompositionCurves(result: FuelFieldResult, state: FuelFieldState = {}): PlotCurve[] {
 const R=result.config.radiusM,samples=profileSamples(result,state);
 const curves: PlotCurve[]=[result.pair.light,result.pair.heavy].map((label,i)=>({label,x:samples.map(s=>s.radiusM*100),
  y:samples.map(s=>s.lightFraction===null?null:100*(i?1-s.lightFraction:s.lightFraction)),
  xLabel:'Radius (cm)',yLabel:'Local composition (%)',yDomain:[0,100],color:i?'#d2956b':'#a4c4b1'}));
 curves.push({label:`${result.pair.light} feed`,x:[0,100*R],y:[100*result.config.lightFraction,100*result.config.lightFraction],
  xLabel:'Radius (cm)',yLabel:'Local composition (%)',yDomain:[0,100],dash:'4 4'});
 return curves;
}

/** One shared zoom for current/pinned curves; percentages and cell discontinuities stay unchanged. */
export function zoomCompositionCurves(curves:readonly PlotCurve[]):PlotCurve[]{
 const values=curves.flatMap(c=>c.y).filter((y):y is number=>typeof y==='number'&&Number.isFinite(y));
 if(!values.length)return [...curves];
 const lo=Math.min(...values),hi=Math.max(...values),pad=Math.max(.05,(hi-lo)*.08);
 const domain:[number,number]=[Math.max(0,lo-pad),Math.min(100,hi+pad)];
 return curves.map(c=>({...c,yDomain:domain,yLabel:'Local composition (%) · light isotope · zoomed'}));
}

/** Each species is compared with its own volume mean, not with the other species' abundance. */
export function fuelDensityCurves(result:FuelFieldResult,state:FuelFieldState={}):PlotCurve[]{
 const samples=profileSamples(result,state),c=result.config,mean=c.pressurePa/(1.380649e-23*c.gasK);
 return [result.pair.light,result.pair.heavy].map((label,i)=>({label,x:samples.map(s=>100*s.radiusM),
  y:samples.map(s=>{const fraction=i?1-c.lightFraction:c.lightFraction;return fraction>0?(i?s.heavyDensityM3:s.lightDensityM3)/(mean*fraction):null;}),
  xLabel:'Radius (cm)',yLabel:'Density / species volume mean'}));
}

/** Conditional isothermal equilibrium comparisons; never change or rerun the accepted drive. */
export function fuelLearningComparison(result: FuelFieldResult, state: FuelFieldState, kind: FuelLearningKind){
 if(!['temperature','rotation','collection'].includes(kind))throw new RangeError('Unsupported equilibrium comparison.');
 const c=result.config,R=c.radiusM,x=c.lightFraction,omega=state.neutralRadS??result.samples.at(-1)!.neutralRadS;
 const temperature=state.thermal?.gasK??c.gasK;
 const variants=kind==='temperature'?[[omega,temperature],[omega,temperature*2]]:
  kind==='rotation'?[[omega,temperature],[omega*2,temperature]]:[[omega,temperature]];
 const cases=variants.map(([omega,temperatureK])=>{
  const beta=result.pair.masses.map(m=>m*1.66053906892e-27*(omega*R)**2/(2*1.380649e-23*temperatureK));
  const profiles=Array.from({length:81},(_,i)=>{
   const radiusM=R*i/80,y=(i/80)**2,light=radialPDF(beta[0],y),heavy=radialPDF(beta[1],y),total=x*light+(1-x)*heavy;
   return {radiusM,lightFraction:total>0?x*light/total:null};
  });
  const cuts=kind==='collection'?[c.cutFraction,c.cutFraction>.5?c.cutFraction/2:(1+c.cutFraction)/2]:[c.cutFraction];
  return {omega,temperatureK,profiles,collections:cuts.map(cutFraction=>{
   const light=radialCDF(beta[0],cutFraction**2),heavy=radialCDF(beta[1],cutFraction**2),total=x*light+(1-x)*heavy;
   return {cutFraction,purity:total>0?x*light/total:null,recovery:x>0?light:null};
  })};
 });
 const fmt=(n: number)=>Number(n.toPrecision(4));
 const curves: PlotCurve[]=kind==='collection'?(['purity','recovery'] as const).map(key=>({label:key==='purity'?`${result.pair.light} purity`:`${result.pair.light} recovery`,
  x:cases[0].collections.map(v=>100*R*v.cutFraction),y:cases[0].collections.map(v=>v[key]===null?null:100*v[key]),
  xLabel:'Collection radius (cm)',yLabel:'Inventory (%)',yDomain:[0,100]})):
  cases.map(v=>({label:kind==='temperature'?`${fmt(v.temperatureK)} K`:`${fmt(v.omega)} rad/s`,
   x:v.profiles.map(p=>p.radiusM*100),y:v.profiles.map(p=>p.lightFraction===null?null:100*p.lightFraction),
   xLabel:'Radius (cm)',yLabel:`${result.pair.light} composition (%) · zoomed axis`}));
 if(kind!=='collection'){
  const values=[100*x,...curves.flatMap(curve=>curve.y).filter((v): v is number => typeof v==='number'&&Number.isFinite(v))],lo=Math.min(...values),hi=Math.max(...values);
  const padding=Math.max(.05,(hi-lo)*.08),domain: [number, number]=[Math.max(0,lo-padding),Math.min(100,hi+padding)];
  for(const curve of curves)curve.yDomain=domain;
 }
 return {cases,curves,scope:`Isothermal equilibrium references · ${kind==='temperature'?`rotation fixed at ${fmt(omega)} rad/s`:kind==='rotation'?`temperature held at ${fmt(temperature)} K`:`same gas state · ${fmt(omega)} rad/s · ${fmt(temperature)} K`}.
 Closed inventory. These references do not predict drive, heating or extraction.${kind==='collection'?'':` Expanded light-fraction axis; feed ${fmt(100*x)}%. Read differences in percentage points.`}${state.thermal?.gas?' These references use the mean gas temperature instead of spatial temperature differences.':''}${omega===0?' At zero rotation, there is no centrifugal separation.':''}`};
}

import type {simulateFuelCentrifuge} from './fuel-centrifuge.js';
import type {FuelTransportResult, FuelTransportSnapshot} from './fuel-transport.js';

export type FuelRenderResult = ReturnType<typeof simulateFuelCentrifuge> & {transport?: FuelTransportResult};
export type FuelFieldResult = FuelRenderResult;
export type FuelFieldState = Partial<Pick<FuelTransportSnapshot, 'profiles' | 'timeS' | 'neutralRadS' | 'lightMass' | 'heavyMass' | 'thermal'>> & {scope?: string};
type FuelProfile = FuelRenderResult['profiles'][number];

const K=1.380649e-23;
const EQUILIBRIUM='Radial equilibrium reference';
const TRANSIENT='Coupled rotor and radial transport · reflecting wall';
function bounded(value: number,min: number,max: number,name: string){
 if(!Number.isFinite(value)||value<min||value>max)throw new RangeError(`${name} must lie in [${min}, ${max}].`);
 return value;
}
// A geometric cell edge can move by a few ulps during metre/centimetre conversion.
// Keep the displayed finite-volume reconstruction right-continuous at that edge.
function cellAt(radiusM: number,R: number,n: number){const q=(radiusM/R)**2*n,edge=Math.round(q);return Math.min(n-1,Math.floor(Math.abs(q-edge)<=8*n*Number.EPSILON?edge:q));}
export function validateProfiles(profiles: readonly FuelProfile[],R: number){
 if(!Array.isArray(profiles)||profiles.length<2||profiles[0].radiusM!==0||Math.abs(profiles.at(-1)!.radiusM-R)>R*1e-10||profiles.some((p,i)=>!Number.isFinite(p.radiusM)||p.radiusM<0||p.radiusM>R||i>0&&p.radiusM<=profiles[i-1].radiusM||!Number.isFinite(p.lightDensityRatio)||p.lightDensityRatio<0||!Number.isFinite(p.heavyDensityRatio)||p.heavyDensityRatio<0))throw new RangeError('A nonnegative radial density profile spanning the gas radius is required.');
}

/** Preserve transport's cellwise volume density; interpolate equilibrium reference samples only. */
export function sampleFuelField(result: FuelRenderResult,radiusM: number,state: FuelFieldState={}){
 const c=result.config,R=c.radiusM,profiles=state.profiles??result.profiles;
 bounded(radiusM,0,R,'Sample radius');
 if(state.timeS!==undefined)bounded(state.timeS,0,Number.MAX_VALUE,'Physical time');
 validateProfiles(profiles,R);
 const right=Math.max(1,profiles.findIndex(p=>p.radiusM>=radiusM)),a=profiles[right-1],b=profiles[right],t=(radiusM-a.radiusM)/(b.radiusM-a.radiusM);
 let light=a.lightDensityRatio+(b.lightDensityRatio-a.lightDensityRatio)*t,heavy=a.heavyDensityRatio+(b.heavyDensityRatio-a.heavyDensityRatio)*t;
 if(state.lightMass!==undefined||state.heavyMass!==undefined){
  const l=state.lightMass,h=state.heavyMass;
  if(!Array.isArray(l)||!Array.isArray(h)||l.length<2||l.length!==h.length||[...l,...h].some(v=>!Number.isFinite(v)||v<0))throw new RangeError('Matching nonnegative finite-volume species masses required.');
  const cell=cellAt(radiusM,R,l.length);light=l[cell]*l.length;heavy=h[cell]*h.length;
 }
 const total=c.lightFraction*light+(1-c.lightFraction)*heavy,omega=state.neutralRadS??result.samples.at(-1)!.neutralRadS;
 if(!Number.isFinite(omega)||!Number.isFinite(total)||total<0)throw new RangeError('Finite bulk rotation and density are required.');
 const number=c.pressurePa/(K*c.gasK);
 const gas=state.thermal?.gas,cell=state.lightMass?cellAt(radiusM,R,state.lightMass.length):0;
 if(gas&&(!state.lightMass||!Array.isArray(gas.temperatureK)||!Array.isArray(gas.pressurePa)||gas.temperatureK.length!==state.lightMass.length||gas.pressurePa.length!==state.lightMass.length||gas.temperatureK.some(v=>!Number.isFinite(v)||v<=0)||gas.pressurePa.some(v=>!Number.isFinite(v)||v<0)))throw new RangeError('Spatial gas diagnostics need positive cell temperatures and nonnegative pressure on the species grid.');
 const temperatureK=gas?gas.temperatureK[cell]:state.thermal?.gasK??c.gasK,pressurePa=gas?gas.pressurePa[cell]:number*total*K*temperatureK;
 return {radiusM,lightFraction:total>0?c.lightFraction*light/total:null,densityM3:number*total,lightDensityM3:number*c.lightFraction*light,heavyDensityM3:number*(1-c.lightFraction)*heavy,speedMS:Math.abs(omega)*radiusM,temperatureK,pressurePa,timeS:state.timeS??result.samples.at(-1)!.timeS,scope:state.scope??(state.lightMass?TRANSIENT:EQUILIBRIUM),reconstruction:state.lightMass?'Cellwise constant volume density':'Interpolated radial reference samples'};
}

export type FuelFieldSample = ReturnType<typeof sampleFuelField>;

import type {FuelRenderResult} from './fuel-field.js';
import type {FuelTransportCheckpoint} from './fuel-transport.js';

export type FuelFailureLimits={pressurePa:number;externalPa:number;linerK:number};
export const DEFAULT_FUEL_FAILURE:FuelFailureLimits={pressurePa:1000,externalPa:0,linerK:1800};
export type FuelFailure={timeS:number;pressurePa:number;linerK:number|null;causes:('pressure'|'temperature')[];limits:FuelFailureLimits};
export function validateFuelFailureLimits(limits:FuelFailureLimits){
 if(!Number.isFinite(limits.pressurePa)||limits.pressurePa<=0||!Number.isFinite(limits.externalPa)||limits.externalPa<0||!Number.isFinite(limits.linerK)||limits.linerK<300||limits.linerK>1900)
  throw new RangeError('Set a positive pressure limit, nonnegative external pressure and a liner limit from 300 to 1900 K.');
}
/** Load-limit illustration only. A cell-average pressure is not a resolved wall traction or a burst-pressure prediction. */
export function fuelFailureLoad(result:FuelRenderResult,state:FuelTransportCheckpoint){
 const c=result.config,n=state.lightMass.length,last=n-1;
 const densityRatio=n*(c.lightFraction*state.lightMass[last]+(1-c.lightFraction)*state.heavyMass[last]);
 const pressurePa=state.thermal?.gas?.pressurePa[last]??c.pressurePa*densityRatio*(state.thermal?.gasK??c.gasK)/c.gasK;
 const linerK=state.thermal?.spatial?.maxK??state.thermal?.linerK??(c.pair==='lithium'?c.linerK:null);
 if(!Number.isFinite(pressurePa)||pressurePa<0||linerK!==null&&(!Number.isFinite(linerK)||linerK<=0))throw new RangeError('Failure assessment requires finite accepted pressure and temperature.');
 return {pressurePa,linerK};
}
/** Report the first retained state above a specified limit, without claiming an exact fracture time. */
export function firstFuelFailure(result:FuelRenderResult,limits:FuelFailureLimits):FuelFailure|null{
 validateFuelFailureLimits(limits);
 for(const state of result.transport?.checkpoints??result.transport?.snapshots??[]){
  const load=fuelFailureLoad(result,state),causes:FuelFailure['causes']=[];
  if(load.pressurePa-limits.externalPa>limits.pressurePa)causes.push('pressure');
  if(load.linerK!==null&&load.linerK>limits.linerK)causes.push('temperature');
  if(causes.length)return {timeS:state.timeS,...load,causes,limits:{...limits}};
 }
 return null;
}

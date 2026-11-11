/** Local BE step-doubling estimator; not a spatial or global error certificate. */
import type {FuelTransportSnapshot} from './fuel-transport.js';

export type FuelTemporalAccuracy={relativeTolerance:number;temperatureToleranceK:number};

export function fuelTemporalError(coarse:FuelTransportSnapshot,fine:FuelTransportSnapshot,
 accuracy:FuelTemporalAccuracy,initialGasK:number,initialWallK:number,initialGasEnergyJ:number){
 const {relativeTolerance:rtol,temperatureToleranceK:atol}=accuracy;
 let error=0;
 const compare=(a:number,b:number,floor:number)=>{
  error=Math.max(error,Math.abs(a-b)/(rtol*Math.max(floor,Math.abs(a),Math.abs(b))));
 };
 for(const key of ['ionRadS','neutralRadS','ionPhaseRad','neutralPhaseRad'] as const)compare(coarse[key],fine[key],1);
 for(const key of ['lightCDF','heavyCDF'] as const)for(let i=0;i<fine[key].length;i++)
  error=Math.max(error,Math.abs(coarse[key][i]-fine[key][i])/(1e-7+rtol*Math.max(Math.abs(coarse[key][i]),Math.abs(fine[key][i]))));
 for(const [a,b,initial] of [[coarse.thermal!.gas!.temperatureK,fine.thermal!.gas!.temperatureK,initialGasK],
  [coarse.thermal!.spatial!.temperatureK,fine.thermal!.spatial!.temperatureK,initialWallK]] as const)
  for(let i=0;i<b.length;i++)error=Math.max(error,Math.abs(a[i]-b[i])/(atol+rtol*Math.max(.1,Math.abs(a[i]-initial),Math.abs(b[i]-initial))));
 for(const key of ['driveWorkJ','slipDissipationJ','dragDissipationJ','redistributionWorkJ','numericalDissipationJ'] as const)
  compare(coarse.energy[key],fine.energy[key],initialGasEnergyJ);
 for(const key of ['ohmicEnergyJ','coolingEnergyJ'] as const)compare(coarse.thermal![key],fine.thermal![key],initialGasEnergyJ);
 if(!Number.isFinite(error))throw new RangeError('Temporal accuracy estimate is not finite.');
 return error;
}

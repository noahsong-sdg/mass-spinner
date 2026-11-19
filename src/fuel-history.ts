import {sampleFuelTransport,type FuelTransportCheckpoint,type FuelTransportResult} from './fuel-transport.js';
import type {PlotCurve} from './laboratory.js';

/** Plot the accepted knots, reconstructing the moving endpoint with the scene's sampler. */
export function fuelHistoryCurve(
 transport:FuelTransportResult,rows:readonly FuelTransportCheckpoint[],label:string,yLabel:string,
 ordinate:(sample:FuelTransportCheckpoint)=>number|null,
):PlotCurve{
 return {label,x:rows.map(row=>row.timeS),y:rows.map(ordinate),xLabel:'Time (s)',yLabel,
  sampleAt:time=>ordinate(sampleFuelTransport(transport,time))};
}

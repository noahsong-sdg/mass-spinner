import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge,radialCDF} from '../src/fuel-centrifuge.js';
import {simulateFuelTransport,sampleFuelTransport} from '../src/fuel-transport.js';
import type {ViewData} from '../src/guide-views.js';

/** Use the existing constant-temperature solver for this fixed teaching example. */
export function viewExampleData():ViewData{
 const rotor=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA:.06});
 const model=simulateFuelTransport(rotor),radius=rotor.config.radiusM,end=rotor.samples.at(-1)!;
 const frames=Array.from({length:33},(_,i)=>{
  const state=sampleFuelTransport(model,i/32);
  return {time:state.timeS,ion:state.ionRadS*radius,gas:state.neutralRadS*radius,
   ionPhase:state.ionPhaseRad,gasPhase:state.neutralPhaseRad,cdf:[state.lightCDF,state.heavyCDF]};
 });
 const beta=rotor.pair.masses.map(m=>m*1.66053906892e-27*end.neutralMS**2/(2*1.380649e-23*rotor.config.gasK));
 return {frames,reference:{time:1,ion:end.ionMS,gas:end.neutralMS,ionPhase:0,gasPhase:0,
  cdf:beta.map(b=>Array.from({length:model.cells+1},(_,i)=>radialCDF(b,i/model.cells)))},
  turnoverHz:1/rotor.pumping.turnoverS!};
}

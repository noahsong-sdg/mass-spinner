import {E_CHARGE} from './physics.js';
import type {simulateFusionBeam} from './fusion-reactor.js';
import type {CoupledTargetSnapshot} from './coupled-target-ui.js';
import {advanceTargetConduction} from './target-conduction.js';

export interface BeamMotionState {
 kind:'beam';basis:'initial source'|'selected target state';timeS:number|null;
 energyKeV:number;areaM2:number;particleRateS:number;neutronRateS:number;neutronEnergyMeV:number|null;
 depositedPowerW:number;heatFacesWM2:number[];temperatureK:number[];
 heatGeometry:{faceDepthM:number[];filmThicknessM:number;backingThicknessM:number}|null;
 /** Normalized cumulative D–T reaction probability through the modeled slab. */
 reactionDepthCDF:{depthFraction:number;cumulativeFraction:number}[]|null;
}
export type ReactorMotionState=BeamMotionState|{kind:'power-reference'};
const ATOMIC_MASS_KG=1.66053906660e-27;
/** Nonrelativistic speed, consistent with the source model's mass-number kinematics. */
export const kineticSpeedMS=(energyJ:number,massU:number)=>Math.sqrt(2*energyJ/(massU*ATOMIC_MASS_KG));
export const ionSpeedMS=(s:BeamMotionState)=>kineticSpeedMS(s.energyKeV*1000*E_CHARGE,2);

export function sourceMotionState(result:ReturnType<typeof simulateFusionBeam>|null):BeamMotionState|null{
 if(!result)return null;
 const total=result.fusionProbability;
 return {kind:'beam',basis:'initial source',timeS:null,energyKeV:result.config.beamEnergyKeV,areaM2:result.config.beamAreaM2,
  particleRateS:result.particleRateS,neutronRateS:result.neutronRateS,
  neutronEnergyMeV:result.neutronRateS>0?result.neutronPowerW/result.neutronRateS/E_CHARGE/1e6:null,
  depositedPowerW:result.assemblyHeatIfTransmittedBeamStoppedW,heatFacesWM2:[],temperatureK:[],heatGeometry:null,
  reactionDepthCDF:total>0?result.profiles.map(profile=>({depthFraction:profile.depthFraction,cumulativeFraction:profile.fusionProbability/total})):null};
}

/** Reuse the thermal solver's face conductances, including contact/Robin resistances.
 * dt=0 evaluates the selected temperatures without advancing or changing the solution. */
export function targetMotionState({result,state,source}:CoupledTargetSnapshot):BeamMotionState{
 const c=result.config,n=c.depthCells;
 const cells=state.temperatureK.map((_,i)=>({widthM:i<n?c.filmThicknessM/n:c.backingThicknessM/c.backingCells,
  conductivityWMK:i<n?c.filmConductivityWMK:c.backingConductivityWMK,
  volumetricHeatCapacityJm3K:i<n?c.filmHeatCapacityJm3K:c.backingHeatCapacityJm3K}));
 const heat=advanceTargetConduction({cells,coolantK:c.coolantK,backHeatTransferWM2K:c.backHeatTransferWM2K,
  contactResistanceM2KPerW:cells.slice(1).map((_,i)=>i===n-1?c.contactResistanceM2KPerW:0)},state.temperatureK,0,cells.map(()=>0));
 return {kind:'beam',basis:'selected target state',timeS:state.timeS,energyKeV:source.beamEnergyKeV,areaM2:source.beamAreaM2,
  particleRateS:state.beamOn?source.beamCurrentA/E_CHARGE:0,neutronRateS:state.neutronRateS,
  neutronEnergyMeV:state.neutronMeanEnergyMeV,depositedPowerW:state.assemblyHeatW,
  heatFacesWM2:heat.faceFluxWM2,temperatureK:[...state.temperatureK],
  heatGeometry:{faceDepthM:[0,...cells.map((_,i)=>i<n?c.filmThicknessM*((i+1)/n):c.filmThicknessM+c.backingThicknessM*((i-n+1)/c.backingCells))],filmThicknessM:c.filmThicknessM,backingThicknessM:c.backingThicknessM},reactionDepthCDF:null};
}

export function reactionDepthQuantile(cdf:BeamMotionState['reactionDepthCDF'],quantile:number){
 if(!cdf?.length||!Number.isFinite(quantile)||quantile<0||quantile>1)return 0;
 for(let i=1;i<cdf.length;i++)if(quantile<=cdf[i].cumulativeFraction){
  const left=cdf[i-1],right=cdf[i],span=right.cumulativeFraction-left.cumulativeFraction;
  return span>0?left.depthFraction+(right.depthFraction-left.depthFraction)*(quantile-left.cumulativeFraction)/span:right.depthFraction;
 }
 return cdf.at(-1)!.depthFraction;
}

/** Fixed display scales: bounded populations, never one glyph per physical particle. */
export function motionPopulation(rate:number,reference:number,maximum:number){
 return rate>0?Math.ceil(maximum*rate/(rate+reference)):0;
}
/** Equal-solid-angle deterministic directions; no scattering in undisclosed hardware. */
export function neutronDirection(index:number,count:number):[number,number,number]{
 const x=1-2*(index+.5)/count,phi=index*Math.PI*(3-Math.sqrt(5)),r=Math.sqrt(1-x*x);
 return [x,r*Math.cos(phi),r*Math.sin(phi)];
}

/** Antipodal angular quadrature, independently sampled from disk birth coordinates.
 * Each pair represents equal-weight source samples, not two products of one reaction. */
export function neutronSample(index:number,count:number){
 const pair=Math.floor(index/2),pairs=count/2;
 let bits=pair+1,fraction=0,weight=.5;
 while(bits){fraction+=(bits%2)*weight;bits=Math.floor(bits/2);weight*=.5;}
 const radius=Math.sqrt(fraction),angle=pair*Math.PI*(3-Math.sqrt(2));
 const direction=neutronDirection(pair,pairs).map(v=>v*(index%2?-1:1)) as [number,number,number];
 return {birth:[radius*Math.cos(angle),radius*Math.sin(angle)] as [number,number],direction};
}

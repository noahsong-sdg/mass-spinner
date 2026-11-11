import type {simulateFusionBeam} from './fusion-reactor.js';

export interface TargetExposureConfig {
 /** Assumed bulk heat capacity per illuminated area, not measured LiT data. */
 arealHeatCapacityJm2K:number;
 /** Effective assembly-to-bath conductance per illuminated area. Zero is adiabatic. */
 heatTransferWM2K:number;
 coolantK:number;
 initialK:number;
 cooldownS:number;
 samples?:number;
}
export const DEFAULT_TARGET_EXPOSURE:TargetExposureConfig={
 arealHeatCapacityJm2K:10000,heatTransferWM2K:5000,
 coolantK:293.15,initialK:293.15,cooldownS:20,samples:160,
};

/** Stable exact response for C_A dθ/dt = q'' − h θ, with constant forcing. */
function segment(theta0:number,flux:number,seconds:number,capacity:number,transfer:number){
 const x=transfer/capacity*seconds,removedFraction=-Math.expm1(-x);
 const phi=x===0?1:removedFraction/x;
 // 1−phi loses all significant digits for a very short step; integrate its series.
 const complement=x<1e-3?x*(.5+x*(-1/6+x*(1/24-x/120))):1-phi;
 const incident=flux*seconds,initialCooling=capacity*theta0*removedFraction;
 const stored=incident*phi-initialCooling;
 return {theta:theta0*Math.exp(-x)+incident/capacity*phi,
  stored,removed:initialCooling+incident*complement,incident};
}

/** Conditional single-pulse bulk model; never feeds temperature back into beam yield. */
export function simulateTargetExposure(beam:ReturnType<typeof simulateFusionBeam>,config:TargetExposureConfig){
 const c={...config,samples:config.samples??160};
 const {arealHeatCapacityJm2K:capacity,heatTransferWM2K:transfer,coolantK,initialK,cooldownS,samples}=c;
 const area=beam.config.beamAreaM2,onS=beam.config.exposureS,column=beam.config.targetColumnM2;
 const power=beam.assemblyHeatIfTransmittedBeamStoppedW,rate=beam.neutronRateS;
 if(![capacity,transfer,coolantK,initialK,cooldownS,area,onS,column,power,rate].every(Number.isFinite)
  ||capacity<=0||transfer<0||coolantK<=0||initialK<=0||cooldownS<0
  ||area<=0||onS<0||column<0||power<0||rate<0||!Number.isInteger(samples)||samples<16||samples>1000)
  throw new RangeError('Exposure needs positive heat capacity/absolute temperatures/area, nonnegative conductance and times, and 16–1000 plot samples.');
 const totalS=onS+cooldownS,flux=power/area,inventory=column*area,consumed=rate*onS;
 const tau=transfer===0?null:capacity/transfer;
 if(![totalS,flux,inventory,consumed,...(tau===null?[]:[tau])].every(Number.isFinite))
  throw new RangeError('Exposure inputs exceed the finite numeric domain.');
 if(consumed>inventory)throw new RangeError('Frozen source predicts more fusion reactions than available tritium. Shorten exposure; this model does not replenish or evolve the target.');
 const theta0=initialK-coolantK,on=segment(theta0,flux,onS,capacity,transfer);
 const evaluate=(timeS:number)=>{
  const heating=segment(theta0,flux,Math.min(timeS,onS),capacity,transfer);
  const cooling=timeS>onS?segment(on.theta,0,timeS-onS,capacity,transfer):null;
  const storedEnergyJ=area*(heating.stored+(cooling?.stored??0));
  const heatToCoolantJ=area*(heating.removed+(cooling?.removed??0));
  const depositedEnergyJ=area*heating.incident;
  return {timeS,temperatureK:coolantK+(cooling?.theta??heating.theta),depositedEnergyJ,
   storedEnergyJ,heatToCoolantJ,energyResidualJ:depositedEnergyJ-storedEnergyJ-heatToCoolantJ};
 };
 const times=new Set([0,onS,totalS]);
 if(totalS>0)for(let i=0;i<=samples;i++)times.add(totalS*i/samples);
 // Resolve fast thermal response near both switching events without a timestep solver.
 if(tau!==null)for(const k of [.01,.03,.1,.3,1,3,10]){
  if(k*tau<onS)times.add(k*tau);
  if(k*tau<cooldownS)times.add(onS+k*tau);
 }
 const history=[...times].sort((a,b)=>a-b).map(evaluate),endOn=evaluate(onS),final=history.at(-1)!;
 if(history.some(s=>Object.values(s).some(v=>!Number.isFinite(v)))||history.some(s=>s.temperatureK<=0))
  throw new RangeError('Exposure result exceeds the finite positive-temperature domain.');
 const fraction=inventory>0?consumed/inventory:null;
 return {model:'conditional-bulk-thermal-reference' as const,config:c,onS,totalS,
  beamAreaM2:area,assemblyHeatW:power,heatFluxWM2:flux,thermalTimeConstantS:tau,
  endOn,final,history,peakTemperatureK:Math.max(...history.map(s=>s.temperatureK)),
  initialTritiumNuclei:inventory,fusionConsumedTritium:consumed,fusionOnlyConsumedFraction:fraction,
  curves:[{label:'Bulk assembly temperature',x:history.map(s=>s.timeS),y:history.map(s=>s.temperatureK),
   xLabel:'Time from beam start (s)',yLabel:'Bulk temperature (K)',selectedX:onS},
  ...(['depositedEnergyJ','storedEnergyJ','heatToCoolantJ'] as const).map((key,i)=>({
   label:['Deposited heat','Stored energy relative to start','Heat transferred to coolant (signed)'][i],
   x:history.map(s=>s.timeS),y:history.map(s=>s[key]),
   xLabel:'Time from beam start (s)',yLabel:'Energy (J)',selectedX:onS}))],
  assumptions:[
   'Single bulk assembly node with assumed constant areal heat capacity and effective cooling. Coefficients are scenario inputs, not Marathon measurements or a verified LiT material model.',
   'Uses conditional assembly heat: all transmitted beam stops in the backing. The film and backing are not separate thermal nodes; no surface hotspot, contact resistance, spatial conduction, coolant hydraulics, phase change or radiation is solved.',
   'A constant beam acts for the source exposure duration, then switches off for cooldown. Cooling bath temperature stays fixed. Beam current is beam-on current; cooling time produces no additional neutrons.',
   'The source and stopping matrix stay frozen. Temperature does not change neutron yield, tritium loading or stopping. Negative heat-to-coolant means the bath is warming an initially colder assembly.',
   'Fusion consumption counts one tritium nucleus per reaction. It omits isotope exchange, implantation, diffusion, permeation, sputtering, radioactive decay and target renewal; this is not a target-lifetime or safe-temperature calculation.',
  ]};
}

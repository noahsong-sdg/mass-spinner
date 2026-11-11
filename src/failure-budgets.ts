import {E_CHARGE} from './physics.js';

/** Independent homogeneous estimates, not reactions/transport coupled to ions. */
export interface FailureBudgetConfig {
 neutralDensityM3:number;cxCrossSectionM2:number;pathLengthM:number;
 electronDensityM3:number;recombinationM3S:number;residenceS:number;
 diffusionM2S:number;ionDensityM3:number;impurityFraction:number;
 /** Optically thin cooling coefficient in W·m³, not power density W/m³. */
 coolingCoefficientWM3:number;electronTemperatureEV:number;
 heatTransmission:number;wallFluxM2S:number;
}

/** Teaching assumptions only. No species-specific atomic database is implied. */
export const DEFAULT_FAILURE_BUDGETS:FailureBudgetConfig={
 neutralDensityM3:1e18,cxCrossSectionM2:1e-19,pathLengthM:.6,
 electronDensityM3:1e18,recombinationM3S:1e-18,residenceS:2e-4,
 diffusionM2S:1,ionDensityM3:1e18,impurityFraction:.01,
 coolingCoefficientWM3:1e-31,electronTemperatureEV:5,heatTransmission:7,wallFluxM2S:1e21,
};

export function failureBudgets(c:FailureBudgetConfig){
 if(!Object.values(c).every(Number.isFinite)
  ||Object.values(c).some(x=>x<0)||!(c.ionDensityM3>0)||!(c.residenceS>0)
  ||c.impurityFraction>1)
  throw new Error('Failure budgets require finite nonnegative SI inputs, positive ion density/residence time and impurity fraction in [0,1].');
 const impurityDensityM3=c.ionDensityM3*c.impurityFraction;
 const cxOpticalDepth=c.neutralDensityM3*c.cxCrossSectionM2*c.pathLengthM;
 const recombinationOpticalDepth=c.electronDensityM3*c.recombinationM3S*c.residenceS;
 const radiativePowerWM3=c.electronDensityM3*impurityDensityM3*c.coolingCoefficientWM3;
 const sheathHeatFluxWM2=c.heatTransmission*c.electronTemperatureEV*E_CHARGE*c.wallFluxM2S;
 const diffusionRMSM=Math.sqrt(4*c.diffusionM2S*c.residenceS);
 const radiatedEVPerInitialIon=radiativePowerWM3*c.residenceS/(c.ionDensityM3*E_CHARGE);
 const budgets={cxOpticalDepth,recombinationOpticalDepth,impurityDensityM3,radiativePowerWM3,
  sheathHeatFluxWM2,diffusionRMSM,radiatedEVPerInitialIon,
  noChargeExchangeProbability:Math.exp(-cxOpticalDepth),
  noRecombinationProbability:Math.exp(-recombinationOpticalDepth)};
 if(!Object.values(budgets).every(Number.isFinite)||!Number.isFinite(c.residenceS*1e6))
  throw new Error('Failure-budget products exceed the representable finite domain.');
 const time=Array.from({length:81},(_,i)=>c.residenceS*i/80),x=time.map(t=>t*1e6);
 const curves=[
  {label:'No charge-exchange event',x,y:time.map(t=>Math.exp(-cxOpticalDepth*t/c.residenceS)),
   xLabel:'Elapsed assumed residence (µs)',yLabel:'Single-process no-event probability'},
  {label:'No recombination event',x,y:time.map(t=>Math.exp(-c.electronDensityM3*c.recombinationM3S*t)),
   xLabel:'Elapsed assumed residence (µs)',yLabel:'Single-process no-event probability'},
  {label:'Unbounded 2D diffusion RMS',x,y:time.map(t=>Math.sqrt(4*c.diffusionM2S*t)),
   xLabel:'Elapsed assumed residence (µs)',yLabel:'Assumed unbounded displacement RMS (m)'},
  {label:'Radiated energy / initial ion',x,y:time.map(t=>radiativePowerWM3*t/(c.ionDensityM3*E_CHARGE)),
   xLabel:'Elapsed assumed residence (µs)',yLabel:'Assumed radiation energy (eV / initial ion)'},
  {label:'Uniform sheath heat flux',x,y:time.map(()=>sheathHeatFluxWM2),
   xLabel:'Elapsed assumed residence (µs)',yLabel:'Assumed sheath heat flux (W/m²)'},
 ];
 const metrics=[
  {label:'CX optical depth n₀σL',value:cxOpticalDepth,unit:''},
  {label:'No CX event over assumed path',value:budgets.noChargeExchangeProbability,unit:'probability'},
  {label:'No recombination over assumed residence',value:budgets.noRecombinationProbability,unit:'probability'},
  {label:'Unbounded 2D displacement RMS',value:diffusionRMSM,unit:'m'},
  {label:'Assumed volumetric radiative power',value:radiativePowerWM3,unit:'W/m³'},
  {label:'Radiation energy per initial ion',value:radiatedEVPerInitialIon,unit:'eV/ion'},
  {label:'Assumed sheath heat flux',value:sheathHeatFluxWM2,unit:'W/m²'},
 ];
 return {config:{...c},budgets,curves,metrics,assumptions:[
  'Independent homogeneous sensitivity estimates for Section III D/H/I/J. These do not modify the C/D ion trajectories, temperatures, charge states, collector counts or purity.',
  'All default cross sections, coefficients, diffusivity and fluxes are explicitly assumed teaching values. No element-specific rate, measured turbulence or calibrated apparatus is implied.',
  'CX uses the tutorial Eq. (12): optical depth n₀σL and Poisson no-event probability exp(−n₀σL). Cross section and neutral density are constant; path grows linearly to the supplied L over the supplied residence time. This is actual assumed path length, not necessarily device axial length.',
  'Recombination is a separate constant electron-density/rate-coefficient Poisson hazard exp(−nₑαt). Each no-event curve isolates one channel; neither tracks products or models a coupled reaction network.',
  'Diffusion RMS is sqrt(4Dt) for two unbounded Cartesian dimensions with prescribed isotropic constant D. It is not a bounded-cylinder radial density, first-wall probability, instability threshold or prediction of Bohm/turbulent transport.',
  'Optically thin line-radiation estimate P=nₑ nZ LZ uses nZ=fZ nᵢ, a prescribed impurity population and cooling coefficient LZ in W·m³. Coefficients generally depend on species, charge, electron distribution and density. Constant populations and temperatures are assumed throughout.',
  'Radiated energy is P t/(nᵢ e) per initial ion, not a computed plasma temperature drop. A large value exposes a missing heating/energy closure; the calculation does not silently clip the temperature or rate.',
  'Sheath heat flux follows the simplified tutorial Eq. (17): γ Te[eV] e Γᵢ in W/m². γ and incident ion flux are supplied, not solved. This omits biased/conducting-wall work, secondary emission, surface response and cooling capacity; multiply by a justified area only for a declared total-power estimate.',
 ]};
}

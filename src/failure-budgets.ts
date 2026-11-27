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
  throw new Error('Failure budgets must have finite nonnegative SI inputs. Ion density and residence time must be positive. Impurity fraction must be in [0,1].');
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
  throw new Error('Failure-budget products are outside the finite number range.');
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
  'These separate uniform-state sensitivity estimates apply to Section III D/H/I/J. They do not modify the C/D ion trajectories, temperatures, charge states, collector counts or purity.',
  'Default cross sections, coefficients, diffusivity and fluxes are example inputs. They do not give element-specific rates, measured turbulence or calibrated apparatus results.',
  'Charge exchange (CX) uses tutorial Eq. (12): optical depth n₀σL and Poisson no-event probability exp(−n₀σL). Cross section and neutral density stay constant. Path length increases linearly to the supplied L over the supplied residence time. This assumed particle path length is not necessarily the axial device length.',
  'Recombination uses a separate Poisson no-event probability exp(−nₑαt), with constant electron density and rate coefficient. Each no-event curve gives the result for one channel. Neither curve calculates products or coupled reaction networks.',
  'Diffusion RMS is sqrt(4Dt) for two unbounded Cartesian dimensions with specified isotropic constant D. It gives no bounded-cylinder radial density, first-wall probability, instability threshold or Bohm/turbulent transport prediction.',
  'Optically thin line radiation uses P=nₑ nZ LZ, with nZ=fZ nᵢ. The impurity population and cooling coefficient LZ (W·m³) are specified inputs. Coefficients generally depend on species, charge, electron distribution and density. Populations and temperatures stay constant.',
  'Radiated energy is P t/(nᵢ e) per initial ion, not a calculated plasma temperature decrease. A large value shows a missing heating or energy closure. The calculation does not limit the temperature or rate to hide this difference.',
  'Sheath heat flux uses simplified tutorial Eq. (17): γ Te[eV] e Γᵢ in W/m². The user supplies γ and incident ion flux. The calculation does not include biased/conducting-wall work, secondary emission, surface response or cooling capacity. For a total-power estimate, multiply by an area with a stated physical basis.',
 ]};
}

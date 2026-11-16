/** Optional conceptual argon lab cell. Reuses the coupled spatial kernel;
 * it is neither the Wijnakker apparatus nor a Marathon performance model. */
import {createFuelSpatialStepper,type FuelSpatialSetup,type FuelSpatialState} from './fuel-spatial-operation.js';
import {createFuelLiner,initialFuelLinerEnergy,fuelLinerState} from './fuel-thermal.js';
import {fuelGasState} from './fuel-gas.js';

const K=1.380649e-23,ARGON_KG=39.948*1.66053906892e-27,R=.01,L=.1;
const sum=(values:readonly number[])=>values.reduce((a,b)=>a+b,0);
export interface FuelSpatialExperimentConfig {
 contactVoltageV:number;magneticT:number;numberDensityM3:number;temperatureK:number;
 durationS:number;radialCells:number;axialCells:number;steps:number;driveFraction:number;
}
export const DEFAULT_SPATIAL_EXPERIMENT:Readonly<FuelSpatialExperimentConfig>={
 contactVoltageV:1,magneticT:.5,numberDensityM3:1e19/(Math.PI*R**2*L),temperatureK:1000,
 durationS:1e-6,radialCells:4,axialCells:4,steps:16,driveFraction:1,
};
export function validateFuelSpatialExperiment(input:unknown):FuelSpatialExperimentConfig {
 if(input===null||typeof input!=='object'||Array.isArray(input))throw new RangeError('Spatial experiment config must be an object.');
 const record=input as Record<string,unknown>;
 if(Object.keys(record).some(k=>!Object.hasOwn(DEFAULT_SPATIAL_EXPERIMENT,k)))throw new RangeError('Unknown spatial experiment setting.');
 const c={...DEFAULT_SPATIAL_EXPERIMENT,...record} as FuelSpatialExperimentConfig;
 if(Object.values(c).some(v=>typeof v!=='number'||!Number.isFinite(v)))throw new RangeError('Spatial experiment settings must be finite numbers.');
 if(Math.abs(c.contactVoltageV)>10||c.magneticT<0||c.magneticT>1||c.numberDensityM3<1e18||c.numberDensityM3>1e24||
  c.temperatureK<300||c.temperatureK>1800||c.durationS<0||c.durationS>1e-5)
  throw new RangeError('Spatial lab cell requires |V|≤10V, B=0–1T, density=1e18–1e24m⁻³, initial T=300–1800K and duration≤10µs.');
 if(![4,8,16].includes(c.radialCells)||![2,4,8].includes(c.axialCells)||![16,32,64].includes(c.steps)||![0,.5,1].includes(c.driveFraction))
  throw new RangeError('Spatial lab cell requires nr=4/8/16, nz=2/4/8, 16/32/64 steps and drive fraction=0/0.5/1.');
 return c;
}
export interface FuelSpatialExperimentSnapshot {
 timeS:number;contactVoltageV:number;radiusM:number[];omegaRadS:number[];temperatureK:number[];
 densityKgM3:number[];lightMass:number[];heavyMass:number[];electrodeCurrentA:number;electricalPowerW:number;
 kineticJ:number;gasEnergyJ:number;linerEnergyJ:number;angularMomentumKgM2S:number;
 gasCellEnergyJ:number[];linerCellEnergyJ:number[];linerTemperatureK:number[];
 intervalGasWallHeatJ:number;jouleByGasCellW:number[];torqueByGasCellNm:number[];
 joulePowerW:number;mechanicalPowerW:number;stepOmegaMismatchRadS:number;
 stepMechanicalEndpointDefectJ:number;thermalRowResidualJ:number;electricalEnergyResidualW:number;
 inertiaKgM2:number[];intervalElectricalWorkJ:number;
}

export function simulateFuelSpatialExperiment(input:Partial<FuelSpatialExperimentConfig>={}) {
 const config=validateFuelSpatialExperiment(input),nr=config.radialCells,nz=config.axialCells;
 const number=config.numberDensityM3*Math.PI*R**2*L,volume=Math.PI*R**2*L/nr;
 const liner=createFuelLiner({radiusM:R,lengthM:L,thicknessM:.001,cells:3});
 const setup=(voltage:number):FuelSpatialSetup=>({number,lightFraction:.5,speciesMassKg:[ARGON_KG,ARGON_KG],
  radiusM:R,lengthM:L,diffusivityM2S:.001,material:'argon',liner,
  boundary:{gasWallWK:.1,coolingWK:0,coolantK:config.temperatureK},
  electrical:{radialEdgesM:Array.from({length:nr+1},(_,i)=>R*Math.sqrt(i/nr)),
   axialEdgesM:Array.from({length:nz+1},(_,j)=>L*j/nz),
   sigmaPerpSM:Array(nr*nz).fill(.01),sigmaParallelSM:Array(nr*nz).fill(.1),magneticT:config.magneticT,
   innerVoltageV:Array(nz).fill(null),outerVoltageV:Array(nz).fill(voltage),
   lowerVoltageV:Array(nr).fill(null),upperVoltageV:Array.from({length:nr},(_,i)=>i<nr/2?0:null)}});
 const activeSteps=config.steps*config.driveFraction;
 const c=setup(config.contactVoltageV),on=createFuelSpatialStepper(c);
 let off:ReturnType<typeof createFuelSpatialStepper>|undefined;
 const stepper=(powered:boolean)=>powered?on:off??(off=createFuelSpatialStepper(setup(0)));
 let state:FuelSpatialState={lightMass:Array(nr).fill(1/nr),heavyMass:Array(nr).fill(1/nr),omegaRadS:Array(nr).fill(0),
  gasEnergyJ:Array(nr).fill(1.5*K*number*config.temperatureK/nr),linerEnergyJ:initialFuelLinerEnergy(liner,config.temperatureK)};
 const initialGasJ=sum(state.gasEnergyJ),initialLinerJ=sum(state.linerEnergyJ);
 const budgets={electricWorkJ:0,driveImpulseKgM2S:0,wallImpulseKgM2S:0,wallWorkJ:0,numericalLossJ:0,
  coolingEnergyJ:0,energyResidualJ:0,angularResidualKgM2S:0,maxStepEnergyResidualJ:0,maxStepAngularResidualKgM2S:0};
 type Step=ReturnType<typeof on>;
 const snapshot=(timeS:number,voltage:number,result:Step,acceptedStep=result):FuelSpatialExperimentSnapshot=>{
  const gas=fuelGasState(state.lightMass,state.heavyMass,state.gasEnergyJ,c);
  const currents=result.electrical.boundaryCurrentsA;
  if(currents.length!==nz+nr/2)throw new RangeError('Spatial lab cell electrode-current topology changed.');
  // The existing solver appends outer contacts j=0..nz-2, then upper disk
  // contacts at j=nz-1, and finally the last outer face. Positive = OUT of gas.
  const electrodeCurrentA=sum(currents.slice(0,nz-1))+currents.at(-1)!;
  const jouleByGasCellW=Array<number>(nr).fill(0),torqueByGasCellNm=Array<number>(nr).fill(0);
  result.electrical.jouleByCellW.forEach((v,i)=>{jouleByGasCellW[i%nr]+=v;torqueByGasCellNm[i%nr]+=result.electrical.torqueNm[i];});
  const record={timeS,contactVoltageV:voltage,radiusM:gas.radiusM,omegaRadS:[...state.omegaRadS],temperatureK:gas.temperatureK,
   densityKgM3:state.lightMass.map((v,i)=>number*ARGON_KG*(v+state.heavyMass[i])/(2*volume)),
   lightMass:[...state.lightMass],heavyMass:[...state.heavyMass],electrodeCurrentA,
   electricalPowerW:result.electrical.electrodePowerW,kineticJ:result.momentum.kineticJ,
   angularMomentumKgM2S:result.momentum.angularMomentumKgM2S,gasEnergyJ:gas.energyJ,linerEnergyJ:sum(state.linerEnergyJ),
   gasCellEnergyJ:[...state.gasEnergyJ],linerCellEnergyJ:[...state.linerEnergyJ],
   linerTemperatureK:fuelLinerState(liner,state.linerEnergyJ).temperatureK,intervalGasWallHeatJ:acceptedStep.thermal.gasExchangeJ,
   jouleByGasCellW,torqueByGasCellNm,joulePowerW:result.electrical.jouleW,mechanicalPowerW:result.electrical.mechanicalW,
   stepOmegaMismatchRadS:acceptedStep.maxOmegaMismatchRadS,stepMechanicalEndpointDefectJ:acceptedStep.mechanicalEndpointDefectJ,
   thermalRowResidualJ:acceptedStep.thermal.maximumRowResidualJ,electricalEnergyResidualW:result.electrical.energyResidualW,
   inertiaKgM2:[...result.momentum.grid.inertiaKgM2],intervalElectricalWorkJ:acceptedStep.inputWorkJ};
  if(Object.values(record).flat().some(v=>!Number.isFinite(v)))throw new RangeError('Spatial lab cell result exceeds the finite domain.');
  return record;
 };
 const initialVoltage=activeSteps>0?config.contactVoltageV:0;
 const initial=stepper(activeSteps>0)(state,0);
 const snapshots=[snapshot(0,initialVoltage,initial)];
 if(config.durationS>0)for(let i=1;i<=config.steps;i++){
  const dt=config.durationS/config.steps,result=stepper(i<=activeSteps)(state,dt);state=result.state;
  const increment=result.momentum.increment;
  budgets.electricWorkJ+=result.inputWorkJ;budgets.driveImpulseKgM2S+=increment.driveImpulseKgM2S;
  budgets.wallImpulseKgM2S+=increment.wallImpulseKgM2S;budgets.wallWorkJ+=increment.wallWorkJ;
  budgets.numericalLossJ+=increment.numericalLossJ;budgets.coolingEnergyJ+=result.thermal.coolingEnergyJ;
  budgets.maxStepEnergyResidualJ=Math.max(budgets.maxStepEnergyResidualJ,Math.abs(result.energyResidualJ));
  budgets.maxStepAngularResidualKgM2S=Math.max(budgets.maxStepAngularResidualKgM2S,Math.abs(result.momentum.angularResidualKgM2S));
  const switched=i===activeSteps&&i<config.steps;
  const endpoint=switched?stepper(false)(state,0):result;
  const voltage=i<activeSteps||i===config.steps&&activeSteps===config.steps?config.contactVoltageV:0;
  snapshots.push(snapshot(i===config.steps?config.durationS:i*dt,voltage,endpoint,result));
 }
 const final=snapshots.at(-1)!;
 budgets.energyResidualJ=final.kineticJ+(final.gasEnergyJ-initialGasJ)+(final.linerEnergyJ-initialLinerJ)+
  budgets.coolingEnergyJ-budgets.electricWorkJ-budgets.wallWorkJ+budgets.numericalLossJ;
 budgets.angularResidualKgM2S=final.angularMomentumKgM2S-budgets.driveImpulseKgM2S-budgets.wallImpulseKgM2S;
 if(Object.values(budgets).some(v=>!Number.isFinite(v)))throw new RangeError('Spatial lab cell budgets exceed the finite domain.');
 return {schemaVersion:1 as const,kind:'spatial-argon-experiment' as const,config,
  conditions:{material:'argon' as const,radiusM:R,lengthM:L,groundedDiskRadiusM:R/Math.sqrt(2),
   speciesMassKg:[ARGON_KG,ARGON_KG] as const,diffusivityM2S:.001,sigmaPerpSM:.01,sigmaParallelSM:.1,
   gasWallWK:.1,linerThicknessM:.001,linerMaterial:'tungsten' as const,coolingWK:0},
  assumptions:['Conceptual voltage-driven argon lab cell, not a matched Wijnakker apparatus or Marathon machine.',
   'Common Ω(r), independent of z; electrical fields depend on r and z. Equal-mass passive labels do not model isotope enrichment or separate ion/neutral velocities.',
   'Outer cylinder at prescribed voltage; grounded upper disk occupies exactly half the end area on every allowed mesh. Other faces insulate total current.',
   'After a pulse both contacts are grounded: this is a shorted circuit, not an open circuit or discharge quench. Stored switch samples use right-continuous voltage/current.',
   'Prescribed diagonal electrical conductivity, diffusion and gas–wall film. Neutral transport depends on temperature within sourced bounds; no electron energy, chemistry or Hall force.',
   'Joule heating is assigned directly to the common gas; its electron/heavy-particle deposition partition is assumed, not evolved.',
   'Density controls are exploration bounds, not validated continuum limits. At low density, rarefaction can invalidate local viscosity, Fourier heat conduction and the gas–wall film; no Knudsen or accommodation qualification is supplied.',
   'Closed radial species transport and spatial gas/tungsten energy; no radial fluid inertia, axial momentum, extraction, or self-consistent ionization.',
   'Coarse short research trajectory; historical startup/refinement failures remain. No numerical or experimental qualification is inherited from other studies.'],
  experimentallyQualified:false as const,numericallyQualified:false as const,liveDefaultReplaced:false as const,snapshots,budgets};
}

/** Experimental common-fluid electrical/species/momentum/thermal step.
 * r-z electrical fields are projected into radial gas cells; Ω is independent
 * of z. Conductivities and species mobility remain prescribed closures.
 */
import {createFuelCurrentSolver,type FuelCurrentInput} from './fuel-current.js';
import {advanceFuelGasMass,fuelGasState} from './fuel-gas.js';
import {advanceFuelMixtureThermal} from './fuel-gas-thermal.js';
import {createFuelMomentumGrid,fuelMomentumState} from './fuel-momentum.js';
import {advanceFuelAdvectedMomentum} from './fuel-spatial-coupling.js';
import {fuelNeutralTransport} from './fuel-neutral-transport.js';
import type {FuelLinerGrid,FuelLinerBoundary} from './fuel-thermal.js';

export type FuelSpatialState={lightMass:number[];heavyMass:number[];omegaRadS:number[];gasEnergyJ:number[];linerEnergyJ:number[]};
export type FuelSpatialSetup={number:number;lightFraction:number;speciesMassKg:readonly [number,number];
 radiusM:number;lengthM:number;diffusivityM2S:number;material:'lithium'|'argon';
 electrical:Omit<FuelCurrentInput,'omegaRadS'>;liner:FuelLinerGrid;boundary:FuelLinerBoundary};
const sum=(v:readonly number[])=>v.reduce((a,b)=>a+b,0);

function advance(c:FuelSpatialSetup,state:FuelSpatialState,dtS:number,prepared?:()=>ReturnType<typeof createFuelCurrentSolver>){
 const n=state.lightMass.length,nz=c.electrical.axialEdgesM.length-1,x=c.lightFraction;
 const e=c.electrical.radialEdgesM,volume=Math.PI*c.radiusM**2*c.lengthM/n;
 if(e.length!==n+1||e.some((r,i)=>Math.abs(r-c.radiusM*Math.sqrt(i/n))>1e-12*c.radiusM)||
  Math.abs(c.electrical.axialEdgesM[nz]-c.electrical.axialEdgesM[0]-c.lengthM)>1e-12*c.lengthM||
  c.speciesMassKg.some(v=>!Number.isFinite(v)||v<=0))throw new RangeError('Spatial coupling needs the same equal-volume full-cylinder gas and electrical geometry.');
 const initial=fuelGasState(state.lightMass,state.heavyMass,state.gasEnergyJ,c);
 if([state.lightMass,state.heavyMass].some(a=>Math.abs(sum(a)-1)>512*Number.EPSILON*n))throw new RangeError('Spatial coupling needs conserved normalized species inventories.');
 const density=state.lightMass.map((p,i)=>c.number*(x*c.speciesMassKg[0]*p+(1-x)*c.speciesMassKg[1]*state.heavyMass[i])/volume);
 const gridAt=(temperature:readonly number[])=>createFuelMomentumGrid({edgesM:e,lengthM:c.lengthM,densityKgM3:density,
  viscosityPaS:temperature.map(t=>fuelNeutralTransport(c.material,t).viscosityPaS),innerWallRadS:null,outerWallRadS:0,shearScheme:'volume-coordinate'});
 const before=fuelMomentumState(gridAt(initial.temperatureK),state.omegaRadS);
 const solveCurrent=prepared?prepared():createFuelCurrentSolver(c.electrical);
 function sourceAt(temperature:readonly number[]){
  let guess=[...state.omegaRadS];const grid=gridAt(temperature);
  for(let iteration=0;iteration<100;iteration++){
   const light=advanceFuelGasMass(state.lightMass,temperature,c.speciesMassKg[0],guess,c.radiusM,c.diffusivityM2S,dtS);
   const heavy=advanceFuelGasMass(state.heavyMass,temperature,c.speciesMassKg[1],guess,c.radiusM,c.diffusivityM2S,dtS);
   const flux=light.faceTransfers.map((v,i)=>c.number*(x*c.speciesMassKg[0]*v+(1-x)*c.speciesMassKg[1]*heavy.faceTransfers[i]));
   const electrical=solveCurrent(Array.from({length:n*nz},(_,i)=>guess[i%n]));
   const torque=Array<number>(n).fill(0),joule=Array<number>(n).fill(0);
   for(let i=0;i<n*nz;i++){torque[i%n]+=electrical.torqueNm[i];joule[i%n]+=electrical.jouleByCellW[i];}
   const momentum=advanceFuelAdvectedMomentum(grid,state.omegaRadS,flux,torque,dtS);
   for(let i=0;i<n;i++){
    const reconstructed=c.number*(x*c.speciesMassKg[0]*light.mass[i]+(1-x)*c.speciesMassKg[1]*heavy.mass[i])/volume;
    const scale=density[i]+reconstructed+(Math.abs(flux[i-1]??0)+Math.abs(flux[i]??0))/volume;
    if(Math.abs(reconstructed-momentum.grid.densityKgM3[i])>256*Number.EPSILON*scale)
     throw new RangeError('Accepted species inventories and local momentum inertia disagree.');
   }
   const scale=Math.max(1,...guess.map(Math.abs),...momentum.omegaRadS.map(Math.abs));
   if(Math.max(...guess.map((v,i)=>Math.abs(v-momentum.omegaRadS[i])))<=2e-11*scale){
    return {lightMass:light.mass,heavyMass:heavy.mass,faceTransfers:[light.faceTransfers,heavy.faceTransfers],dragEnergyJ:0,
     gasSourceJ:joule.map((v,i)=>dtS*v+momentum.shearHeatJByCell[i]+momentum.centWorkJByCell[i]),
     payload:{momentum,electrical,sourceOmegaRadS:guess,iterations:iteration+1,
      maxOmegaMismatchRadS:Math.max(...guess.map((v,i)=>Math.abs(v-momentum.omegaRadS[i])))}};
   }
   guess=guess.map((v,i)=>.5*(v+momentum.omegaRadS[i]));
  }
  throw new RangeError('Spatial electrical/species/momentum iteration did not converge; refine the timestep.');
 }
 const thermal=advanceFuelMixtureThermal(c.liner,state.linerEnergyJ,state.gasEnergyJ,c.number,x,c.radiusM,c.lengthM,dtS,c.boundary,
  {lightMass:state.lightMass,heavyMass:state.heavyMass,conductivityWMK:0,
   conductivityAtTemperature:t=>fuelNeutralTransport(c.material,t).conductivityWmK},sourceAt);
 const accepted=sourceAt(thermal.gasTemperatureK),{momentum,electrical}=accepted.payload;
 const next:FuelSpatialState={lightMass:accepted.lightMass,heavyMass:accepted.heavyMass,omegaRadS:momentum.omegaRadS,
  gasEnergyJ:thermal.gasEnergyJ,linerEnergyJ:thermal.cellEnergyJ};
 const inputWorkJ=dtS*electrical.electrodePowerW,wallWorkJ=momentum.increment.wallWorkJ;
 const mechanicalEndpointDefectJ=momentum.increment.driveWorkJ-dtS*electrical.mechanicalW;
 const energyResidualJ=momentum.kineticJ-before.kineticJ+sum(next.gasEnergyJ)-sum(state.gasEnergyJ)+
  sum(next.linerEnergyJ)-sum(state.linerEnergyJ)+thermal.coolingEnergyJ-inputWorkJ-wallWorkJ+momentum.increment.numericalLossJ;
 const scale=Math.abs(inputWorkJ)+Math.abs(wallWorkJ)+before.kineticJ+momentum.kineticJ+momentum.increment.numericalLossJ+
  Math.abs(sum(next.gasEnergyJ)-sum(state.gasEnergyJ))+Math.abs(sum(next.linerEnergyJ)-sum(state.linerEnergyJ))+Math.abs(thermal.coolingEnergyJ);
 const storageRoundoffJ=64*Number.EPSILON*(sum(state.gasEnergyJ)+sum(next.gasEnergyJ)+Math.abs(sum(state.linerEnergyJ))+Math.abs(sum(next.linerEnergyJ)));
 if(!Number.isFinite(energyResidualJ)||Math.abs(energyResidualJ)>1e-9*scale+storageRoundoffJ)throw new RangeError('Coupled spatial step failed electrical/mechanical/thermal energy conservation.');
 return {state:next,momentum,electrical,thermal,faceTransfers:accepted.faceTransfers,inputWorkJ,energyResidualJ,energyScaleJ:scale,storageRoundoffJ,
  mechanicalEndpointDefectJ,maxOmegaMismatchRadS:accepted.payload.maxOmegaMismatchRadS,sourceOmegaRadS:accepted.payload.sourceOmegaRadS,
  relativeEnergyResidual:scale===0?0:Math.abs(energyResidualJ)/scale,
  assumptions:['Common Ω(r) extruded into z; projected electrical power and torque use that same field.',
   'Prescribed diagonal conductivity and species mobility; no Hall radial force, separate charged-fluid momentum, electron energy, chemistry or acoustic/radial hydrodynamics.',
   'Sourced neutral transport; physical Joule/shear/centrifugal work enters gas. BE and upwind losses are separate numerical ledgers.']};
}

export function advanceFuelSpatialOperation(c:FuelSpatialSetup,state:FuelSpatialState,dtS:number){
 return advance(c,state,dtS);
}

/** A trajectory owns a frozen setup. Create a new stepper after changing inputs. */
export function createFuelSpatialStepper(setup:FuelSpatialSetup){
 const c=structuredClone(setup);let solver:ReturnType<typeof createFuelCurrentSolver>|undefined;
 const current=()=>solver??(solver=createFuelCurrentSolver(c.electrical));
 return (state:FuelSpatialState,dtS:number)=>advance(c,state,dtS,current);
}

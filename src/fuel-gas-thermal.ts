/** Fixed-volume, overdamped monatomic mixture energy. This is not Navier–Stokes.
 * Species transport, source work and the solid share the accepted endpoint T.
 * Species enthalpy uses the reciprocal logarithmic mean, matching the SG
 * pressure-drift entropy identity; mechanical numerical losses stay external.
 */
import {conductances,fuelLinerState,tungstenThermalProperties,
 FUEL_LINER_MIN_K,FUEL_LINER_MAX_K,type FuelLinerGrid,type FuelLinerBoundary} from './fuel-thermal.js';
import {fuelGasFaceTemperature} from './fuel-gas.js';

const K=1.380649e-23,sum=(a:readonly number[])=>a.reduce((s,v)=>s+v,0);
export type FuelMixtureGasOptions={conductivityWMK:number;lightMass:readonly number[];heavyMass:readonly number[];
 conductivityAtTemperature?:(temperatureK:number)=>number};
export type FuelMixtureHeatSource<T>={lightMass:number[];heavyMass:number[];faceTransfers:number[][];
 gasSourceJ:number[];dragEnergyJ:number;payload:T};

/** Derivatives of T*=a*b*log(b/a)/(b-a); Euler's identity a*da+b*db=T*. */
function faceDerivatives(a:number,b:number){
 const d=(b-a)/a;
 if(Math.abs(d)<1e-4)return [.5+d/3-d*d/12+d**3/30,.5-d/3+d*d/4-d**3/5];
 const log=Math.log1p(d);
 return [(1+d)*((1+d)*log-d)/(d*d),(d-log)/(d*d)];
}

/** General tridiagonal Newton system; central enthalpy transport is not an M-matrix. */
function solve(diagonal:number[],lower:number[],upper:number[],rhs:number[]){
 const d=[...diagonal],b=[...rhs],n=d.length;
 for(let i=1;i<n;i++){
  if(!Number.isFinite(d[i-1])||Math.abs(d[i-1])<Number.MIN_VALUE)throw new RangeError('Mixture thermal pivot failed; refine the time step.');
  const f=lower[i-1]/d[i-1];d[i]-=f*upper[i-1];b[i]-=f*b[i-1];
 }
 const result=Array<number>(n);result[n-1]=b[n-1]/d[n-1];
 for(let i=n-2;i>=0;i--)result[i]=(b[i]-upper[i]*result[i+1])/d[i];
 if(result.some(v=>!Number.isFinite(v)))throw new RangeError('Mixture thermal linear solve is not finite.');
 return result;
}

export function advanceFuelMixtureThermal<T>(grid:FuelLinerGrid,oldLinerEnergy:readonly number[],oldGasEnergy:readonly number[],
 number:number,lightFraction:number,radiusM:number,lengthM:number,dt:number,boundary:FuelLinerBoundary,gasOptions:FuelMixtureGasOptions,
 sourceAtTemperatures:(temperatures:readonly number[])=>FuelMixtureHeatSource<T>){
 const ng=oldGasEnergy.length,oldMass=[gasOptions.lightMass,gasOptions.heavyMass],fractions=[lightFraction,1-lightFraction];
 if(!Number.isSafeInteger(ng)||ng<2||ng>1024||oldMass.some(a=>a.length!==ng||a.some(v=>!Number.isFinite(v)||v<0)||Math.abs(sum(a)-1)>2e-8)||
  [number,radiusM,lengthM,boundary.coolantK].some(v=>!Number.isFinite(v)||v<=0)||!Number.isFinite(lightFraction)||lightFraction<0||lightFraction>1||
  [dt,gasOptions.conductivityWMK,boundary.gasWallWK,boundary.coolingWK].some(v=>!Number.isFinite(v)||v<0)||
  grid.radiusEdgesM[0]!==radiusM||grid.lengthM!==lengthM||oldGasEnergy.some(v=>!Number.isFinite(v)||v<=0))
  throw new RangeError('Mixture energy needs positive gas energies and geometry, normalized species, and nonnegative transport/time.');
 const oldSolid=fuelLinerState(grid,oldLinerEnergy),nw=oldSolid.temperatureK.length,n=ng+nw;
 const oldNumbers=oldGasEnergy.map((_,i)=>number*(fractions[0]*oldMass[0][i]+fractions[1]*oldMass[1][i]));
 if(oldNumbers.some(v=>v<=0))throw new RangeError('Each gas cell needs a positive particle inventory.');
 const oldT=oldGasEnergy.map((u,i)=>u/(1.5*K*oldNumbers[i])),oldValues=[...oldT,...oldSolid.temperatureK];
 // Equal-volume cells are uniform in y=r²/R². Q=−4πLκ y∂T/∂y;
 // this FV flux is exact for a quadratic radial T, including the axis cell.
 const factor=4*Math.PI*lengthM,k=gasOptions.conductivityWMK;
 const oldEnergy=[...oldGasEnergy,...oldLinerEnergy];
 const baseScale=oldValues.map((t,i)=>i<ng?oldGasEnergy[i]:grid.massesKg[i-ng]*t*tungstenThermalProperties(t).heatCapacityJKgK);

 function evaluate(values:number[]){
  if(values.some((t,i)=>!Number.isFinite(t)||t<=0||i>=ng&&(t<FUEL_LINER_MIN_K||t>FUEL_LINER_MAX_K)))
   throw new RangeError('Mixture thermal state leaves positive gas / solid tungsten 300–1900 K.');
  const source=sourceAtTemperatures(values.slice(0,ng)),mass=[source.lightMass,source.heavyMass];
  if(mass.some(a=>!Array.isArray(a)||a.length!==ng||a.some(v=>!Number.isFinite(v)||v<0)||Math.abs(sum(a)-1)>2e-8)||
   !Array.isArray(source.faceTransfers)||source.faceTransfers.length!==2||source.faceTransfers.some(a=>a.length!==ng-1||a.some(v=>!Number.isFinite(v)))||
   source.gasSourceJ.length!==ng||source.gasSourceJ.some(v=>!Number.isFinite(v))||!Number.isFinite(source.dragEnergyJ)||source.dragEnergyJ<0)
   throw new RangeError('Mixture source needs finite conservative species transfers and heat.');
  for(let s=0;s<2;s++)for(let i=0;i<ng;i++){
   const change=(i?source.faceTransfers[s][i-1]:0)-(i<ng-1?source.faceTransfers[s][i]:0);
   if(Math.abs(mass[s][i]-oldMass[s][i]-change)>2e-10*Math.max(1,Math.abs(change)))
    throw new RangeError('Species energy transport must use the accepted conservative face transfers.');
  }
  if(dt===0&&(source.dragEnergyJ!==0||source.gasSourceJ.some(v=>v!==0)||source.faceTransfers.some(a=>a.some(v=>v!==0))))
   throw new RangeError('A zero-time mixture step cannot transport particles or deposit heat.');
  const numbers=values.slice(0,ng).map((_,i)=>number*(fractions[0]*mass[0][i]+fractions[1]*mass[1][i]));
  if(numbers.some(v=>!Number.isFinite(v)||v<=0))throw new RangeError('Mixture gas cells need positive endpoint particle inventories.');
  const conductivity=values.slice(0,ng).map(t=>gasOptions.conductivityAtTemperature?gasOptions.conductivityAtTemperature(t):k);
  if(conductivity.some(v=>!Number.isFinite(v)||v<0))throw new RangeError('Gas conductivity must remain finite and nonnegative.');
  const gasLinks=Array.from({length:ng-1},(_,i)=>conductivity[i]===0||conductivity[i+1]===0?0:
   factor*(i+1)*2/(1/conductivity[i]+1/conductivity[i+1]));
  const wallK=conductivity[ng-1],solid=conductances(grid,values.slice(ng),boundary),inner=wallK===0||solid.inner===0?0:
   1/(1/solid.inner+1/(2*factor*wallK*ng));
  const links=[...gasLinks,inner,...solid.internal].map(g=>dt*g),outer=dt*solid.outer;
  const energy=values.map((t,i)=>i<ng?1.5*K*numbers[i]*t:grid.massesKg[i-ng]*tungstenThermalProperties(t).specificEnthalpyJKg);
  const residual=energy.map((u,i)=>u-oldEnergy[i]-(i<ng?source.gasSourceJ[i]:i===ng?source.dragEnergyJ:0));
  const diagonal=values.map((t,i)=>i<ng?1.5*K*numbers[i]:grid.massesKg[i-ng]*tungstenThermalProperties(t).heatCapacityJKgK);
  const lower=Array<number>(n-1).fill(0),upper=Array<number>(n-1).fill(0),faceEnergyJ:number[]=[],speciesFaceEnergyJ:number[]=[];
  const fluxScale=values.map((_,i)=>i<ng?Math.abs(source.gasSourceJ[i]):i===ng?source.dragEnergyJ:0);
  for(let i=0;i<n-1;i++){
   let heat=links[i]*(values[i]-values[i+1]),left=links[i],right=-links[i];
   if(i<ng-1){
    const transfer=number*(fractions[0]*source.faceTransfers[0][i]+fractions[1]*source.faceTransfers[1][i]);
    const h=2.5*K*transfer,advected=h*fuelGasFaceTemperature(values[i],values[i+1]),d=faceDerivatives(values[i],values[i+1]);
    heat+=advected;left+=h*d[0];right+=h*d[1];speciesFaceEnergyJ.push(advected);
   }
   residual[i]+=heat;residual[i+1]-=heat;fluxScale[i]+=Math.abs(heat);fluxScale[i+1]+=Math.abs(heat);faceEnergyJ.push(heat);
   diagonal[i]+=left;upper[i]+=right;lower[i]-=left;diagonal[i+1]-=right;
  }
  const coolingEnergyJ=outer*(values[n-1]-boundary.coolantK);residual[n-1]+=coolingEnergyJ;diagonal[n-1]+=outer;fluxScale[n-1]+=Math.abs(coolingEnergyJ);
  const scales=residual.map((_,i)=>baseScale[i]+Math.abs(energy[i])+fluxScale[i]);
  // Resolve exchanged heat, rather than terminating on a large background
  // solid enthalpy. Absolute-energy subtraction still has a storage ULP floor.
  const maximumTemperature=Math.max(...values,boundary.coolantK);
  const tolerance=residual.map((_,i)=>2e-12*(Math.abs(energy[i]-oldEnergy[i])+fluxScale[i])+16*Number.EPSILON*(
   Math.abs(energy[i])+Math.abs(oldEnergy[i])+((i?links[i-1]:0)+(i<n-1?links[i]:outer))*maximumTemperature));
  return {source,numbers,energy,residual,diagonal,lower,upper,faceEnergyJ,speciesFaceEnergyJ,coolingEnergyJ,scales,tolerance,
   // Search and acceptance must rank the same unfinished rows: a converged
   // solid roundoff plateau must not veto a useful gas-temperature correction.
   merit:Math.max(...residual.map((r,i)=>Math.abs(r)/tolerance[i]))};
 }
 let values=[...oldValues],accepted=evaluate(values);
 for(let iteration=1;iteration<=160;iteration++){
  if(accepted.residual.every((r,i)=>Math.abs(r)<=accepted.tolerance[i])){
   const liner=fuelLinerState(grid,accepted.energy.slice(ng));
   const gasEnergyJ=accepted.energy.slice(0,ng),residualJ=sum(accepted.residual);
   if(Math.abs(residualJ)>2e-10*sum(accepted.scales))throw new RangeError('Mixture thermal step failed total energy conservation.');
   return {...liner,gasEnergyJ,gasTemperatureK:values.slice(0,ng),linerSolveTemperatureK:values.slice(ng),
    meanGasK:sum(gasEnergyJ)/(1.5*K*number),gasCellNumbers:accepted.numbers,gasExchangeJ:accepted.faceEnergyJ[ng-1],
    gasFaceEnergyJ:accepted.faceEnergyJ.slice(0,ng-1),speciesFaceEnergyJ:accepted.speciesFaceEnergyJ,
    gasSourceJ:[...accepted.source.gasSourceJ],coolingEnergyJ:accepted.coolingEnergyJ,residualJ,
    maximumRowResidualJ:Math.max(...accepted.residual.map(Math.abs)),payload:accepted.source.payload,iterations:iteration};
  }
  const increment=solve(accepted.diagonal,accepted.lower,accepted.upper,accepted.residual.map(r=>-r));
  let damping=1;
  for(let i=0;i<n;i++){
   if(increment[i]<0)damping=Math.min(damping,.9*(values[i]-(i<ng?0:FUEL_LINER_MIN_K))/-increment[i]);
   if(i>=ng&&increment[i]>0)damping=Math.min(damping,.9*(FUEL_LINER_MAX_K-values[i])/increment[i]);
  }
  if(!Number.isFinite(damping)||damping<=0)throw new RangeError('Mixture thermal solution leaves its material domain.');
  let next:ReturnType<typeof evaluate>|undefined,nextValues:number[]=[];
  for(let search=0;search<24;search++){
   nextValues=values.map((v,i)=>v+damping*increment[i]);next=evaluate(nextValues);
   if(next.merit<accepted.merit||next.residual.every((r,i)=>Math.abs(r)<=next!.tolerance[i]))break;
   next=undefined;damping*=.5;
  }
  if(!next)throw new RangeError('Coupled mixture energy iteration stalled; refine the time step.');
  values=nextValues;accepted=next;
 }
 throw new RangeError('Coupled spatial mixture energy did not converge; refine the time step.');
}

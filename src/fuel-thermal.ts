/** Cylindrical, fixed-geometry solid tungsten liner. Gas remains a lumped reservoir.
 * Cp: NIST solid Shomate, https://webbook.nist.gov/cgi/inchi?ID=C7440337&Mask=2
 * k and reference density: Tolias (2017), https://arxiv.org/abs/1703.06302
 * Restricted to 300–1900 K; no melting, thermal expansion or damage correction.
 */
export const FUEL_LINER_MIN_K=300,FUEL_LINER_MAX_K=1900;
const MOLAR_KG=.18384,DENSITY_KGM3=19250;
const A=23.95930,B=2.639680e-3,C=1.257750e-6,D=-.254642e-9,E=-.048407e6;
const sum=(values:readonly number[])=>values.reduce((total,value)=>total+value,0);

export type FuelLinerGrid={radiusEdgesM:number[];radiusCentersM:number[];volumesM3:number[];massesKg:number[];lengthM:number};
export type FuelLinerState={cellEnergyJ:number[];temperatureK:number[];radiusM:number[];meanK:number;innerK:number;outerK:number;energyJ:number;minK:number;maxK:number};
export type FuelLinerBoundary={gasWallWK:number;coolingWK:number;coolantK:number};

function temperature(value:number){
 if(!Number.isFinite(value)||value<FUEL_LINER_MIN_K||value>FUEL_LINER_MAX_K)
  throw new RangeError('Solid tungsten liner supports 300–1900 K; refine the step or change the thermal setup.');
}
function meanHeatCapacity(a:number,b:number){
 return (A+B*(a+b)/2+C*(a*a+a*b+b*b)/3+D*(a**3+a*a*b+a*b*b+b**3)/4+E/(a*b))/MOLAR_KG;
}
function enthalpy(value:number){return (value-FUEL_LINER_MIN_K)*meanHeatCapacity(value,FUEL_LINER_MIN_K);}

export function tungstenThermalProperties(value:number){
 temperature(value);
 return {conductivityWMK:149.441-.045466*value+13.193e-6*value**2-1.484e-9*value**3+3.866e6/value**2,
  heatCapacityJKgK:(A+B*value+C*value**2+D*value**3+E/value**2)/MOLAR_KG,
  specificEnthalpyJKg:enthalpy(value)};
}

/** Specific enthalpy is measured from 300 K, rather than Cp(T) times T. */
export function invertTungstenEnthalpy(value:number){
 const maximum=enthalpy(FUEL_LINER_MAX_K);
 if(!Number.isFinite(value)||value<0||value>maximum*(1+8*Number.EPSILON))
  throw new RangeError('Liner enthalpy is outside the solid tungsten 300–1900 K domain.');
 // Multiplying by a cell mass and dividing it out can round one ULP above Hmax.
 if(value>=maximum)return FUEL_LINER_MAX_K;
 let lo=FUEL_LINER_MIN_K,hi=FUEL_LINER_MAX_K,t=lo+(hi-lo)*value/enthalpy(hi);
 for(let i=0;i<40;i++){
  const residual=enthalpy(t)-value;
  if(Math.abs(residual)<=2e-10+2e-14*Math.abs(value))return t;
  if(residual>0)hi=t;else lo=t;
  const next=t-residual/tungstenThermalProperties(t).heatCapacityJKgK;
  t=next>lo&&next<hi?next:(lo+hi)/2;
 }
 throw new RangeError('Tungsten enthalpy inversion did not converge.');
}

/** Explicit or uniform radial cells, logarithmic centers and exact annular volumes. */
export function createFuelLiner({radiusM,lengthM,thicknessM,cells,radiusEdgesM:edges}:{radiusM:number;lengthM:number;thicknessM:number;cells:number;radiusEdgesM?:readonly number[]}):FuelLinerGrid{
 if([radiusM,lengthM,thicknessM].some(value=>!Number.isFinite(value)||value<=0)||!Number.isSafeInteger(cells)||cells<2||cells>128)
  throw new RangeError('Liner geometry must be positive, with 2–128 radial cells.');
 if(edges!==undefined&&!Array.isArray(edges))throw new RangeError('Explicit liner edges must be an array.');
 const radiusEdgesM=edges===undefined?Array.from({length:cells+1},(_,i)=>radiusM+thicknessM*i/cells):[...edges];
 if(radiusEdgesM.length!==cells+1||edges!==undefined&&(radiusEdgesM[0]!==radiusM||radiusEdgesM[cells]!==radiusM+thicknessM)||
  radiusEdgesM.some((value,i)=>!Number.isFinite(value)||i>0&&value<=radiusEdgesM[i-1]))
  throw new RangeError('Liner edges must strictly increase across the specified full annulus.');
 const radiusCentersM=Array.from({length:cells},(_,i)=>Math.sqrt(radiusEdgesM[i]*radiusEdgesM[i+1]));
 const volumesM3=radiusCentersM.map((_,i)=>Math.PI*lengthM*(radiusEdgesM[i+1]-radiusEdgesM[i])*(radiusEdgesM[i+1]+radiusEdgesM[i]));
 if(volumesM3.some(value=>!Number.isFinite(value)||value<=0))throw new RangeError('Liner cells exceed the floating-point geometry domain.');
 return {radiusEdgesM,radiusCentersM,volumesM3,massesKg:volumesM3.map(value=>DENSITY_KGM3*value),lengthM};
}

export function initialFuelLinerEnergy(grid:FuelLinerGrid,value:number){
 const h=tungstenThermalProperties(value).specificEnthalpyJKg;return grid.massesKg.map(mass=>mass*h);
}

export function fuelLinerState(grid:FuelLinerGrid,cellEnergyJ:readonly number[]):FuelLinerState{
 if(cellEnergyJ.length!==grid.massesKg.length)throw new RangeError('Liner energy state must match its radial grid.');
 const temperatureK=cellEnergyJ.map((energy,i)=>invertTungstenEnthalpy(energy/grid.massesKg[i]));
 return {cellEnergyJ:[...cellEnergyJ],temperatureK,radiusM:[...grid.radiusCentersM],
  meanK:sum(temperatureK.map((value,i)=>value*grid.massesKg[i]))/sum(grid.massesKg),
  innerK:temperatureK[0],outerK:temperatureK.at(-1)!,energyJ:sum(cellEnergyJ),minK:Math.min(...temperatureK),maxK:Math.max(...temperatureK)};
}

export function conductances(grid:FuelLinerGrid,values:readonly number[],boundary:FuelLinerBoundary){
 const {radiusEdgesM:r,radiusCentersM:x,lengthM}=grid,n=x.length;
 const k=values.map(value=>tungstenThermalProperties(value).conductivityWMK),factor=2*Math.PI*lengthM;
 const internal=x.slice(0,-1).map((_,i)=>factor/(Math.log(r[i+1]/x[i])/k[i]+Math.log(x[i+1]/r[i+1])/k[i+1]));
 const inner=boundary.gasWallWK===0?0:1/(1/boundary.gasWallWK+Math.log(x[0]/r[0])/(factor*k[0]));
 const outer=boundary.coolingWK===0?0:1/(1/boundary.coolingWK+Math.log(r[n]/x[n-1])/(factor*k[n-1]));
 return {internal,inner,outer};
}

type HeatSource<T>={gasEnergyJ:number;dragEnergyJ:number;payload:T};

/** Shared enthalpy/M-matrix kernel. With a gas node, the boundary exchange is an
 * internal equal-and-opposite flux, rather than a nested temperature bracket. */
function advanceThermal<T>(grid:FuelLinerGrid,oldCellEnergyJ:readonly number[],oldGasK:number,gasCapacityJK:number|undefined,dtS:number,boundary:FuelLinerBoundary,sourceAtGasTemperature:(gasK:number)=>HeatSource<T>){
 if(!Number.isFinite(oldGasK)||oldGasK<=0||!Number.isFinite(boundary.coolantK)||boundary.coolantK<=0||
  [boundary.gasWallWK,boundary.coolingWK,dtS].some(value=>!Number.isFinite(value)||value<0)||
  gasCapacityJK!==undefined&&(!Number.isFinite(gasCapacityJK)||gasCapacityJK<=0))
  throw new RangeError('Thermal temperatures/capacities must be positive and conductances/time nonnegative.');
 const old=fuelLinerState(grid,oldCellEnergyJ),offset=gasCapacityJK===undefined?0:1;
 const oldValues=offset?[oldGasK,...old.temperatureK]:old.temperatureK,n=oldValues.length;
 let values=[...oldValues],previousGasK:number|undefined,previousGasHeatJ:number|undefined;
 const scale=oldValues.map((value,i)=>i<offset?gasCapacityJK!*value:grid.massesKg[i-offset]*tungstenThermalProperties(value).heatCapacityJKgK*value);
 for(let iteration=1;iteration<=160;iteration++){
  const gasK=offset?values[0]:oldGasK,source=sourceAtGasTemperature(gasK);
  if(!Number.isFinite(source.gasEnergyJ)||!Number.isFinite(source.dragEnergyJ)||source.dragEnergyJ<0)
   throw new RangeError('Thermal deposition must be finite, with nonnegative wall drag heat.');
  if(dtS===0){
   if(source.gasEnergyJ!==0||source.dragEnergyJ!==0)throw new RangeError('A zero-time thermal step cannot deposit heat.');
   return {...old,gasK,gasExchangeJ:0,coolingEnergyJ:0,residualJ:0,payload:source.payload,iterations:0};
  }
  const g=conductances(grid,values.slice(offset),boundary),inner=dtS*g.inner,outer=dtS*g.outer;
  const links=(offset?[inner,...g.internal.map(value=>dtS*value)]:g.internal.map(value=>dtS*value));
  const changes=values.map((value,i)=>i<offset?gasCapacityJK!*(value-oldGasK):grid.massesKg[i-offset]*(value-oldValues[i])*meanHeatCapacity(value,oldValues[i]));
  const gasExchangeJ=inner*(gasK-values[offset]),coolingEnergyJ=outer*(values[n-1]-boundary.coolantK),residual=[...changes],fluxScale=Array<number>(n).fill(0);
  residual[offset]-=source.dragEnergyJ;fluxScale[offset]+=Math.abs(source.dragEnergyJ);
  if(offset){residual[0]-=source.gasEnergyJ;fluxScale[0]+=Math.abs(source.gasEnergyJ);}
  else{residual[0]-=gasExchangeJ;fluxScale[0]+=Math.abs(gasExchangeJ);}
  residual[n-1]+=coolingEnergyJ;fluxScale[n-1]+=Math.abs(coolingEnergyJ);
  for(let i=0;i<n-1;i++){
   const heat=links[i]*(values[i]-values[i+1]);residual[i]+=heat;residual[i+1]-=heat;
   fluxScale[i]+=Math.abs(heat);fluxScale[i+1]+=Math.abs(heat);
  }
  if(residual.every((value,i)=>{
   const conductance=(i?links[i-1]:0)+(i<n-1?links[i]:0)+(offset===0&&i===0?inner:0)+(i===n-1?outer:0);
   const roundoff=8*Number.EPSILON*conductance*Math.max(...values,oldGasK,boundary.coolantK);
   return Math.abs(value)<=2e-12*(scale[i]+fluxScale[i])+roundoff;
  })){
   const cellEnergyJ=values.slice(offset).map((value,i)=>grid.massesKg[i]*enthalpy(value)),state=fuelLinerState(grid,cellEnergyJ);
   const residualJ=sum(changes)-(offset?source.gasEnergyJ:gasExchangeJ)-source.dragEnergyJ+coolingEnergyJ;
   if(Math.abs(residualJ)>2e-10*(sum(scale)+sum(fluxScale)))throw new RangeError('Thermal step failed energy conservation.');
   return {...state,gasK,gasExchangeJ,coolingEnergyJ,residualJ,payload:source.payload,iterations:iteration};
  }
  // Implicitly linearize negative source feedback from successive callback
  // evaluations. This preserves the M-matrix and avoids a noncontractive heat
  // source Picard iteration, without finite-difference mechanical solves.
  const slope=offset&&previousGasK!==undefined&&previousGasHeatJ!==undefined&&Math.abs(gasK-previousGasK)>1e-12*Math.max(1,gasK)?
   Math.min(0,(source.gasEnergyJ-previousGasHeatJ)/(gasK-previousGasK)):0;
  if(!Number.isFinite(slope))throw new RangeError('Thermal source feedback exceeds the floating-point domain.');
  previousGasK=gasK;previousGasHeatJ=source.gasEnergyJ;
  const capacity=values.map((value,i)=>i<offset?gasCapacityJK!-slope:grid.massesKg[i-offset]*meanHeatCapacity(value,oldValues[i]));
  // Solve temperature increments: an exactly uniform equilibrium has a zero RHS,
  // avoiding roundoff-driven excursions at the material-domain endpoints.
  const diagonal:number[]=[],rhs:number[]=[];let retained=1;
  for(let i=0;i<n;i++){
   const left=i?links[i-1]:0,right=i<n-1?links[i]:0,b=(offset===0&&i===0?inner:0)+(i===n-1?outer:0);
   const remainder=capacity[i]+b+left*retained,pivot=remainder+right;
   if(!Number.isFinite(pivot)||pivot<=0)throw new RangeError('Thermal stiffness exceeds the floating-point domain.');
   const input=(i===offset?source.dragEnergyJ:0)+(offset&&i===0?source.gasEnergyJ-slope*(gasK-oldGasK):0)+
    (offset===0&&i===0?inner*(oldGasK-oldValues[i]):0)+(i===n-1?outer*(boundary.coolantK-oldValues[i]):0)+
    (i?left*(oldValues[i-1]-oldValues[i]):0)+(i<n-1?right*(oldValues[i+1]-oldValues[i]):0);
   diagonal.push(pivot);rhs.push(input+(i?left*rhs[i-1]/diagonal[i-1]:0));retained=remainder/pivot;
  }
  const increment=Array<number>(n);increment[n-1]=rhs[n-1]/diagonal[n-1];
  for(let i=n-2;i>=0;i--)increment[i]=(rhs[i]+links[i]*increment[i+1])/diagonal[i];
  const next=increment.map((value,i)=>oldValues[i]+value);
  let damping=1;
  for(let i=0;i<n;i++){
   const delta=next[i]-values[i];
   if(i>=offset&&delta>0)damping=Math.min(damping,.9*(FUEL_LINER_MAX_K-values[i])/delta);
   if(delta<0)damping=Math.min(damping,.9*(values[i]-(i<offset?0:FUEL_LINER_MIN_K))/-delta);
  }
  if(!Number.isFinite(damping)||damping<=0)throw new RangeError('Thermal solution leaves the positive-gas / 300–1900 K solid domain.');
  values=next.map((value,i)=>values[i]+damping*(value-values[i]));
 }
 throw new RangeError('Nonlinear thermal enthalpy solve did not converge within the positive-gas / 300–1900 K solid domain.');
}

/** Fixed gas reservoir, used also by independent solid-conduction benchmarks.
 * Film values are total W/K, with logarithmic half-shell resistance in series.
 * Drag heat enters the innermost cell; innerK/outerK are cell-center temperatures.
 */
export function advanceFuelLiner(grid:FuelLinerGrid,oldCellEnergyJ:readonly number[],gasK:number,dragEnergyJ:number,dtS:number,boundary:FuelLinerBoundary){
 return advanceThermal(grid,oldCellEnergyJ,gasK,undefined,dtS,boundary,()=>({gasEnergyJ:0,dragEnergyJ,payload:undefined}));
}

/** Coupled lumped neutral gas and spatial solid liner. The callback deposits
 * slip + signed redistribution + resistive heat into gas and drag into liner.
 * It is re-evaluated at the endpoint gas temperature before accepting a step.
 */
export function advanceFuelThermal<T>(grid:FuelLinerGrid,oldCellEnergyJ:readonly number[],oldGasK:number,gasCapacityJK:number,dtS:number,boundary:FuelLinerBoundary,sourceAtGasTemperature:(gasK:number)=>HeatSource<T>){
 return advanceThermal(grid,oldCellEnergyJ,oldGasK,gasCapacityJK,dtS,boundary,sourceAtGasTemperature);
}

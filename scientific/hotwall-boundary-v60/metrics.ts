/** Scientific comparison utilities, not a pointwise temperature interpolator.
 * Canonical cell integrals are piecewise constant in y=r²/R². Project them
 * onto the same physical annuli before constructing intensive quantities. */
const K=1.380649e-23;

export function projectEqualVolume(values:readonly number[],targetCells:number):number[]{
 if(values.length===0||values.some(v=>!Number.isFinite(v))||!Number.isSafeInteger(targetCells)||targetCells<1)
  throw new RangeError('Projection needs finite cell integrals and a positive integer target grid.');
 const n=values.length,result=Array<number>(targetCells).fill(0);
 for(let j=0;j<targetCells;j++){
  const lower=j/targetCells,upper=(j+1)/targetCells;
  for(let i=Math.floor(lower*n);i<n&&i/n<upper;i++){
   const overlap=Math.min(upper,(i+1)/n)-Math.max(lower,i/n);
   if(overlap>0)result[j]+=values[i]*n*overlap;
  }
 }
 return result;
}

type GasIntegrals={lightMass:readonly number[];heavyMass:readonly number[];cellEnergyJ:readonly number[]};
export function projectGasState(state:GasIntegrals,targetCells:number,number:number,lightFraction:number){
 if(!Number.isFinite(number)||number<=0||!Number.isFinite(lightFraction)||lightFraction<0||lightFraction>1||
  state.lightMass.length!==state.heavyMass.length||state.lightMass.length!==state.cellEnergyJ.length||
  [...state.lightMass,...state.heavyMass,...state.cellEnergyJ].some(v=>v<0))
  throw new RangeError('Gas projection needs compatible nonnegative integrals and a physical particle inventory.');
 const lightMass=projectEqualVolume(state.lightMass,targetCells),heavyMass=projectEqualVolume(state.heavyMass,targetCells);
 const cellEnergyJ=projectEqualVolume(state.cellEnergyJ,targetCells);
 const temperatureK=cellEnergyJ.map((u,i)=>{
  const particles=number*(lightFraction*lightMass[i]+(1-lightFraction)*heavyMass[i]);
  if(particles<=0||u<=0)throw new RangeError('Projected gas cells need positive energy and particle count.');
  return u/(1.5*K*particles);
 });
 return {lightMass,heavyMass,cellEnergyJ,temperatureK};
}

/** Initial frozen-inventory Fourier scales. These are resolution indicators,
 * not an accuracy certificate for the evolving pressure-driven mixture. */
export function gasBoundaryScales(c:{radiusM:number;lengthM:number;pressurePa:number;initialK:number;
 conductivityWMK:number;gasWallWK:number;cells:number;timeS:number}){
 if([c.radiusM,c.lengthM,c.pressurePa,c.initialK,c.conductivityWMK].some(v=>!Number.isFinite(v)||v<=0)||
  !Number.isSafeInteger(c.cells)||c.cells<2||[c.gasWallWK,c.timeS].some(v=>!Number.isFinite(v)||v<0))
  throw new RangeError('Boundary scales need positive Fourier geometry/material and nonnegative film conductance/time.');
 const outerWidthM=c.radiusM/(c.cells*(1+Math.sqrt(1-1/c.cells)));
 const alphaM2S=c.conductivityWMK/(1.5*c.pressurePa/c.initialK),penetrationM=Math.sqrt(alphaM2S*c.timeS);
 return {outerWidthM,alphaM2S,penetrationM,penetrationCells:penetrationM/outerWidthM,
  biot:c.gasWallWK/(2*Math.PI*c.lengthM*c.conductivityWMK)};
}

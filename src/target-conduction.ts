/** One-dimensional, constant-property thermal scenarios; not calibrated LiT data. */
export interface ThermalCell {
 widthM:number;
 conductivityWMK:number;
 volumetricHeatCapacityJm3K:number;
}
export interface TargetConductionConfig {
 cells:readonly ThermalCell[];
 /** One areal contact resistance at each interior face. Omitted means perfect contact. */
 contactResistanceM2KPerW?:readonly number[];
 coolantK:number;
 backHeatTransferWM2K:number;
 backContactResistanceM2KPerW?:number;
}

/**
 * Conservative backward Euler for depth conduction, an insulated front and a
 * Robin-cooled back. Sources are W/m² integrated over EACH cell, not W/m³.
 * Returned energy is per illuminated area; multiply by beam area to obtain J.
 * Backward Euler is first order in time. Stability does not establish accuracy.
 */
export function advanceTargetConduction(config:TargetConductionConfig,
 temperatureK:readonly number[],durationS:number,depositedHeatFluxWM2:readonly number[]){
 const {cells,coolantK,backHeatTransferWM2K:h}=config,n=cells.length;
 const contact=config.contactResistanceM2KPerW??Array(Math.max(0,n-1)).fill(0);
 const backContact=config.backContactResistanceM2KPerW??0;
 if(!n||temperatureK.length!==n||depositedHeatFluxWM2.length!==n||contact.length!==n-1
  ||!Number.isFinite(durationS)||durationS<0||!Number.isFinite(coolantK)||coolantK<=0
  ||!Number.isFinite(h)||h<0||!Number.isFinite(backContact)||backContact<0
  ||contact.some(v=>!Number.isFinite(v)||v<0)
  ||temperatureK.some(v=>!Number.isFinite(v)||v<=0)
  ||depositedHeatFluxWM2.some(v=>!Number.isFinite(v)||v<0)
  ||cells.some(c=>![c.widthM,c.conductivityWMK,c.volumetricHeatCapacityJm3K].every(v=>Number.isFinite(v)&&v>0)))
  throw new RangeError('Conduction needs matching nonempty cells, positive temperatures/material properties, and nonnegative finite time, heat and boundary coefficients.');
 const capacity=cells.map(c=>c.widthM*c.volumetricHeatCapacityJm3K);
 const halfResistance=cells.map(c=>c.widthM/(2*c.conductivityWMK));
 const conductance=contact.map((r,i)=>1/(halfResistance[i]+r+halfResistance[i+1]));
 const backResistance=halfResistance[n-1]+backContact;
 // Evaluate series resistances without losing a weak convection coefficient.
 const backConductance=h===0?0:h*backResistance<1?h/(1+h*backResistance):1/(backResistance+1/h);
 if([...capacity,...halfResistance,...conductance,backResistance,backConductance].some(v=>!Number.isFinite(v))
  ||capacity.some(v=>v<=0)||halfResistance.some(v=>v<=0)||conductance.some(v=>v<=0))
  throw new RangeError('Conduction material geometry exceeds the finite numeric domain.');
 const old=temperatureK.map(t=>t-coolantK);
 const coupling=conductance.map(g=>g*durationS),backCoupling=backConductance*durationS;
 const rhs=old.map((t,i)=>capacity[i]*t+durationS*depositedHeatFluxWM2[i]);
 const pivot=capacity.slice(),eliminated=rhs.slice();
 if(![...coupling,backCoupling,...rhs].every(Number.isFinite))
  throw new RangeError('Conduction step exceeds the finite numeric domain.');
 pivot[n-1]+=backCoupling;
 // Positive Schur-complement form avoids subtracting nearly equal diagonal
 // diffusion terms when a thin layer equilibrates much faster than the step.
 for(let i=1;i<n;i++){
  const g=coupling[i-1],denominator=pivot[i-1]+g;
  if(!Number.isFinite(denominator)||denominator<=0)throw new RangeError('Conduction solve exceeds the finite numeric domain.');
  const fraction=g/denominator;
  eliminated[i]+=fraction*eliminated[i-1];
  pivot[i]+=g*(pivot[i-1]/denominator);
 }
 if([...pivot,...eliminated].some(v=>!Number.isFinite(v))||pivot.some(v=>v<=0))
  throw new RangeError('Conduction solve exceeds the finite numeric domain.');
 const next=Array<number>(n);
 next[n-1]=eliminated[n-1]/pivot[n-1];
 for(let i=n-2;i>=0;i--)next[i]=(eliminated[i]+coupling[i]*next[i+1])/(pivot[i]+coupling[i]);
 const result=durationS===0?[...temperatureK]:next.map(t=>coolantK+t);
 const faceFluxWM2=[0,...conductance.map((g,i)=>g*(next[i]-next[i+1])),backConductance*next[n-1]];
 const depositedJm2=durationS*depositedHeatFluxWM2.reduce((a,b)=>a+b,0);
 const storedChangeJm2=durationS===0?0:next.reduce((sum,t,i)=>sum+capacity[i]*(t-old[i]),0);
 const coolantJm2=durationS*faceFluxWM2[n];
 const energyResidualJm2=depositedJm2-storedChangeJm2-coolantJm2;
 if(result.some(t=>!Number.isFinite(t)||t<=0)
  ||![...faceFluxWM2,depositedJm2,storedChangeJm2,coolantJm2,energyResidualJm2].every(Number.isFinite))
  throw new RangeError('Conduction result exceeds the finite positive-temperature domain.');
 return {temperatureK:result,faceFluxWM2,depositedJm2,storedChangeJm2,coolantJm2,energyResidualJm2};
}

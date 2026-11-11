/** External well-mixed coating balance. This is deliberately separate from
 * the fixed-host depth solver: no unresolved moving-interface remap or thermal
 * coupling is implied. All fluxes, loading and thermal inputs are assumptions.
 */
export interface LithiumCoatingState {
 lithiumColumnM2:number;tritiumColumnM2:number;deuteriumColumnM2:number;sensibleEnergyJm2:number;
}
export interface LithiumCoatingConfig {
 lithiumNumberDensityM3:number;heatCapacityPerLiJK:number;referenceK:number;
 depositionFluxM2S:number;erosionFluxM2S:number;
 depositedTritiumPerLi:number;depositedDeuteriumPerLi:number;depositionTemperatureK:number;
}
export const DEFAULT_LITHIUM_COATING_FLUX={depositionFluxM2S:0,erosionFluxM2S:0,
 depositedTritiumPerLi:0,depositedDeuteriumPerLi:0} as const;
const U_KG=1.66053906892e-27; // CODATA 2022 atomic mass constant; mass numbers below remain a scenario approximation.
export const COATING_PACKING_ROUNDOFF_BOUND=64*Number.EPSILON;

// Cancellation-safe positive remainders for the exact outgoing-mixture weights.
function exponentialRemainder(u:number){
 if(u>=.01)return u+Math.expm1(-u);
 let term=u*u/2,total=term;
 for(let k=3;k<=12;k++){term*=-u/k;total+=term;}
 return total;
}
function logarithmicRemainder(x:number,shrinking:boolean,ratio:number,r:number){
 if(Math.abs(x)>=.01)return shrinking?1-ratio*r:1-r;
 let total=0,power=-x;
 for(let k=1;k<=12;k++){total+=shrinking?power/(k*(k+1)):-power/(k+1);power*=-x;}
 return total;
}

/** Exact constant-flux solution of N'=p-e and X'=p*xIn-e*X/N.
 * Erosion samples the declared homogeneous mixture without preferential
 * sputtering. Sensible energy obeys the identical advective balance. No
 * evaporation latent heat, chemical binding, nuclear heat or beam is included.
 */
export function advanceLithiumCoating(state:LithiumCoatingState,c:LithiumCoatingConfig,dtS:number){
 const fields=[...Object.values(state),...Object.values(c),dtS];
 const packingExcess=(s:LithiumCoatingState)=>Math.max(0,s.tritiumColumnM2+s.deuteriumColumnM2-s.lithiumColumnM2)/s.lithiumColumnM2;
 if(!fields.every(Number.isFinite)||state.lithiumColumnM2<=0||state.tritiumColumnM2<0||state.deuteriumColumnM2<0
  ||packingExcess(state)>COATING_PACKING_ROUNDOFF_BOUND
  ||c.lithiumNumberDensityM3<=0||c.heatCapacityPerLiJK<=0||c.referenceK<=0||c.depositionTemperatureK<=0
  ||c.depositionFluxM2S<0||c.erosionFluxM2S<0||c.depositedTritiumPerLi<0||c.depositedDeuteriumPerLi<0
  ||c.depositedTritiumPerLi+c.depositedDeuteriumPerLi>1||dtS<0)
  throw new RangeError('Coating balance requires finite physical inputs, positive host capacity and nonnegative fluxes/loading.');
 const n0=state.lithiumColumnM2,p=c.depositionFluxM2S,e=c.erosionFluxM2S,g=p-e,n1=n0+g*dtS;
 if(!Number.isFinite(n1)||n1<=0)throw new RangeError('Coating exhaustion is a model boundary; stop before the Li host reaches zero.');
 const temperature0=c.referenceK+state.sensibleEnergyJm2/(n0*c.heatCapacityPerLiJK);
 if(!Number.isFinite(temperature0)||temperature0<=0)throw new RangeError('Coating sensible energy implies a nonpositive or nonfinite temperature.');
 const x=g*dtS/n0,ratio=n1/n0,logRatio=x<-.5?Math.log(ratio):Math.log1p(x),r=x===0?1:logRatio/x;
 const exponent=p===0?0:-p*dtS/n0*r;
 // -expm1 is accurate for almost unchanged composition and near-balanced flux.
 const mixedFraction=-Math.expm1(exponent),incomingEnergy=c.heatCapacityPerLiJK*(c.depositionTemperatureK-c.referenceK);
 const evolve=(x:number,incoming:number)=>n1*(x/n0+(incoming-x/n0)*mixedFraction);
 const deposited={lithiumM2:p*dtS,tritiumM2:p*dtS*c.depositedTritiumPerLi,deuteriumM2:p*dtS*c.depositedDeuteriumPerLi,
  sensibleEnergyJm2:p*dtS*incomingEnergy};
 const next:LithiumCoatingState=e===0||dtS===0?{lithiumColumnM2:n1,tritiumColumnM2:state.tritiumColumnM2+deposited.tritiumM2,
  deuteriumColumnM2:state.deuteriumColumnM2+deposited.deuteriumM2,sensibleEnergyJm2:state.sensibleEnergyJm2+deposited.sensibleEnergyJm2}
  :{lithiumColumnM2:n1,tritiumColumnM2:evolve(state.tritiumColumnM2,c.depositedTritiumPerLi),
   deuteriumColumnM2:evolve(state.deuteriumColumnM2,c.depositedDeuteriumPerLi),sensibleEnergyJm2:evolve(state.sensibleEnergyJm2,incomingEnergy)};
 // Erosion splits into positive initial/incoming-mixture weights A/B.
 // Algebraically B=e*dt-A; evaluating that subtraction loses rare incoming
 // isotope export when p<<e. Each branch below instead adds positive terms.
 const erodedLi=e*dtS,y=e*dtS/n0,z=p*dtS/n0;
 const initialMixtureEroded=p===0?erodedLi:n0*-Math.expm1(-y*r);
 const incomingMixtureEroded=p===0?0:n0*(x>=0
  ?y*logarithmicRemainder(x,false,ratio,r)+exponentialRemainder(y*r)
  :z*logarithmicRemainder(x,true,ratio,r)+ratio*exponentialRemainder(z*r));
 const exported=(amount:number,incoming:number)=>amount/n0*initialMixtureEroded+incoming*incomingMixtureEroded;
 const eroded=e===0||dtS===0?{lithiumM2:0,tritiumM2:0,deuteriumM2:0,sensibleEnergyJm2:0}
  :{lithiumM2:erodedLi,tritiumM2:exported(state.tritiumColumnM2,c.depositedTritiumPerLi),
   deuteriumM2:exported(state.deuteriumColumnM2,c.depositedDeuteriumPerLi),sensibleEnergyJm2:exported(state.sensibleEnergyJm2,incomingEnergy)};
 const mass=(li:number,t:number,d:number)=>(7*li+3*t+2*d)*U_KG;
 const initialMassKgm2=mass(n0,state.tritiumColumnM2,state.deuteriumColumnM2),massKgm2=mass(n1,next.tritiumColumnM2,next.deuteriumColumnM2);
 const depositedMassKgm2=mass(deposited.lithiumM2,deposited.tritiumM2,deposited.deuteriumM2),erodedMassKgm2=mass(eroded.lithiumM2,eroded.tritiumM2,eroded.deuteriumM2);
 const temperatureK=c.referenceK+next.sensibleEnergyJm2/(n1*c.heatCapacityPerLiJK),thicknessM=n1/c.lithiumNumberDensityM3;
 if(![...Object.values(next),...Object.values(deposited),...Object.values(eroded),initialMassKgm2,massKgm2,depositedMassKgm2,erodedMassKgm2,temperatureK,thicknessM].every(Number.isFinite)
  ||temperatureK<=0||thicknessM<=0||packingExcess(next)>COATING_PACKING_ROUNDOFF_BOUND)
  throw new RangeError('Coating balance exceeds the finite numeric domain.');
 return {model:'external-well-mixed-Li-coating' as const,state:next,thicknessM,temperatureK,
  massKgm2,depositedMassKgm2,erodedMassKgm2,deposited,eroded,
  packing:{relativeExcess:Math.max(packingExcess(state),packingExcess(next)),roundoffAdmissionBound:COATING_PACKING_ROUNDOFF_BOUND,populationsModified:false as const},
  residuals:{lithiumM2:n0+deposited.lithiumM2-eroded.lithiumM2-n1,
   tritiumM2:state.tritiumColumnM2+deposited.tritiumM2-eroded.tritiumM2-next.tritiumColumnM2,
   deuteriumM2:state.deuteriumColumnM2+deposited.deuteriumM2-eroded.deuteriumM2-next.deuteriumColumnM2,
   sensibleEnergyJm2:state.sensibleEnergyJm2+deposited.sensibleEnergyJm2-eroded.sensibleEnergyJm2-next.sensibleEnergyJm2,
   massKgm2:initialMassKgm2+depositedMassKgm2-erodedMassKgm2-massKgm2},
  coupling:'External inventory only; not coupled to stopping, nuclear reactions, diffusion or target conduction. No moving-interface remap is claimed.' as const,
  assumptions:['User-assumed constant Li fluxes; well-mixed nonpreferential erosion and at most one D/T per Li.',
   'Raw isotope columns are not normalized. Packing excess is admitted only within 64 machine epsilons of the Li column; larger excess rejects.',
   'Fixed user-assumed Li-site density and heat capacity per Li. Mass uses Li-7, T-3 and D-2 mass numbers.',
   'Sensible energy is relative to the supplied reference temperature. Chemical, latent, beam and reaction heat are excluded.']};
}

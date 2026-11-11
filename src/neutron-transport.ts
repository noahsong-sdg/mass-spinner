import {isotropicDiskReference} from './neutron-geometry.js';

/** Cross sections at the declared source energy; no multiplying/fission channels. */
export interface NeutronLayer {
 name:string;
 thicknessM:number;
 totalMInv:number;
 absorptionMInv:number;
 /** Probability of a recorded count conditional on a first absorption. */
 detectorEfficiency?:number;
}
export interface FirstFlightConfig {
 sourceRateS:number;
 /** No emission has no defined mean birth energy. */
 sourceEnergyMeV:number|null;
 distanceM:number;
 sampleAreaM2:number;
 layers:NeutronLayer[];
 /** Coarse midpoint count; the returned result uses twice this count. */
 angularSamples?:number;
}
export interface LayerFirstFlight {
 name:string;
 firstAbsorbed:number;
 firstScatteredUnresolved:number;
 detected:number;
}
export interface RayFirstFlight {
 uncollidedEscaped:number;
 firstAbsorbed:number;
 firstScatteredUnresolved:number;
 detected:number;
 perLayer:LayerFirstFlight[];
}

function validateLayers(layers:NeutronLayer[]){
 if(!Array.isArray(layers)||layers.length>64)throw new Error('First-flight transport permits at most 64 layers.');
 for(const layer of layers){
  if(!layer||typeof layer.name!=='string'||!layer.name.trim()
   ||![layer.thicknessM,layer.totalMInv,layer.absorptionMInv,layer.detectorEfficiency===undefined?0:layer.detectorEfficiency].every(Number.isFinite)
   ||layer.thicknessM<0||layer.totalMInv<0||layer.absorptionMInv<0
   ||layer.absorptionMInv>layer.totalMInv
   ||(layer.detectorEfficiency??0)<0||(layer.detectorEfficiency??0)>1)
   throw new Error('Layers require a name, nonnegative finite thickness/cross sections, absorption ≤ total and detection probability in [0,1].');
 }
}

function traceRay(layers:NeutronLayer[],cosine:number,frontM:number,sideExitM:number):RayFirstFlight {
 let surviving=1,absorbed=0,scattered=0,detected=0,z=frontM;
 const perLayer:LayerFirstFlight[]=[];
 for(const layer of layers){
  const axialLength=Math.min(layer.thicknessM,Math.max(0,sideExitM-z));
  const opticalDepth=layer.totalMInv*axialLength/cosine;
  const interacted=surviving*-Math.expm1(-opticalDepth);
  const absorptionShare=layer.totalMInv===0?0:layer.absorptionMInv/layer.totalMInv;
  const a=interacted*absorptionShare,s=interacted*(1-absorptionShare),d=a*(layer.detectorEfficiency??0);
  perLayer.push({name:layer.name,firstAbsorbed:a,firstScatteredUnresolved:s,detected:d});
  absorbed+=a;scattered+=s;detected+=d;
  surviving*=Math.exp(-opticalDepth);
  z+=layer.thicknessM;
 }
 return {uncollidedEscaped:surviving,firstAbsorbed:absorbed,firstScatteredUnresolved:scattered,detected,perLayer};
}

/** Infinite-lateral planar stack, conditional on one incident neutron. */
export function firstFlightRay(layers:NeutronLayer[],cosine=1):RayFirstFlight {
 validateLayers(layers);
 if(!Number.isFinite(cosine)||cosine<=0||cosine>1)throw new Error('Incident cosine must lie in (0,1].');
 return traceRay(layers,cosine,0,Infinity);
}

/** Isotropic point source and coaxial, finite-radius cylindrical slab stack.
 * Only the first interaction is resolved. A scattered neutron is retained in
 * an unresolved ledger, not treated as absorbed, escaped or detector flux.
 */
export function simulateFirstFlightNeutrons(config:FirstFlightConfig){
 const {sourceRateS,sourceEnergyMeV,distanceM,sampleAreaM2,layers}=config;
 const angularSamples=config.angularSamples===undefined?128:config.angularSamples;
 validateLayers(layers);
 const validEnergy=sourceEnergyMeV===null?sourceRateS===0:Number.isFinite(sourceEnergyMeV)&&sourceEnergyMeV>0;
 if(![sourceRateS,distanceM,sampleAreaM2].every(Number.isFinite)
  ||sourceRateS<0||!validEnergy||distanceM<0||sampleAreaM2<=0)
  throw new Error('First-flight source requires finite nonnegative rate/distance and positive energy/area.');
 if(!Number.isInteger(angularSamples)||angularSamples<8||angularSamples>4096)
  throw new Error('First-flight angular samples must be an integer from 8 to 4096.');
 if(!Number.isFinite(layers.reduce((z,layer)=>z+layer.thicknessM,distanceM)))
  throw new Error('Layer stack exceeds the finite geometric domain.');
 const geometry=isotropicDiskReference({neutronRateS:sourceRateS,distanceM,sampleAreaM2});
 function integrate(samples:number):RayFirstFlight {
  const totals:RayFirstFlight={uncollidedEscaped:0,firstAbsorbed:0,firstScatteredUnresolved:0,detected:0,
   perLayer:layers.map(layer=>({name:layer.name,firstAbsorbed:0,firstScatteredUnresolved:0,detected:0}))};
  // Isotropic direction probability is d(mu)/2. Rationalized solid-angle
  // width retains the far-field limit even when 1-mu_min rounds to zero.
  const weight=geometry.interceptedFraction/samples;
  for(let i=0;i<samples;i++){
   const delta=2*geometry.interceptedFraction*(1-(i+.5)/samples),mu=1-delta;
   // Keep the small angular offset: mu may round to 1 even though the ray
   // still reaches a side wall in a sufficiently long, narrow cylinder.
   const sine=Math.sqrt(delta*(2-delta));
   const sideExit=sine===0?Infinity:geometry.radiusM*mu/sine;
   const ray=traceRay(layers,mu,distanceM,sideExit);
   for(const key of ['uncollidedEscaped','firstAbsorbed','firstScatteredUnresolved','detected'] as const)
    totals[key]+=weight*ray[key];
   for(let j=0;j<layers.length;j++)for(const key of ['firstAbsorbed','firstScatteredUnresolved','detected'] as const)
    totals.perLayer[j][key]+=weight*ray.perLayer[j][key];
  }
  return totals;
 }
 const coarse=integrate(angularSamples),fine=integrate(2*angularSamples);
 const missed=1-geometry.interceptedFraction;
 const fractions={missed,uncollidedEscaped:fine.uncollidedEscaped,firstAbsorbed:fine.firstAbsorbed,
  firstScatteredUnresolved:fine.firstScatteredUnresolved};
 const rates={missed:sourceRateS*missed,uncollidedEscaped:sourceRateS*fine.uncollidedEscaped,
  firstAbsorbed:sourceRateS*fine.firstAbsorbed,firstScatteredUnresolved:sourceRateS*fine.firstScatteredUnresolved};
 const perLayer=fine.perLayer.map(layer=>({...layer,firstAbsorbedRateS:sourceRateS*layer.firstAbsorbed,
  firstScatteredUnresolvedRateS:sourceRateS*layer.firstScatteredUnresolved,detectionRateS:sourceRateS*layer.detected}));
 const fractionResidual=1-Object.values(fractions).reduce((sum,value)=>sum+value,0);
 const detectionRateS=sourceRateS*fine.detected;
 const doubledSamplesMaxFractionChange=Math.max(...(['uncollidedEscaped','firstAbsorbed','firstScatteredUnresolved','detected'] as const)
  .map(key=>Math.abs(fine[key]-coarse[key])));
 if(![...Object.values(fractions),...Object.values(rates),detectionRateS,fractionResidual,doubledSamplesMaxFractionChange,
  ...perLayer.flatMap(layer=>[layer.firstAbsorbedRateS,layer.firstScatteredUnresolvedRateS,layer.detectionRateS])].every(Number.isFinite))
  throw new Error('First-flight result exceeds the finite numeric domain.');
 return {model:'finite-cylinder-first-flight' as const,config:{...config,angularSamples},geometry,fractions,rates,
  perLayer,detectionRateS,fractionResidual,sourceEnergyMeV,
  convergence:{angularSamples:2*angularSamples,doubledSamplesMaxFractionChange},
  assumptions:[
   'Isotropic monoenergetic point source on axis. Layers share the circular entrance radius; straight rays may leave the cylindrical side wall.',
   'User-supplied macroscopic total/absorption cross sections apply at the declared source energy. Total = nonmultiplying scattering + absorption; fission and neutron multiplication are unsupported.',
   'Only first interactions are resolved. First-scattered neutrons remain unresolved; they may subsequently escape, be absorbed or reach a detector. These outputs are not total flux or a complete shielding calculation.',
   'Detection is an assumed conditional probability per first absorption. It excludes scattered-neutron response, background, dead time and electronics.',
   'The source energy labels uncollided neutrons. No outgoing energy spectrum, secondary photons, deposited heat, activation, dose or displacement damage is predicted.',
   'The doubled midpoint comparison estimates angular discretization sensitivity; it is not a certified error bound or nuclear-data uncertainty.',
  ]};
}

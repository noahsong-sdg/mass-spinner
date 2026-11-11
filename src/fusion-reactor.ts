import {E_CHARGE} from './physics.js';
import {litStoppingCrossSection} from './deuteron-stopping.js';

/** Beam/target teaching model, not a Marathon device prediction. */
export interface FusionBeamConfig {
 beamEnergyKeV:number;
 /** Singly charged D+ current; molecular ions are not included. */
 beamCurrentA:number;
 /** Tritium nuclei per square metre, independent of the stopping matrix. */
 targetColumnM2:number;
 /** Imposed fractional energy loss across the modeled slab, not fitted LiT data. */
 stoppingFraction:number;
 beamAreaM2:number;
 alphaDepositedFraction:number;
 acceleratorEfficiency:number;
 exposureS:number;
 intervals?:number;
 /** Optional fixed 1:1 Li/T stopping matrix; not measured compound data. */
 stoppingModel?:'linear'|'geant4-bragg';
 materialColumnM2?:number;
}
export const DEFAULT_FUSION_BEAM: FusionBeamConfig={beamEnergyKeV:100,beamCurrentA:.01,
 targetColumnM2:1e22,stoppingFraction:.2,beamAreaM2:.01,alphaDepositedFraction:1,
 acceleratorEfficiency:.8,exposureS:10,intervals:400};
const KEV_J=1000*E_CHARGE,Q_KEV=17600;
export class MaterialSlabDomainError extends RangeError {}
export class DTCrossSectionDomainError extends RangeError {}

/** Bosch–Hale low-energy D(T,n)α fit, E in centre-of-mass keV, output m².
 * Eq. 8/Table IV, Nucl. Fusion 32 (1992) 611; also ASCOT5 boschhale.c.
 * This implementation rejects extrapolation rather than inventing a rate floor.
 */
export function dtCrossSectionM2(energyCMKeV:number):number{
 if(!Number.isFinite(energyCMKeV)||energyCMKeV<.5||energyCMKeV>550)
  throw new DTCrossSectionDomainError('D–T cross-section fit requires 0.5–550 keV centre-of-mass energy.');
 const e=energyCMKeV;
 const s=(6.927e4+e*(7.454e8+e*(2.050e6+e*5.2002e4)))
  /(1+e*(6.38e1+e*(-9.95e-1+e*(6.981e-5+e*1.728e-4))));
 return s/e*Math.exp(-34.3827/Math.sqrt(e))*1e-31; // millibarn → m²
}

interface BeamProfile {
 depthFraction:number;energyKeV:number;survivingFraction:number;fusionProbability:number;
}
/** Conditional mean u in [0,1] for exponential attenuation exp(-tau*u). */
function meanReactionPosition(tau:number){
 return tau<1e-3?.5-tau/12+tau**3/720:1/tau-1/Math.expm1(tau);
}

export function simulateFusionBeam(config:FusionBeamConfig){
 const c={...config,intervals:config.intervals??400};
 const material=c.stoppingModel==='geant4-bragg';
 const sites=material?c.materialColumnM2!:c.targetColumnM2;
 if((c.stoppingModel!==undefined&&!['linear','geant4-bragg'].includes(c.stoppingModel))
  ||material&&(!Number.isFinite(sites)||sites<=0||c.targetColumnM2>sites))
  throw new Error('Material stopping needs a positive formula-unit column and a tritium column no larger than its site inventory.');
 const {beamEnergyKeV:e0,beamCurrentA:current,targetColumnM2:column,stoppingFraction:loss,
  beamAreaM2:area,alphaDepositedFraction:alphaFraction,acceleratorEfficiency:efficiency,
  exposureS:exposure,intervals:n}=c;
 if(![e0,current,column,loss,area,alphaFraction,efficiency,exposure].every(Number.isFinite)
  ||e0<=0||current<0||column<0||loss<0||loss>=1||area<=0
  ||alphaFraction<0||alphaFraction>1||efficiency<=0||efficiency>1||exposure<0
  ||!Number.isInteger(n)||n<10||n>6400)
  throw new Error('Beam model needs finite physical inputs, positive area/efficiency, and 10–6400 slab intervals.');
 // The whole prescribed slowing trajectory must remain in the sourced fit.
 dtCrossSectionM2(.6*e0);if(!material)dtCrossSectionM2(.6*e0*(1-loss));
 const dColumn=column/n,dSites=sites/n;
 let energy=e0,survival=1,probability=0,stoppedKeV=0,reactionBeamKeV=0,opticalDepth=0,unitLoadingOpticalDepth=0;
 const profiles:BeamProfile[]=[{depthFraction:0,energyKeV:e0,survivingFraction:1,fusionProbability:0}];
 for(let i=0;i<n;i++){
  const leftE=energy;
  if(material){
   // RK4 advances dE/dN_formula = −S(E). Every stage must stay in the
   // cross-section domain; a stopped/sub-cutoff tail is not silently omitted.
   const slope=(e:number)=>{
    if(e<.5/.6)throw new MaterialSlabDomainError('Material slab exits the D–T fit domain. Reduce formula-unit column or increase beam energy; the sub-cutoff tail is unresolved.');
    return -litStoppingCrossSection(e).totalKeVM2;
   };
   const a=slope(leftE),b=slope(leftE+dSites*a/2),d=slope(leftE+dSites*b/2),f=slope(leftE+dSites*d);
   energy=leftE+dSites*(a+2*b+2*d+f)/6;
   slope(energy);
  }else energy=e0-(i+1)*e0*loss/n;
  const dE=leftE-energy,sigma=dtCrossSectionM2(.6*(leftE+energy)/2),tau=dColumn*sigma;
  opticalDepth+=tau;unitLoadingOpticalDepth+=dSites*sigma;
  const attenuation=-Math.expm1(-tau),reacted=survival*attenuation;
  // Piecewise-constant hazard, linear energy: these integrals conserve beam
  // energy within each slab rather than assigning every reaction to a midpoint.
  stoppedKeV+=dE*survival*(tau===0?1:attenuation/tau);
  reactionBeamKeV+=reacted*(leftE-dE*meanReactionPosition(tau));
  probability+=reacted;survival*=Math.exp(-tau);
  profiles.push({depthFraction:(i+1)/n,energyKeV:energy,
   survivingFraction:survival,fusionProbability:probability});
 }
 const particleRate=current/E_CHARGE,neutronRateS=particleRate*probability;
 const beamPowerW=particleRate*e0*KEV_J,nuclearPowerW=neutronRateS*Q_KEV*KEV_J;
 // Nonrelativistic mass-number (D=2,T=3,n=1,α=4), isotropic-CM mean energies:
 // Ecm=.6E, Etranslation=.4E; En=.8Q+.56E and Eα=.2Q+.44E.
 const neutronPowerW=particleRate*(.8*Q_KEV*probability+.56*reactionBeamKeV)*KEV_J;
 const alphaPowerW=particleRate*(.2*Q_KEV*probability+.44*reactionBeamKeV)*KEV_J;
 const beamStoppingPowerW=particleRate*stoppedKeV*KEV_J;
 const transmittedBeamPowerW=particleRate*survival*energy*KEV_J;
 const targetLayerHeatW=beamStoppingPowerW+alphaFraction*alphaPowerW;
 const escapingAlphaPowerW=(1-alphaFraction)*alphaPowerW;
 const ledgerOutW=targetLayerHeatW+escapingAlphaPowerW+transmittedBeamPowerW+neutronPowerW;
 const energyResidualW=beamPowerW+nuclearPowerW-ledgerOutW;
 const curves=[
  {label:'Surviving D+ beam',x:profiles.map(p=>p.depthFraction),y:profiles.map(p=>p.survivingFraction),xLabel:material?'Fraction of fixed material column':'Fraction of target column',yLabel:'Fraction of incident deuterons'},
  {label:'Cumulative D–T reactions',x:profiles.map(p=>p.depthFraction),y:profiles.map(p=>p.fusionProbability),xLabel:material?'Fraction of fixed material column':'Fraction of target column',yLabel:'Fusion probability per incident deuteron'},
  {label:material?'Bragg-additive stopping estimate':'Prescribed slowing',x:profiles.map(p=>p.depthFraction),y:profiles.map(p=>p.energyKeV),xLabel:material?'Fraction of fixed material column':'Fraction of target column',yLabel:'Deuteron laboratory energy (keV)'},
  {label:'Bosch–Hale D–T cross section',x:Array.from({length:201},(_,i)=>1+899*i/200),
   y:Array.from({length:201},(_,i)=>dtCrossSectionM2(.6*(1+899*i/200))/1e-28),xLabel:'Deuteron laboratory energy (keV)',yLabel:'D–T cross section (barn)'},
 ];
 const result={model:'beam-target-teaching' as const,config:c,profiles,curves,particleRateS:particleRate,
  siteColumnM2:sites,opticalDepth,unitLoadingOpticalDepth,exitEnergyKeV:energy,
  energyCMKeV:.6*e0,incidentCrossSectionM2:dtCrossSectionM2(.6*e0),fusionProbability:probability,
  transmittedFraction:survival,neutronRateS,totalNeutrons:neutronRateS*exposure,
  beamPowerW,wallPlugPowerW:beamPowerW/efficiency,nuclearPowerW,
  beamGain:beamPowerW>0?nuclearPowerW/beamPowerW:null,neutronPowerW,alphaPowerW,
  beamStoppingPowerW,targetLayerHeatW,targetLayerHeatFluxWM2:targetLayerHeatW/area,
  assemblyHeatIfTransmittedBeamStoppedW:targetLayerHeatW+transmittedBeamPowerW,
  transmittedBeamPowerW,escapingAlphaPowerW,energyResidualW,
  relativeEnergyResidual:beamPowerW+nuclearPowerW>0?energyResidualW/(beamPowerW+nuclearPowerW):null,
  assumptions:[
   'Educational beam-target model inspired by the publicly described D+ → lithium-tritide architecture; no Marathon operating point or digital twin is claimed.',
   'The default current, target column, energy loss, area, efficiency and alpha deposition are illustrative inputs, not Marathon measurements.',
   'Cold stationary tritium; monoenergetic singly charged D+; Ecm=3/5 Elab. No molecular-ion, beam-spread, angular-scattering or target-depletion model.',
   material?'Energy evolves through a fixed 1:1 Li/T matrix using a Geant4-derived Bragg-additive electronic plus nuclear stopping estimate. Compound chemistry, straggling and angular scattering are omitted; it is not measured LiT data. Target isotope replacement does not update this matrix.':
   'Energy decreases linearly across a homogeneous tritium column. This imposed stopping law is not a measured lithium-tritide stopping curve; fully stopped ions below the fit domain are unsupported.',
   'Target-layer heat includes imposed stopping and the specified deposited alpha fraction. Transmitted beam energy remains a separate output; substrate cooling, secondary electrons and sputtering are not modeled.',
   'The conditional assembly-heat output adds all transmitted beam energy as heat in a stopping substrate; it does not predict temperatures, coolant performance or target lifetime.',
   'Nuclear power is reaction Q only. Product powers also include incident energy carried into fusion. Approximate mass-number/isotropic-CM mean product energies conserve the stated energy budget.',
   'Neutron count is production only. Spatial neutron transport, detector flux, shielding, blanket breeding/transmutation, target lifetime and net electric output are not predicted.',
  ],sources:[
   'https://www.marathonfusion.com/beam-driven-fusion/',
   'https://doi.org/10.1088/0029-5515/32/4/I07',
   'https://raw.githubusercontent.com/ascot4fusion/ascot5/main/src/boschhale.c',
   ...(material?['/DEUTERON-STOPPING-LOADING.md','/GEANT4-LICENSE.txt']:[]),
  ]};
 if(Object.values(result).some(v=>typeof v==='number'&&!Number.isFinite(v)))
  throw new Error('Beam calculation exceeds the representable finite numeric domain.');
 return result;
}

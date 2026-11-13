import {E_CHARGE} from '/work/project/v89-target-radau-20261113a/src/physics.js';
import {dtCrossSectionM2,type FusionBeamConfig} from '/work/project/v89-target-radau-20261113a/src/fusion-reactor.js';
import {stoppingForComposition,normalizeImplantationWeights} from '/work/project/v89-target-radau-20261113a/src/target-material.js';
import {advanceTargetConduction,type TargetConductionConfig} from '/work/project/v89-target-radau-20261113a/src/target-conduction.js';
import {resolveMaterialGeometry,DT_ONLY_OUTPUT} from '/work/project/v89-target-radau-20261113a/src/material-realism.js';

/** Scenario coefficients, not calibrated LiT properties or Marathon dimensions. */
export interface CoupledTargetConfig {
 depthCells:number;backingCells:number;filmThicknessM:number;filmConductivityWMK:number;filmHeatCapacityJm3K:number;
 backingThicknessM:number;backingConductivityWMK:number;backingHeatCapacityJm3K:number;
 contactResistanceM2KPerW:number;backHeatTransferWM2K:number;coolantK:number;initialK:number;
 replacementProbability:number;implantationWeights?:readonly number[];
 /** Arrhenius prefactors and activation energies, supplied as scenario inputs. */
 diffusivityM2S:number;diffusionActivationEV:number;releaseAttemptRateS:number;releaseActivationEV:number;
 surfaceReleaseVelocityMS:number;surfaceReleaseActivationEV:number;
 backPermeationVelocityMS:number;backPermeationActivationEV:number;
 renewalRateS:number;renewalTritiumFraction:number;
 pulsePeriodS:number;pulseDuty:number;cooldownS:number;
 relativeTolerance:number;absoluteTolerance:number;maxStepS:number;samples:number;
}
export const DEFAULT_COUPLED_TARGET:CoupledTargetConfig={
 depthCells:8,backingCells:4,filmThicknessM:1e-6,filmConductivityWMK:5,filmHeatCapacityJm3K:2e6,
 backingThicknessM:.001,backingConductivityWMK:100,backingHeatCapacityJm3K:3e6,
 contactResistanceM2KPerW:0,backHeatTransferWM2K:5000,coolantK:293.15,initialK:293.15,
 replacementProbability:0,diffusivityM2S:0,diffusionActivationEV:0,
 releaseAttemptRateS:0,releaseActivationEV:0,surfaceReleaseVelocityMS:0,surfaceReleaseActivationEV:0,
 backPermeationVelocityMS:0,backPermeationActivationEV:0,renewalRateS:0,renewalTritiumFraction:1,
 pulsePeriodS:1,pulseDuty:1,cooldownS:5,relativeTolerance:1e-4,absoluteTolerance:1e-8,maxStepS:.2,samples:80,
};

const KEV_J=1000*E_CHARGE,KB_EV=8.617333262145e-5,Q_KEV=17600;
interface State {
 t:number[];d:number[];v:number[];temperature:number[];
 fused:number;incident:number;retained:number;unretained:number;releasedT:number;releasedD:number;
 addedT:number;addedD:number;beamOnS:number;
 incidentEnergy:number;nuclearEnergy:number;depositedEnergy:number;neutronEnergy:number;escapingAlphaEnergy:number;coolantEnergy:number;
}
interface BeamPlan {reaction:number[];heat:number[];neutron:number;alphaEscape:number;probability:number}
/** Eliminate a massless internal face carrying heat Q. With resistances RL/RR,
 * Tface=(Q+TL/RL+TR/RR)/(1/RL+1/RR). Its Q forcing reaches the left
 * node as Q*RR/(RL+RR), and right as Q*RL/(RL+RR); conductance is unchanged.
 * Backing-side absorption puts the contact resistance in RL, not RR.
 */
export function splitInterfaceHeat(leftResistance:number,rightResistance:number){
 if(![leftResistance,rightResistance].every(r=>Number.isFinite(r)&&r>0)||!Number.isFinite(leftResistance+rightResistance))
  throw new RangeError('Interface heat needs positive finite half-cell resistances.');
 return {leftFraction:rightResistance/(leftResistance+rightResistance),rightFraction:leftResistance/(leftResistance+rightResistance)};
}
const sum=(v:readonly number[])=>v.reduce((a,b)=>a+b,0);
const meanPosition=(tau:number)=>tau<1e-3?.5-tau/12+tau**3/720:1/tau-1/Math.expm1(tau);

/** Conservative positive tridiagonal solve for a no-flux diffusion/linear-loss step. */
function diffuse(rhs:number[],loss:number[],faces:number[],dt:number){
 const n=rhs.length,pivot=loss.map(k=>1+dt*k),out=[...rhs],coupling=faces.map(g=>dt*g);
 if(![...pivot,...out,...coupling].every(Number.isFinite))throw new RangeError('Isotope transport step exceeds the finite numeric domain.');
 // Positive Schur form retains the small loss/time term when diffusion is
 // large, instead of subtracting nearly equal diagonal contributions.
 for(let i=1;i<n;i++){
  const denominator=pivot[i-1]+coupling[i-1];
  if(!Number.isFinite(denominator))throw new RangeError('Isotope transport solve exceeds the finite numeric domain.');
  out[i]+=coupling[i-1]/denominator*out[i-1];
  pivot[i]+=coupling[i-1]*(pivot[i-1]/denominator);
 }
 out[n-1]/=pivot[n-1];
 for(let i=n-2;i>=0;i--)out[i]=(out[i]+coupling[i]*out[i+1])/(pivot[i]+coupling[i]);
 return out;
}

/** Fixed-cell composition, RK4 energy path and midpoint reaction quadrature. */
function depthBeam(beam:FusionBeamConfig,c:CoupledTargetConfig,state:State,recordPacking:(residual:number)=>void):BeamPlan{
 const n=c.depthCells,siteStep=beam.materialColumnM2!/n/4;
 const reaction=Array(n).fill(0),heat=Array(n+c.backingCells).fill(0);
 let energy=beam.beamEnergyKeV,survival=1,neutron=0,alphaEscape=0;
 for(let i=0;i<n;i++){
  const occupied=state.t[i]+state.d[i],total=occupied+state.v[i],residual=Math.abs(total-1);
  if(![state.t[i],state.d[i],state.v[i],total].every(v=>Number.isFinite(v)&&v>=0)||total===0||residual>64*Number.EPSILON*n)
   throw new RangeError('Packing diagnosis '+JSON.stringify({i,t:state.t[i],d:state.d[i],v:state.v[i],total,residual,threshold:64*Number.EPSILON*n,n}));
  recordPacking(residual);
  // Convert raw numerical occupancies to a composition only within the
  // roundoff bound. Never modify populations or their conservation ledgers.
  const hydrogen=occupied/total,tritium=occupied===0?0:hydrogen*(state.t[i]/occupied),deuterium=hydrogen-tritium;
  for(let j=0;j<4;j++){
  const stopping=(e:number)=>stoppingForComposition(e,{tritiumFraction:tritium,deuteriumFraction:deuterium}).totalKeVM2;
  const left=energy,a=stopping(left),b=stopping(left-siteStep*a/2),d=stopping(left-siteStep*b/2),f=stopping(left-siteStep*d);
  energy=left-siteStep*(a+2*b+2*d+f)/6;stopping(energy);
  const tau=siteStep*state.t[i]*dtCrossSectionM2(.6*(left+energy)/2);
  const attenuation=-Math.expm1(-tau),reacted=survival*attenuation;
  const stopped=(left-energy)*survival*(tau===0?1:attenuation/tau);
  const reactionEnergy=reacted*(left-(left-energy)*meanPosition(tau));
  const alpha=.2*Q_KEV*reacted+.44*reactionEnergy;
  reaction[i]+=reacted;heat[i]+=stopped+beam.alphaDepositedFraction*alpha;
  neutron+=.8*Q_KEV*reacted+.56*reactionEnergy;alphaEscape+=(1-beam.alphaDepositedFraction)*alpha;
  survival*=Math.exp(-tau);
  }
 }
 const split=splitInterfaceHeat(c.filmThicknessM/n/(2*c.filmConductivityWMK)+c.contactResistanceM2KPerW,
  c.backingThicknessM/c.backingCells/(2*c.backingConductivityWMK));
 heat[n-1]+=survival*energy*split.leftFraction;
 heat[n]=survival*energy*split.rightFraction; // Explicit zero-range absorption at the backing-side interface.
 return {reaction,heat,neutron,alphaEscape,probability:sum(reaction)};
}

function conductionConfig(c:CoupledTargetConfig):TargetConductionConfig{
 const cells=Array.from({length:c.depthCells},()=>({widthM:c.filmThicknessM/c.depthCells,
  conductivityWMK:c.filmConductivityWMK,volumetricHeatCapacityJm3K:c.filmHeatCapacityJm3K}));
 for(let i=0;i<c.backingCells;i++)cells.push({widthM:c.backingThicknessM/c.backingCells,conductivityWMK:c.backingConductivityWMK,volumetricHeatCapacityJm3K:c.backingHeatCapacityJm3K});
 const contact=Array(c.depthCells+c.backingCells-1).fill(0);contact[c.depthCells-1]=c.contactResistanceM2KPerW;
 return {cells,contactResistanceM2KPerW:contact,coolantK:c.coolantK,backHeatTransferWM2K:c.backHeatTransferWM2K};
}

/** Coupled depth scenario. All coefficients and the atomic stopping closure remain conditional. */
export function simulateCoupledTarget(beam:FusionBeamConfig,config:CoupledTargetConfig={...DEFAULT_COUPLED_TARGET}){
 const c={...config},n=c.depthCells,column=beam.materialColumnM2!,area=beam.beamAreaM2;
 if(beam.stoppingModel!=='geant4-bragg')throw new RangeError('Coupled target requires explicit material stopping mode.');
 const numbers=Object.keys(DEFAULT_COUPLED_TARGET).map(k=>c[k as keyof CoupledTargetConfig]);
 if(!numbers.every(v=>typeof v==='number'&&Number.isFinite(v))||!Number.isInteger(n)||n<2||n>32||!Number.isInteger(c.backingCells)||c.backingCells<1||c.backingCells>32||!Number.isInteger(c.samples)||c.samples<10||c.samples>1000
  ||![column,area,beam.beamCurrentA,beam.beamEnergyKeV,beam.targetColumnM2,beam.exposureS,beam.alphaDepositedFraction].every(Number.isFinite)
  ||column<=0||area<=0||beam.beamCurrentA<0||beam.beamEnergyKeV<20||beam.beamEnergyKeV>500
  ||beam.targetColumnM2<0||beam.targetColumnM2>column||beam.exposureS<0||beam.alphaDepositedFraction<0||beam.alphaDepositedFraction>1
  ||[c.filmThicknessM,c.backingThicknessM,c.filmConductivityWMK,c.backingConductivityWMK,c.filmHeatCapacityJm3K,c.backingHeatCapacityJm3K,c.coolantK,c.initialK,c.pulsePeriodS,c.maxStepS].some(v=>v<=0)
  ||[c.filmConductivityWMK,c.backingConductivityWMK,c.contactResistanceM2KPerW,c.backHeatTransferWM2K,c.diffusivityM2S,c.diffusionActivationEV,c.releaseAttemptRateS,c.releaseActivationEV,c.surfaceReleaseVelocityMS,c.surfaceReleaseActivationEV,c.backPermeationVelocityMS,c.backPermeationActivationEV,c.renewalRateS,c.cooldownS].some(v=>v<0)
  ||[c.replacementProbability,c.renewalTritiumFraction,c.pulseDuty].some(v=>v<0||v>1)
  ||c.relativeTolerance<1e-7||c.relativeTolerance>1e-2||c.absoluteTolerance<1e-12||c.absoluteTolerance>1e-4
  ||Math.ceil(beam.exposureS/c.pulsePeriodS)>4096)
  throw new RangeError('Coupled target requires finite physical coefficients, valid material capacity, 2–32 depth cells, 10–1000 samples, bounded tolerances and at most 4096 pulse periods.');
 if(c.implantationWeights!==undefined&&!Array.isArray(c.implantationWeights))throw new RangeError('Implantation weights must be an array when supplied.');
 const weights=normalizeImplantationWeights(c.implantationWeights===undefined?Array(n).fill(1):c.implantationWeights);
 if(weights.length!==n)throw new RangeError('Implantation weights must match the target depth cells.');
 const flux=beam.beamCurrentA/E_CHARGE/area,dz=c.filmThicknessM/n,totalS=beam.exposureS+c.cooldownS;
 const f0=beam.targetColumnM2/column,thermal=conductionConfig(c),initialTemperature=Array(n+c.backingCells).fill(c.initialK);
 const zeros=()=>Array(n).fill(0);
 let state:State={t:Array(n).fill(f0),d:Array(n).fill(1-f0),v:zeros(),temperature:initialTemperature,
  fused:0,incident:0,retained:0,unretained:0,releasedT:0,releasedD:0,addedT:0,addedD:0,beamOnS:0,
  incidentEnergy:0,nuclearEnergy:0,depositedEnergy:0,neutronEnergy:0,escapingAlphaEnergy:0,coolantEnergy:0};
 let maxPackingRoundoff=0;
 const beamAt=(s:State)=>depthBeam(beam,c,s,r=>{maxPackingRoundoff=Math.max(maxPackingRoundoff,r);});
 const initialPlan=beamAt(state);
 // A full-loading entrance-energy reference also scales reactions that begin
 // only after renewal adds T. An exactly zero-beam channel needs no fake floor.
 const referenceProbability=-Math.expm1(-column*dtCrossSectionM2(.6*beam.beamEnergyKeV));
 const fusionScale=flux*beam.exposureS/column*Math.max(initialPlan.probability,referenceProbability);
 const atomScale=Math.max(1,flux*beam.exposureS/column),energyScale=Math.max(1,flux*beam.exposureS*beam.beamEnergyKeV*KEV_J);
 if(![flux,totalS,fusionScale,atomScale,energyScale,column*area].every(Number.isFinite))throw new RangeError('Coupled target exceeds the finite numeric domain.');
 let acceptedSteps=0,rejectedSteps=0,maxErrorRatio=0;

 function advance(s:State,dt:number,on:boolean):State|null{
  const checked=()=>{try{return beamAt(s);}catch(error){console.error(JSON.stringify({acceptedSteps,rejectedSteps,dt,on,state:s}));throw error;}};const plan=on?checked():{reaction:zeros(),heat:Array(n+c.backingCells).fill(0),neutron:0,alphaEscape:0,probability:0};
  const j=on?flux:0,fusion=plan.reaction.map(p=>dt*j*p*n/column);
  if(fusion.some((f,i)=>f>s.t[i]))return null;
  const b=weights.map(w=>j*(1-plan.probability)*c.replacementProbability*w*n/column);
  const release=s.temperature.slice(0,n).map((t,i)=>c.releaseAttemptRateS*Math.exp(-c.releaseActivationEV/(KB_EV*t))
   +(i===0?c.surfaceReleaseVelocityMS/dz*Math.exp(-c.surfaceReleaseActivationEV/(KB_EV*t)):0)
   +(i===n-1?c.backPermeationVelocityMS/dz*Math.exp(-c.backPermeationActivationEV/(KB_EV*t)):0));
  const diffusion=s.temperature.slice(0,n).map(t=>c.diffusivityM2S*Math.exp(-c.diffusionActivationEV/(KB_EV*t)));
  const faces=diffusion.slice(1).map((d,i)=>d===0||diffusion[i]===0?0:2/(1/d+1/diffusion[i])/dz**2);
  const renewal=c.renewalRateS;
  const t=diffuse(s.t.map((t,i)=>t-fusion[i]+dt*renewal*c.renewalTritiumFraction),b.map((b,i)=>b+release[i]+renewal),faces,dt);
  const d=diffuse(s.d.map(d=>d+dt*(renewal*(1-c.renewalTritiumFraction))) .map((d,i)=>d+dt*b[i]),b.map((b,i)=>b+release[i]+renewal),faces,dt);
  const v=diffuse(s.v.map((v,i)=>v+fusion[i]+dt*release[i]*(t[i]+d[i])),b.map(b=>b+renewal),faces,dt);
  if([...t,...d,...v].some(v=>v<0||!Number.isFinite(v)))return null;
  const heat=advanceTargetConduction(thermal,s.temperature,dt,plan.heat.map(e=>j*e*KEV_J));
  return {t,d,v,temperature:heat.temperatureK,
   fused:s.fused+sum(fusion)/n,incident:s.incident+dt*j/column,
   retained:s.retained+dt*sum(b)/n,unretained:s.unretained+dt*j*(1-plan.probability)*(1-c.replacementProbability)/column,
   releasedT:s.releasedT+dt*sum(t.map((t,i)=>(b[i]+release[i]+renewal)*t))/n,
   releasedD:s.releasedD+dt*sum(d.map((d,i)=>(b[i]+release[i]+renewal)*d))/n,
   addedT:s.addedT+dt*renewal*c.renewalTritiumFraction,addedD:s.addedD+dt*renewal*(1-c.renewalTritiumFraction),
   beamOnS:s.beamOnS+(on?dt:0),incidentEnergy:s.incidentEnergy+dt*j*beam.beamEnergyKeV*KEV_J,
   nuclearEnergy:s.nuclearEnergy+dt*j*plan.probability*Q_KEV*KEV_J,depositedEnergy:s.depositedEnergy+heat.depositedJm2,
   neutronEnergy:s.neutronEnergy+dt*j*plan.neutron*KEV_J,escapingAlphaEnergy:s.escapingAlphaEnergy+dt*j*plan.alphaEscape*KEV_J,
   coolantEnergy:s.coolantEnergy+heat.coolantJm2};
 }

 function error(a:State,b:State){
  let result=0;
  for(const key of ['t','d','v','temperature'] as const)for(let i=0;i<a[key].length;i++){
   const scale=key==='temperature'?c.initialK:1;
   result=Math.max(result,Math.abs(a[key][i]-b[key][i])/(c.absoluteTolerance*scale+c.relativeTolerance*Math.max(Math.abs(a[key][i]),Math.abs(b[key][i]))));
  }
  for(const key of ['fused','retained','unretained','releasedT','releasedD','addedT','addedD','incidentEnergy','nuclearEnergy','depositedEnergy','neutronEnergy','escapingAlphaEnergy','coolantEnergy'] as const){
   if(a[key]===b[key])continue;
   const scale=key==='fused'?fusionScale:key.includes('Energy')?energyScale:atomScale;
   result=Math.max(result,Math.abs(a[key]-b[key])/(c.absoluteTolerance*scale+c.relativeTolerance*Math.max(Math.abs(a[key]),Math.abs(b[key]))));
  }
  return result;
 }

 const times=new Set([0,beam.exposureS,totalS]),switches=new Map<number,boolean>();
 for(let i=0;i<=c.samples;i++)times.add(totalS*i/c.samples);
 if(c.pulseDuty>0)for(let k=0;k*c.pulsePeriodS<beam.exposureS;k++){
  const start=k*c.pulsePeriodS,end=Math.min(beam.exposureS,start+c.pulseDuty*c.pulsePeriodS);
  times.add(start);times.add(end);switches.set(start,true);switches.set(end,false);
 }
 switches.set(beam.exposureS,false);
 const isOn=(t:number)=>beam.beamCurrentA>0&&t<beam.exposureS&&c.pulseDuty>0&&(switches.get(t)??(t%c.pulsePeriodS<c.pulseDuty*c.pulsePeriodS));
 const depthM=Array.from({length:n},(_,i)=>(i+.5)*dz),thermalDepthM=[...depthM,...Array.from({length:c.backingCells},(_,i)=>c.filmThicknessM+(i+.5)*c.backingThicknessM/c.backingCells)];
 function sample(timeS:number,s:State){
  const beamOn=isOn(timeS),plan=beamOn?beamAt(s):null,rate=beamOn?beam.beamCurrentA/E_CHARGE:0;
  const stored=sum(thermal.cells.map((cell,i)=>cell.widthM*cell.volumetricHeatCapacityJm3K*(s.temperature[i]-c.initialK)));
  const counts=column*area,neutronRateS=rate*(plan?.probability??0);
  const energy={incidentBeamJ:s.incidentEnergy*area,nuclearJ:s.nuclearEnergy*area,depositedJ:s.depositedEnergy*area,
   neutronJ:s.neutronEnergy*area,escapingAlphaJ:s.escapingAlphaEnergy*area,storedChangeJ:stored*area,coolantJ:s.coolantEnergy*area,
   beamResidualJ:(s.incidentEnergy+s.nuclearEnergy-s.depositedEnergy-s.neutronEnergy-s.escapingAlphaEnergy)*area,
   thermalResidualJ:(s.depositedEnergy-stored-s.coolantEnergy)*area};
  const result={timeS,beamOn,depthM,thermalDepthM,temperatureK:[...s.temperature],tritiumFraction:[...s.t],deuteriumFraction:[...s.d],vacancyFraction:[...s.v],
   neutronRateS,neutronMeanEnergyMeV:neutronRateS>0?plan!.neutron/plan!.probability/1000:null,
   cellNeutronRateS:(plan?.reaction??zeros()).map(p=>rate*p),assemblyHeatW:rate*sum(plan?.heat??[])*KEV_J,
   cumulativeNeutrons:s.fused*counts,beamOnS:s.beamOnS,incidentD:s.incident*counts,
   releasedT:s.releasedT*counts,releasedD:s.releasedD*counts,addedT:s.addedT*counts,addedD:s.addedD*counts,
   retainedD:s.retained*counts,unretainedD:s.unretained*counts,energy,
   atomResiduals:{tritium:(f0+s.addedT-sum(s.t)/n-s.fused-s.releasedT)*counts,
    deuterium:(1-f0+s.addedD+s.retained-sum(s.d)/n-s.releasedD)*counts,
    sites:Math.max(...s.t.map((t,i)=>Math.abs(t+s.d[i]+s.v[i]-1)))*counts,
    projectiles:(s.incident-s.fused-s.retained-s.unretained)*counts}};
  if([...Object.values(result),...Object.values(energy),...Object.values(result.atomResiduals)].some(v=>typeof v==='number'&&!Number.isFinite(v)))
   throw new RangeError('Coupled target output exceeds the finite numeric domain.');
  return result;
 }
 const history=[sample(0,state)];let time=0,step=Math.min(c.maxStepS,totalS);
 for(const target of [...times].sort((a,b)=>a-b).slice(1)){
  const on=isOn((time+target)/2);
  while(time<target){
   if(acceptedSteps+rejectedSteps>=50000)throw new RangeError('Coupled target exceeded its 50000 adaptive-attempt budget; refine the declared scenario.');
   const dt=Math.min(step,target-time);if(time+dt===time)throw new RangeError('Coupled target needs a timestep below floating-point resolution.');
   const coarse=advance(state,dt,on),half=advance(state,dt/2,on),fine=half&&advance(half,dt/2,on);
   const estimate=coarse&&fine?error(coarse,fine):Infinity;
   if(fine&&estimate<=1){state=fine;time=dt===target-time?target:time+dt;acceptedSteps++;maxErrorRatio=Math.max(maxErrorRatio,estimate);step=Math.min(c.maxStepS,dt*(estimate===0?2:Math.min(2,.9/Math.sqrt(estimate))));}
   else{rejectedSteps++;step=dt*(Number.isFinite(estimate)?Math.max(.1,.9/Math.sqrt(estimate)):.2);}
  }
  history.push(sample(target,state));
 }
 const final=history.at(-1)!;
 return {model:'coupled-depth-target-scenario' as const,config:c,initial:history[0],final,history,
  materialGeometry:resolveMaterialGeometry({mode:'independent',materialColumnM2:column,filmThicknessM:c.filmThicknessM}),
  reactionOutput:DT_ONLY_OUTPUT,
  solver:{method:'IMEX-Euler-step-doubling' as const,order:1,acceptedSteps,rejectedSteps,maxErrorRatio,maxPackingRoundoff,packingRoundoffBound:64*Number.EPSILON*n},
  curves:[{label:'Evolving D–T neutron production',x:history.map(s=>s.timeS),y:history.map(s=>s.neutronRateS),xLabel:'Time (s)',yLabel:DT_ONLY_OUTPUT.rateLabel},
   {label:'Film surface-cell temperature',x:history.map(s=>s.timeS),y:history.map(s=>s.temperatureK[0]),xLabel:'Time (s)',yLabel:'Temperature (K)'}],
  assumptions:[
   'Illustrative one-dimensional fixed Li-site film and depth-resolved backing; dimensions, thermal properties, diffusion, release, implantation weights and renewal are scenario inputs, not measured Marathon/LiT data.',
   'Atomic Li + fD D + fT T stopping is recomputed at every substep. Compound chemistry, straggling, charge exchange, physical implantation ranges, sputtering, radiation damage and phase changes are not solved.',
   'Non-fusing arrivals make an assumed random replacement attempt distributed by declared normalized depth weights. Weights specify conditional replacement locations, not a BCA implantation prediction or reflected fraction.',
   'D/T/vacancies share an equal-coefficient no-flux Fick diffusion operator. Arrhenius prefactors/activation energies and replacement/renewal rates are uncalibrated; default diffusion, release and renewal are zero.',
   'Bulk release is an assumed volumetric loss. Optional front release and back permeation use boundary velocities divided by cell width; both create vacancies and exported isotopes. No measured LiT surface or permeation law is claimed.',
   'Renewal replaces sites from an external D/T supply and exports the old occupancy; no tritium breeding is implied. Released-isotope enthalpy and binding/reaction heat are omitted from the fixed-host thermal scenario.',
   'Surviving beam energy is absorbed at a zero-range backing-side interface. The massless face source is split by film/contact and backing half-cell resistances; this is a declared interface approximation, not a resolved or calibrated backing stopping range. Non-retained projectiles are an isotope-retention ledger, not energy escaping the assembly. Neutrons and undeclared alpha deposition escape; no return radiation is modeled.',
   'Conservative first-order IMEX stepping uses full-versus-two-half error estimates and accepts the positive half-step state. Pulse edges and shutoff are exact step boundaries; local estimates are not global error certificates.',
   'Atomic stopping uses normalized composition only when raw T/D/vacancy packing differs from one by at most 64 machine epsilons times the film-cell count. Raw populations and isotope ledgers remain unmodified; larger packing errors reject.',
  ]};
}

import {simulateFuelCentrifuge} from './fuel-centrifuge.js';
import {fuelLinerState,type FuelLinerGrid,type FuelLinerState} from './fuel-thermal.js';
import {advanceFuelGasMass,fuelGasState,type FuelGasState} from './fuel-gas.js';

const U=1.66053906892e-27,K=1.380649e-23;
type RotorResult=ReturnType<typeof simulateFuelCentrifuge>;
export type FuelTransportOptions={cells?:number;steps?:number};
export type FuelCoupledParameters={radiusM:number;gasK:number;lightFraction:number;diffusivityM2S:number;
 gasTemperaturesK?:readonly number[];
 speciesMassKg:number[];mechanics:Pick<RotorResult['mechanics'],'ii'|'nn'|'gamma'|'drag'|'torque'>};
export type FuelCoupledState={lightMass:number[];heavyMass:number[];
 ionAngularMomentumKgM2S:number;neutralAngularMomentumKgM2S:number};
type EnergyIntegral={driveWorkJ:number;slipDissipationJ:number;dragDissipationJ:number;
 redistributionWorkJ:number;numericalDissipationJ:number};
export type FuelLedger=EnergyIntegral&{driveImpulseKgM2S:number;dragImpulseKgM2S:number;ionPhaseRad:number;neutralPhaseRad:number};
type Ledger=FuelLedger;
export type FuelThermalState={gasK:number;linerK:number;pressurePa:number;gasEnergyJ:number;linerEnergyJ:number;
 ohmicEnergyJ:number;coolingEnergyJ:number;residualJ:number;relativeResidual:number;spatial?:FuelLinerState;gas?:FuelGasState};
export type FuelTransportSnapshot={
 timeS:number;ionRadS:number;neutralRadS:number;neutralInertiaRatio:number;
 ionAngularMomentumKgM2S:number;neutralAngularMomentumKgM2S:number;neutralInertiaKgM2:number;
 ionPhaseRad:number;neutralPhaseRad:number;
 angularMomentum:{driveImpulseKgM2S:number;dragImpulseKgM2S:number;residualKgM2S:number;relativeResidual:number};
 energy:EnergyIntegral&{kineticJ:number;freeEnergyJ:number|null;residualJ:number;relativeResidual:number};
 lightMass:number[];heavyMass:number[];lightCDF:number[];heavyCDF:number[];
 profiles:{radiusM:number;lightDensityRatio:number;heavyDensityRatio:number;lightFraction:number|null}[];
 collection:{innerLightPurity:number|null;lightRecovery:number|null;innerFraction:number;
  outerHeavyPurity:number|null;lightBalance:number;heavyBalance:number};
 balances:{light:number;heavy:number;minimumMass:number;boundaryFlux:0};
 thermal?:FuelThermalState;currentA?:number;
 resolution?:{maxCellExponent:number;maxCouplingIterations:number};
};
/** Accepted solver state without duplicated plotting/CDF reconstructions. */
export type FuelTransportCheckpoint=Omit<FuelTransportSnapshot,'profiles'|'lightCDF'|'heavyCDF'>;
export type FuelTransportResult={
 schemaVersion:1;method:'Scharfetter–Gummel / backward Euler';cells:number;steps:number;
 coupling:'angular-momentum-conserving';
 durationS:number;radiusM:number;gasK:number;lightFraction:number;cutFraction:number;
 diffusivityM2S:number;speciesMassKg:number[];radiusEdgesM:number[];maxCellExponent:number;
 mechanics:Pick<RotorResult['mechanics'],'ii'|'nn'|'gamma'|'drag'|'torque'>;
 snapshots:FuelTransportSnapshot[];checkpoints?:FuelTransportCheckpoint[];maxBalanceError:number;assumptions:string[];
 maxAngularMomentumRelativeError:number;maxEnergyRelativeError:number;maxCouplingIterations:number;
 thermalLiner?:FuelLinerGrid;
 thermalGas?:{number:number;lengthM:number};
 timeControl?:{method:'BE step doubling';relativeTolerance:number;temperatureToleranceK:number;startTimeS:number;
  acceptedPairs:number;rejectedSteps:number;maxErrorRatio:number};
 operation?:{schemaVersion:1;events:{timeS:number;currentA:number}[];thermal:unknown;setup:unknown;initialCurrentA:number};
};

function nonnegative(value:number,name:string){
 if(!Number.isFinite(value)||value<0)throw new RangeError(`${name} must be finite and nonnegative.`);
}
function resolution(value:number,name:string,min:number,max:number){
 if(!Number.isSafeInteger(value)||value<min||value>max)throw new RangeError(`${name} must be an integer in [${min}, ${max}].`);
}
function bernoulli(z:number){
 if(z<1e-5)return 1-z/2+z*z/12-z**4/720;
 return z>50?z*Math.exp(-z)/(-Math.expm1(-z)):z/Math.expm1(z);
}
const sum=(a:readonly number[])=>a.reduce((total,value)=>total+value,0);
const ratio=(a:number,b:number)=>b>0?a/b:null;

/** One implicit step for cell probabilities on uniform y=r²/a² cells.
 * diffusionRateS=4D/a². Reflecting axis/wall. β=mΩ²a²/(2kT)≥0.
 * The positive-rate SG generator is a conservative birth/death process.
 */
export function advanceFuelRadialMass(mass:readonly number[],beta:number,diffusionRateS:number,dtS:number):number[]{
 resolution(mass.length,'radial cells',2,1024);
 nonnegative(beta,'centrifugal exponent');nonnegative(diffusionRateS,'diffusion rate');nonnegative(dtS,'time step');
 for(const value of mass)nonnegative(value,'cell mass');
 if(dtS===0||diffusionRateS===0)return [...mass];
 const n=mass.length,z=beta/n,b=bernoulli(z),outward:number[]=[],inward:number[]=[];
 for(let i=0;i<n-1;i++){
  const scale=dtS*diffusionRateS*(i+1)*n;
  outward.push(scale*(b+z));inward.push(scale*b);
 }
 // Stable Thomas elimination: form positive remainders instead of subtracting
 // nearly equal large diagonal terms. No clipping/renormalizing hides a balance error.
 const diagonal:number[]=[],rhs:number[]=[];let retained=1;
 for(let i=0;i<n;i++){
  const remainder=1+(i?inward[i-1]*retained:0),pivot=remainder+(i<n-1?outward[i]:0);
  if(!Number.isFinite(pivot)||pivot<=0)throw new RangeError('Transport stiffness exceeds the floating-point domain.');
  diagonal.push(pivot);rhs.push(mass[i]+(i?outward[i-1]*rhs[i-1]/diagonal[i-1]:0));
  retained=remainder/pivot;
 }
 const next=Array<number>(n);next[n-1]=rhs[n-1]/diagonal[n-1];
 for(let i=n-2;i>=0;i--)next[i]=(rhs[i]+inward[i]*next[i+1])/diagonal[i];
 const error=Math.abs(sum(next)-sum(mass));
 if(next.some(value=>!Number.isFinite(value)||value<0)||error>2e-10*Math.max(1,sum(mass)))
  throw new RangeError('Transport step failed positivity or inventory conservation; reduce the time step.');
 return next;
}

function inertia(model:FuelCoupledParameters,light:readonly number[],heavy:readonly number[]){
 const x=model.lightFraction,[ml,mh]=model.speciesMassKg,w=x*ml/(x*ml+(1-x)*mh);
 const moment=(p:readonly number[])=>p.reduce((value,mass,i)=>value+mass*(i+.5)/p.length,0);
 return 2*model.mechanics.nn*(w*moment(light)+(1-w)*moment(heavy));
}
function relativeError(error:number,scale:number){return scale>0?Math.abs(error)/scale:error===0?0:Infinity;}

/** Fully implicit SG / two-rotor step. Angular momenta, not angular speeds, are
 * evolved. The scalar endpoint-speed root includes the redistributed inertia.
 * Ion geometry and Γ stay prescribed; neutral dragHz=initial drag/initial inertia.
 */
export function advanceFuelCoupledStep(model:FuelCoupledParameters,state:FuelCoupledState,dtS:number){
 const {ii,nn,gamma,drag,torque}=model.mechanics,n=state.lightMass.length;
 resolution(n,'radial cells',2,1024);nonnegative(dtS,'time step');
 for(const [name,value] of Object.entries({ii,nn,radiusM:model.radiusM,gasK:model.gasK}))
  if(!Number.isFinite(value)||value<=0)throw new RangeError(`${name} must be finite and positive.`);
 for(const [name,value] of Object.entries({gamma,drag,diffusivityM2S:model.diffusivityM2S}))nonnegative(value,name);
 if(!Number.isFinite(model.lightFraction)||model.lightFraction<0||model.lightFraction>1||model.speciesMassKg.length!==2||model.speciesMassKg.some(m=>!Number.isFinite(m)||m<=0))
  throw new RangeError('Coupled transport needs a physical two-species composition.');
 for(const value of [state.ionAngularMomentumKgM2S,state.neutralAngularMomentumKgM2S,torque])
  if(!Number.isFinite(value))throw new RangeError('Angular momentum and drive torque must be finite.');
 if(state.heavyMass.length!==n)throw new RangeError('Species must share a radial grid.');
 for(const p of [state.lightMass,state.heavyMass]){
  for(const value of p)nonnegative(value,'cell mass');
  if(Math.abs(sum(p)-1)>2e-8)throw new RangeError('Each species inventory must be normalized.');
 }
 const li0=state.ionAngularMomentumKgM2S,ln0=state.neutralAngularMomentumKgM2S,in0=inertia(model,state.lightMass,state.heavyMass);
 const dragHz=drag/nn,a=dtS*gamma/ii,h=dtS*gamma/(1+a),u=(li0+dtS*torque)/ii;
 const target=ln0+h*u,scale=Math.abs(target),rate=4*model.diffusivityM2S/model.radiusM**2;
 function evaluate(speed:number){
  const coefficient=speed**2*model.radiusM**2/(2*K*model.gasK);
  const spatial=model.gasTemperaturesK?model.speciesMassKg.map((mass,i)=>advanceFuelGasMass(i?state.heavyMass:state.lightMass,model.gasTemperaturesK!,mass,speed,model.radiusM,model.diffusivityM2S,dtS)):undefined;
  const lightMass=spatial?.[0].mass??advanceFuelRadialMass(state.lightMass,model.speciesMassKg[0]*coefficient,rate,dtS);
  const heavyMass=spatial?.[1].mass??advanceFuelRadialMass(state.heavyMass,model.speciesMassKg[1]*coefficient,rate,dtS);
  const neutralInertiaKgM2=inertia(model,lightMass,heavyMass);
  return {lightMass,heavyMass,faceTransfers:spatial?.map(s=>s.faceTransfers),neutralInertiaKgM2,speed,residual:speed*(neutralInertiaKgM2*(1+dtS*dragHz)+h)-scale};
 }
 // The minimum cell moment supplies a physical bracket even if diffusion moves
 // concentrated gas inward. Retain accepted inventory roundoff in the bound.
 const x=model.lightFraction,[ml,mh]=model.speciesMassKg,weight=x*ml/(x*ml+(1-x)*mh);
 const minimumInertia=nn/n*(weight*sum(state.lightMass)+(1-weight)*sum(state.heavyMass));
 let low=0,high=scale/(minimumInertia*(1+dtS*dragHz)+h),fLow=-scale,chosen=evaluate(high),fHigh=chosen.residual,side=0,iterations=1;
 if(!Number.isFinite(high)||!Number.isFinite(fHigh)||fHigh < -4e-13*scale)throw new RangeError('Coupled rotor root has no finite physical bracket.');
 // Illinois regula falsi: bracket-preserving secants, with endpoint weighting
 // to avoid stagnation. No unconverged iterate is accepted or clipped.
 while(Math.abs(chosen.residual)>4e-13*scale&&iterations<64){
  let speed=(low*fHigh-high*fLow)/(fHigh-fLow);
  if(!Number.isFinite(speed)||speed<=low||speed>=high)speed=(low+high)/2;
  chosen=evaluate(speed);iterations++;
  if(chosen.residual>0){high=speed;fHigh=chosen.residual;if(side===1)fLow*=.5;side=1;}
  else{low=speed;fLow=chosen.residual;if(side===-1)fHigh*=.5;side=-1;}
 }
 if(!Number.isFinite(chosen.residual)||Math.abs(chosen.residual)>4e-13*scale)throw new RangeError('Coupled rotor solve did not converge; refine the time step.');
 const neutralAngularMomentumKgM2S=target/(1+dtS*dragHz+h/chosen.neutralInertiaKgM2),neutralRadS=neutralAngularMomentumKgM2S/chosen.neutralInertiaKgM2;
 const ionAngularMomentumKgM2S=(li0+dtS*torque+dtS*gamma*neutralRadS)/(1+a),ionRadS=ionAngularMomentumKgM2S/ii;
 const driveImpulseKgM2S=dtS*torque,dragImpulseKgM2S=dtS*dragHz*neutralAngularMomentumKgM2S;
 const slip=ionRadS-neutralRadS;
 const energyIncrement:EnergyIntegral={driveWorkJ:driveImpulseKgM2S*ionRadS,slipDissipationJ:dtS*gamma*slip**2,
  dragDissipationJ:dragImpulseKgM2S*neutralRadS,redistributionWorkJ:.5*neutralRadS**2*(chosen.neutralInertiaKgM2-in0),
  numericalDissipationJ:.5*ii*(ionRadS-li0/ii)**2+.5*in0*(neutralRadS-ln0/in0)**2};
 const values=[ionRadS,neutralRadS,ionAngularMomentumKgM2S,neutralAngularMomentumKgM2S,...Object.values(energyIncrement)];
 if(values.some(value=>!Number.isFinite(value)))throw new RangeError('Coupled rotor exceeds the finite numerical domain.');
 return {lightMass:chosen.lightMass,heavyMass:chosen.heavyMass,faceTransfers:chosen.faceTransfers,neutralInertiaKgM2:chosen.neutralInertiaKgM2,
  ionRadS,neutralRadS,ionAngularMomentumKgM2S,neutralAngularMomentumKgM2S,driveImpulseKgM2S,dragImpulseKgM2S,energyIncrement,iterations};
}

/** CDF of the piecewise-constant volume density; no equilibrium assumption inside cells. */
export function fuelTransportCDF(mass:readonly number[],radiusFraction:number){
 if(!Number.isFinite(radiusFraction)||radiusFraction<0||radiusFraction>1)throw new RangeError('Radius fraction outside [0, 1].');
 if(radiusFraction===0||radiusFraction===1)return radiusFraction;
 const index=radiusFraction**2*mass.length,cell=Math.min(Math.floor(index),mass.length-1);
 let value=0;for(let i=0;i<cell;i++)value+=mass[i];
 return value+(index-cell)*mass[cell];
}
/** Current closed-vessel inventory partition, not an extraction-rate prediction. */
export function fuelTransportCollection(lightMass:readonly number[],heavyMass:readonly number[],lightFraction:number,cutFraction:number):FuelTransportSnapshot['collection']{
 if(!Number.isFinite(lightFraction)||lightFraction<0||lightFraction>1)throw new RangeError('Light fraction outside [0, 1].');
 if(lightMass.length<2||lightMass.length!==heavyMass.length)throw new RangeError('Species must share a nonempty radial grid.');
 const x=lightFraction,l=fuelTransportCDF(lightMass,cutFraction),h=fuelTransportCDF(heavyMass,cutFraction),inside=x*l+(1-x)*h;
 return {innerLightPurity:ratio(x*l,inside),lightRecovery:x>0?l:null,innerFraction:inside,
  outerHeavyPurity:cutFraction===1?null:ratio((1-x)*(1-h),1-inside),lightBalance:sum(lightMass)-1,heavyBalance:sum(heavyMass)-1};
}
type TransportModel=Omit<FuelTransportResult,'snapshots'|'maxBalanceError'|'maxAngularMomentumRelativeError'|'maxEnergyRelativeError'|'maxCouplingIterations'>;
export function fuelTransportSnapshot(model:TransportModel,timeS:number,state:FuelCoupledState,ledger:Ledger):FuelTransportSnapshot{
 const {cells,lightFraction:x,cutFraction}=model,{ii,nn}=model.mechanics,{lightMass,heavyMass,ionAngularMomentumKgM2S:li,neutralAngularMomentumKgM2S:ln}=state;
 const neutralInertiaKgM2=inertia(model,lightMass,heavyMass),ionRadS=li/ii,neutralRadS=ln/neutralInertiaKgM2;
 const lightCDF=[0],heavyCDF=[0];
 for(let i=0;i<cells;i++){lightCDF.push(lightCDF[i]+lightMass[i]);heavyCDF.push(heavyCDF[i]+heavyMass[i]);}
 const meanMass=x*model.speciesMassKg[0]+(1-x)*model.speciesMassKg[1];
 const neutralInertiaRatio=neutralInertiaKgM2/nn;
 const profiles=Array.from({length:81},(_,i)=>{
  const r=i/80,cell=Math.min(cells-1,Math.floor(r*r*cells));
  const lightDensityRatio=lightMass[cell]*cells,heavyDensityRatio=heavyMass[cell]*cells,total=x*lightDensityRatio+(1-x)*heavyDensityRatio;
  return {radiusM:r*model.radiusM,lightDensityRatio,heavyDensityRatio,lightFraction:ratio(x*lightDensityRatio,total)};
 });
 const angularResidual=li+ln-ledger.driveImpulseKgM2S+ledger.dragImpulseKgM2S;
 const angularScale=Math.abs(li)+Math.abs(ln)+Math.abs(ledger.driveImpulseKgM2S)+Math.abs(ledger.dragImpulseKgM2S);
 const kineticJ=.5*(li*ionRadS+ln*neutralRadS),{driveWorkJ,slipDissipationJ,dragDissipationJ,redistributionWorkJ,numericalDissipationJ}=ledger;
 const residualJ=kineticJ-driveWorkJ+slipDissipationJ+dragDissipationJ+redistributionWorkJ+numericalDissipationJ;
 const energyScale=kineticJ+Math.abs(driveWorkJ)+slipDissipationJ+dragDissipationJ+Math.abs(redistributionWorkJ)+numericalDissipationJ;
 const entropy=(p:number[])=>sum(p.map(v=>v>0?v*Math.log(v*cells):0));
 const neutralNumber=2*nn/(meanMass*model.radiusM**2),freeEnergyJ=model.thermalGas?null:kineticJ+neutralNumber*K*model.gasK*(x*entropy(lightMass)+(1-x)*entropy(heavyMass));
 return {timeS,ionRadS,neutralRadS,neutralInertiaRatio,neutralInertiaKgM2,ionAngularMomentumKgM2S:li,neutralAngularMomentumKgM2S:ln,
  ionPhaseRad:ledger.ionPhaseRad,neutralPhaseRad:ledger.neutralPhaseRad,
  angularMomentum:{driveImpulseKgM2S:ledger.driveImpulseKgM2S,dragImpulseKgM2S:ledger.dragImpulseKgM2S,residualKgM2S:angularResidual,relativeResidual:relativeError(angularResidual,angularScale)},
  energy:{kineticJ,driveWorkJ,slipDissipationJ,dragDissipationJ,redistributionWorkJ,numericalDissipationJ,residualJ,relativeResidual:relativeError(residualJ,energyScale),freeEnergyJ},
  lightMass:[...lightMass],heavyMass:[...heavyMass],lightCDF,heavyCDF,profiles,
  collection:fuelTransportCollection(lightMass,heavyMass,x,cutFraction),
  balances:{light:sum(lightMass),heavy:sum(heavyMass),minimumMass:Math.min(...lightMass,...heavyMass),boundaryFlux:0}};
}
const snapshot=fuelTransportSnapshot;

/** Two-way inertia / angular-momentum coupling of isothermal radial transport.
 * This is NOT a multicomponent gas momentum, pressure or axial extraction solver.
 */
export function simulateFuelTransport(result:RotorResult,options:FuelTransportOptions={}):FuelTransportResult{
 const cells=options.cells??64,steps=options.steps??512;
 resolution(cells,'radial cells',2,1024);resolution(steps,'transport steps',1,32768);
 const c=result.config,{ii,nn,gamma,drag,torque}=result.mechanics;
 const model:TransportModel={schemaVersion:1,method:'Scharfetter–Gummel / backward Euler',coupling:'angular-momentum-conserving',cells,steps,
  durationS:c.durationS,radiusM:c.radiusM,gasK:c.gasK,lightFraction:c.lightFraction,cutFraction:c.cutFraction,
  diffusivityM2S:c.radialDiffusivityM2S,speciesMassKg:result.pair.masses.map(m=>m*U),
  maxCellExponent:0,
  radiusEdgesM:Array.from({length:cells+1},(_,i)=>c.radiusM*Math.sqrt(i/cells)),mechanics:{ii,nn,gamma,drag,torque},
  assumptions:[
   'Reflecting axis and wall; fixed species inventories, initially uniform volume densities. Cuts partition the current inventory; they are not extraction rates.',
   'Neutral inertia follows the evolving mass-weighted radial second moment. Ion and neutral angular momenta evolve with reciprocal friction, applied torque and neutral drag; dragHz is fixed, so the neutral drag coefficient scales with its current inertia. Ion geometry/inertia and the collision torque coefficient remain prescribed.',
   'Isothermal independent-species Smoluchowski closure with common prescribed D and instantaneous rigid rotation. An external thermal bath maintains temperature. Zero barycentric diffusive mass flux, local angular-momentum transport, pressure/temperature evolution, axial flow, extraction and pump depletion are not solved.',
   'Finite-volume exponential SG flux and backward-Euler angular-momentum equations share a nonlinear endpoint speed. Positive conservative inventory; drive-minus-drag impulse closes the rotor budget. First-order time/phase accuracy requires refinement. Cellwise constant radial reconstruction.',
   'Redistribution work and backward-Euler numerical dissipation are reported separately. Neither is presented as a measured heat load. The fixed-uniform-inertia result remains a separate reference benchmark.',
   'Transport coefficient is a user-prescribed phenomenological input, not a validated binary gas diffusion coefficient. Not a fully coupled multicomponent neutral-fluid calculation.'
  ]};
 let state:FuelCoupledState={lightMass:Array<number>(cells).fill(1/cells),heavyMass:Array<number>(cells).fill(1/cells),ionAngularMomentumKgM2S:0,neutralAngularMomentumKgM2S:0};
 const ledger:Ledger={driveImpulseKgM2S:0,dragImpulseKgM2S:0,ionPhaseRad:0,neutralPhaseRad:0,
  driveWorkJ:0,slipDissipationJ:0,dragDissipationJ:0,redistributionWorkJ:0,numericalDissipationJ:0};
 const snapshots=[snapshot(model,0,state,ledger)],dt=c.durationS/steps;let maxCouplingIterations=0;
 const stride=Math.max(1,Math.ceil(steps/100));
 for(let j=0;j<steps&&c.durationS>0;j++){
  const next=advanceFuelCoupledStep(model,state,dt);state=next;maxCouplingIterations=Math.max(maxCouplingIterations,next.iterations);
  ledger.driveImpulseKgM2S+=next.driveImpulseKgM2S;ledger.dragImpulseKgM2S+=next.dragImpulseKgM2S;
  ledger.ionPhaseRad+=dt*next.ionRadS;ledger.neutralPhaseRad+=dt*next.neutralRadS;
  for(const key of Object.keys(next.energyIncrement) as (keyof EnergyIntegral)[])ledger[key]+=next.energyIncrement[key];
  model.maxCellExponent=Math.max(model.maxCellExponent,Math.max(...model.speciesMassKg)*(next.neutralRadS*c.radiusM)**2/(2*K*c.gasK*cells));
  if((j+1)%stride===0||j===steps-1)snapshots.push(snapshot(model,(j+1)*dt,state,ledger));
 }
 const maxBalanceError=Math.max(...snapshots.flatMap(p=>[Math.abs(p.balances.light-1),Math.abs(p.balances.heavy-1)]));
 if(maxBalanceError>2e-8)throw new RangeError('Transport accumulated inventory drift; refine the time step.');
 const maxAngularMomentumRelativeError=Math.max(...snapshots.map(p=>p.angularMomentum.relativeResidual));
 const maxEnergyRelativeError=Math.max(...snapshots.map(p=>p.energy.relativeResidual));
 if(maxAngularMomentumRelativeError>2e-8||maxEnergyRelativeError>2e-8)throw new RangeError('Coupled rotor accumulated a momentum or energy budget error; refine the time step.');
 return {...model,snapshots,maxBalanceError,maxAngularMomentumRelativeError,maxEnergyRelativeError,maxCouplingIterations};
}

/** Interpolate inventories, then recompute ratios. Positive convex interpolation is conservative.
 * Outside the solved interval, return the nearest endpoint; never extrapolate physics.
 */
export function sampleFuelTransport(model:FuelTransportResult,timeS:number):FuelTransportSnapshot{
 nonnegative(timeS,'physical time');
 const samples=model.checkpoints??model.snapshots;
 const complete=(s:FuelTransportCheckpoint|FuelTransportSnapshot):FuelTransportSnapshot=>{
  if('profiles' in s)return s;
  const ledger={...s.energy,...s.angularMomentum,ionPhaseRad:s.ionPhaseRad,neutralPhaseRad:s.neutralPhaseRad};
  return {...snapshot(s.thermal?{...model,gasK:s.thermal.gasK}:model,s.timeS,s,ledger),
   ...(s.thermal?{thermal:s.thermal}:{}),...(s.currentA!==undefined?{currentA:s.currentA}:{}),...(s.resolution?{resolution:s.resolution}:{})};
 };
 if(timeS<=samples[0].timeS)return complete(samples[0]);
 if(timeS>=samples.at(-1)!.timeS)return complete(samples.at(-1)!);
 let low=0,high=samples.length-1;
 while(high-low>1){const middle=(low+high)>>1;if(samples[middle].timeS<=timeS)low=middle;else high=middle;}
 const a=samples[low],b=samples[high],fraction=(timeS-a.timeS)/(b.timeS-a.timeS);
 if(timeS===a.timeS)return complete(a);
 const blend=(left:number[],right:number[])=>left.map((value,i)=>(1-fraction)*value+fraction*right[i]);
 const value=(left:number,right:number)=>(1-fraction)*left+fraction*right;
 const ledger:Ledger={driveImpulseKgM2S:value(a.angularMomentum.driveImpulseKgM2S,b.angularMomentum.driveImpulseKgM2S),
  dragImpulseKgM2S:value(a.angularMomentum.dragImpulseKgM2S,b.angularMomentum.dragImpulseKgM2S),
  ionPhaseRad:value(a.ionPhaseRad,b.ionPhaseRad),neutralPhaseRad:value(a.neutralPhaseRad,b.neutralPhaseRad),
  driveWorkJ:value(a.energy.driveWorkJ,b.energy.driveWorkJ),slipDissipationJ:value(a.energy.slipDissipationJ,b.energy.slipDissipationJ),
  dragDissipationJ:value(a.energy.dragDissipationJ,b.energy.dragDissipationJ),redistributionWorkJ:value(a.energy.redistributionWorkJ,b.energy.redistributionWorkJ),
  numericalDissipationJ:value(a.energy.numericalDissipationJ,b.energy.numericalDissipationJ)};
 // Convex interpolation lowers K=L²/(2I); record this interpolation defect as
 // numerical dissipation rather than inventing a physical heating channel.
 const state={lightMass:blend(a.lightMass,b.lightMass),heavyMass:blend(a.heavyMass,b.heavyMass),
  ionAngularMomentumKgM2S:value(a.ionAngularMomentumKgM2S,b.ionAngularMomentumKgM2S),neutralAngularMomentumKgM2S:value(a.neutralAngularMomentumKgM2S,b.neutralAngularMomentumKgM2S)};
 let thermal:FuelThermalState|undefined;
 if(a.thermal&&b.thermal){
  const {spatial:_left,...left}=a.thermal,{spatial:_right,...right}=b.thermal;
  thermal={gasK:value(left.gasK,right.gasK),linerK:value(left.linerK,right.linerK),pressurePa:value(left.pressurePa,right.pressurePa),
   gasEnergyJ:value(left.gasEnergyJ,right.gasEnergyJ),linerEnergyJ:value(left.linerEnergyJ,right.linerEnergyJ),
   ohmicEnergyJ:value(left.ohmicEnergyJ,right.ohmicEnergyJ),coolingEnergyJ:value(left.coolingEnergyJ,right.coolingEnergyJ),
   residualJ:value(left.residualJ,right.residualJ),relativeResidual:value(left.relativeResidual,right.relativeResidual)};
  if(model.thermalLiner){
   if(!_left||!_right)throw new RangeError('Spatial playback needs both accepted cell-enthalpy states.');
   thermal.spatial=fuelLinerState(model.thermalLiner,blend(_left.cellEnergyJ,_right.cellEnergyJ));
   thermal.linerK=thermal.spatial.meanK;thermal.linerEnergyJ=thermal.spatial.energyJ;
  }
  if(model.thermalGas){
   if(!a.thermal.gas||!b.thermal.gas)throw new RangeError('Spatial gas playback needs accepted cell energies.');
   thermal.gas=fuelGasState(state.lightMass,state.heavyMass,blend(a.thermal.gas.cellEnergyJ,b.thermal.gas.cellEnergyJ),{...model.thermalGas,radiusM:model.radiusM,lightFraction:model.lightFraction});
   thermal.gasK=thermal.gas.meanK;thermal.gasEnergyJ=thermal.gas.energyJ;
   thermal.pressurePa=thermal.gas.pressurePa.reduce((total,p)=>total+p,0)/model.cells;
  }
 }
 const sampledModel=thermal?{...model,gasK:thermal.gasK}:model;
 const current=snapshot(sampledModel,timeS,state,ledger);
 ledger.numericalDissipationJ+=value(a.energy.kineticJ,b.energy.kineticJ)-current.energy.kineticJ;
 const result=snapshot(sampledModel,timeS,state,ledger);
 if(thermal)result.thermal=thermal;
 // An unsolved cursor lies inside one accepted step. Keep the enclosing
 // step's conservative resolution bound; never lose a retained-prefix warning.
 if(b.resolution)result.resolution={...b.resolution};
 // A current event is right-continuous; never blend the drive across a switch.
 if(model.operation){result.currentA=model.operation.events.filter(e=>e.timeS<=timeS).at(-1)?.currentA??a.currentA;}
 return result;
}

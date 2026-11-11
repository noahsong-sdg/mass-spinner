import {AMU,E_CHARGE,type Vec} from './physics.js';
import {createRandomStream,RANDOM_STREAM_VERSION} from './random-stream.js';
import {PROTON_MASS_U,hydrogenCaptureHazard,hydrogenCaptureProducts,constantCaptureTime} from './hydrogen-charge-exchange.js';

export interface HydrogenTracerConfig {
 atomicIdentity:'H-1';electricFieldVM:0;rfAmplitudeVM:0;radiusM:number;lengthM:number;
 magneticT:number;energyEVPerU:number;pitchDeg:number;neutralDensityM3:number;particles:number;seed:number;
}
export const DEFAULT_HYDROGEN_TRACER:HydrogenTracerConfig={atomicIdentity:'H-1',electricFieldVM:0,rfAmplitudeVM:0,
 radiusM:.2,lengthM:.6,magneticT:.002,energyEVPerU:10,pitchDeg:45,neutralDensityM3:3e18,particles:512,seed:42};
const mass=PROTON_MASS_U*AMU;
const dot=(a:Vec,b:Vec)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const norm=(v:Vec)=>Math.hypot(...v);
const scale=(v:Vec,s:number):Vec=>v.map(x=>s*x) as Vec;
const plus=(a:Vec,b:Vec):Vec=>a.map((x,i)=>x+b[i]) as Vec;
const ptheta=(p:Vec,v:Vec,charge:0|1,b:number)=>mass*(p[0]*v[1]-p[1]*v[0])+charge*E_CHARGE*b*(p[0]**2+p[1]**2)/2;

export function validateHydrogenTracer(c:HydrogenTracerConfig){
 if(c.atomicIdentity!=='H-1'||c.electricFieldVM!==0||c.rfAmplitudeVM!==0)throw new Error('This H-1 first-capture tracer requires E=0 and RF=0; accelerated/general-ion transport is unsupported.');
 if(![c.radiusM,c.lengthM,c.magneticT,c.energyEVPerU,c.pitchDeg,c.neutralDensityM3].every(Number.isFinite)||c.radiusM<.001||c.lengthM<.01||c.radiusM>2||c.lengthM>10
  ||Math.abs(c.magneticT)>.05||c.energyEVPerU<.1||c.energyEVPerU>20||c.pitchDeg<0||c.pitchDeg>85||c.neutralDensityM3<0||c.neutralDensityM3>1e20)
  throw new Error('Tracer domain: radius 0.001–2 m, length 0.01–10 m, |B|≤0.05 T, energy 0.1–20 eV/u, pitch 0–85°, density 0–1e20 m⁻³.');
 if(!Number.isSafeInteger(c.particles)||c.particles<1||c.particles>4096||!Number.isSafeInteger(c.seed)||c.seed<0||c.seed>0xffffffff)throw new Error('Use 1–4096 independent tracers and a uint32 seed.');
}

/** Exact Lorentz orbit in B=Bz; the source is on-axis at z=0.02 L. */
export function hydrogenHelix(c:HydrogenTracerConfig,velocity:Vec,timeS:number){
 const omega=E_CHARGE*c.magneticT/mass,theta=omega*timeS;
 // sinc and (1-cos θ)/θ retain the straight-line limit without cancellation.
 const sinc=Math.abs(theta)<1e-5?1-theta*theta/6+theta**4/120:Math.sin(theta)/theta;
 const cosc=Math.abs(theta)<1e-5?theta/2-theta**3/24+theta**5/720:2*Math.sin(theta/2)**2/theta;
 const [vx,vy,vz]=velocity;
 return {position:[timeS*(vx*sinc+vy*cosc),timeS*(vy*sinc-vx*cosc),.02*c.lengthM+vz*timeS] as Vec,
  velocity:[vx*Math.cos(theta)+vy*Math.sin(theta),vy*Math.cos(theta)-vx*Math.sin(theta),vz] as Vec};
}

export function uninterruptedHydrogenExit(c:HydrogenTracerConfig,velocity:Vec){
 const transverse=Math.hypot(velocity[0],velocity[1]),omega=Math.abs(E_CHARGE*c.magneticT/mass);
 const end=.98*c.lengthM/velocity[2];let wall=Infinity;
 if(transverse>0){
  if(!omega)wall=c.radiusM/transverse;
  else {const ratio=c.radiusM*omega/(2*transverse);if(ratio<=1)wall=c.radiusM/transverse*(ratio===0?1:Math.asin(ratio)/ratio);}
 }
 return {timeS:Math.min(wall,end),destination:wall<=end?'wall' as const:'end' as const,wallTimeS:wall,endTimeS:end};
}

/** Forward ray intersection; a roundoff-admitted absorbing boundary exits at zero time. */
export function neutralHydrogenExit(c:HydrogenTracerConfig,position:Vec,velocity:Vec){
 if(!position.every(Number.isFinite)||!velocity.every(Number.isFinite)||velocity[2]<=0)throw new Error('Finite forward neutral ray required.');
 const a=velocity[0]**2+velocity[1]**2,b=2*(position[0]*velocity[0]+position[1]*velocity[1]);
 const d=position[0]**2+position[1]**2-c.radiusM**2;
 // At a tangent helix contact the radial gap is second order in time and
 // can round to either side of zero. Admit only this arithmetic error band;
 // an already-on-wall product is absorbed now, never propagated backward.
 const radialRoundoff=32*Number.EPSILON*c.radiusM**2,axialRoundoff=32*Number.EPSILON*c.lengthM;
 if(d>radialRoundoff||position[2]<0||position[2]>c.lengthM+axialRoundoff)throw new Error('Neutral capture position lies outside the absorbing vessel.');
 if(d>=0)return {timeS:0,destination:'wall' as const,position:[...position] as Vec};
 if(position[2]>=c.lengthM)return {timeS:0,destination:'end' as const,position:[...position] as Vec};
 const root=Math.sqrt(Math.max(0,b*b-4*a*d));
 const wall=a>0?(b>=0?-2*d/(b+root):(-b+root)/(2*a)):Infinity;
 const end=(c.lengthM-position[2])/velocity[2],timeS=Math.min(wall,end);
 return {timeS,destination:wall<=end?'wall' as const:'end' as const,position:plus(position,scale(velocity,timeS))};
}

export interface HydrogenTrace {
 initialVelocity:Vec;captured:boolean;captureTimeS:number|null;capturePosition:Vec|null;
 destination:'wall'|'end';exitTimeS:number;exitPosition:Vec;exitVelocity:Vec;exitChargeState:0|1;
 slowIon:{position:Vec;velocity:Vec;chargeState:1;fate:'retained-field-only'}|null;
 ledger:{reactionKineticErrorJ:number;reactionMomentumErrorKGMS:Vec;externalMagneticImpulseKGMS:Vec;
  mechanicalAngularChange:number;externalMagneticAngularImpulse:number;mechanicalAngularBalanceError:number;
  finalCanonicalAngularMomentum:number;canonicalAngularError:number};
}

/** One exact first-event realization. No product scattering is inferred from the total fit. */
export function traceHydrogenFirstCapture(c:HydrogenTracerConfig,uniform:number,azimuth=0):HydrogenTrace{
 validateHydrogenTracer(c);
 if(!Number.isFinite(azimuth))throw new Error('Finite launch azimuth required.');
 const speed=Math.sqrt(2*c.energyEVPerU*E_CHARGE/AMU),pitch=c.pitchDeg*Math.PI/180;
 const initialVelocity:Vec=[speed*Math.sin(pitch)*Math.cos(azimuth),speed*Math.sin(pitch)*Math.sin(azimuth),speed*Math.cos(pitch)];
 const exit=uninterruptedHydrogenExit(c,initialVelocity),hazard=hydrogenCaptureHazard(initialVelocity,c.neutralDensityM3);
 const captureTime=constantCaptureTime(hazard.ratePerS,uniform);
 // Absorbing boundaries take precedence at a numerical tie (zero-probability event).
 const tie=32*Number.EPSILON*Math.max(exit.timeS,captureTime===Infinity?0:captureTime);
 const captured=captureTime<exit.timeS-tie;
 const charged=hydrogenHelix(c,initialVelocity,captured?captureTime:exit.timeS);
 const neutral=captured?neutralHydrogenExit(c,charged.position,charged.velocity):null;
 const products=captured?hydrogenCaptureProducts({atomicIdentity:'H-1',massU:PROTON_MASS_U,chargeState:1,velocityMS:charged.velocity},
  {atomicIdentity:'H-1',massU:PROTON_MASS_U,chargeState:0,velocityMS:[0,0,0]}):null;
 const exitPosition=neutral?.position??charged.position,exitVelocity=charged.velocity;
 const slowIon=products?{position:charged.position,velocity:products.slowIon.velocityMS,chargeState:1 as const,fate:'retained-field-only' as const}:null;
 const finalAngular=ptheta(exitPosition,exitVelocity,captured?0:1,c.magneticT)+(slowIon?ptheta(slowIon.position,slowIon.velocity,1,c.magneticT):0);
 const reactionEnergy=products ? .5*mass*(dot(products.fastNeutral.velocityMS,products.fastNeutral.velocityMS)+dot(products.slowIon.velocityMS,products.slowIon.velocityMS)-dot(charged.velocity,charged.velocity)) : 0;
 const reactionMomentum=products?scale(plus(plus(products.fastNeutral.velocityMS,products.slowIon.velocityMS),scale(charged.velocity,-1)),mass):[0,0,0] as Vec;
 const mechanicalAngular=ptheta(exitPosition,exitVelocity,0,c.magneticT),fieldAngular=-E_CHARGE*c.magneticT*(charged.position[0]**2+charged.position[1]**2)/2;
 return {initialVelocity,captured,captureTimeS:captured?captureTime:null,capturePosition:captured?charged.position:null,
  destination:neutral?.destination??exit.destination,exitTimeS:captured?captureTime+neutral!.timeS:exit.timeS,
  exitPosition,exitVelocity,exitChargeState:captured?0:1,slowIon,
  ledger:{reactionKineticErrorJ:reactionEnergy,reactionMomentumErrorKGMS:reactionMomentum,
   externalMagneticImpulseKGMS:scale(plus(exitVelocity,scale(initialVelocity,-1)),mass),
   mechanicalAngularChange:mechanicalAngular,externalMagneticAngularImpulse:fieldAngular,mechanicalAngularBalanceError:mechanicalAngular-fieldAngular,
   finalCanonicalAngularMomentum:finalAngular,canonicalAngularError:finalAngular}};
}

function drawPath(c:HydrogenTracerConfig,trace:HydrogenTrace){
 const chargedTime=trace.captureTimeS??trace.exitTimeS,angle=Math.abs(E_CHARGE*c.magneticT/mass*chargedTime);
 const samples=Math.max(24,Math.ceil(angle/.05));
 // Never connect undersampled gyro turns. The full 3D line is unavailable
 // beyond this explicit display budget; analytic event results remain valid.
 const charged=samples<=4096?Array.from({length:samples+1},(_,i)=>hydrogenHelix(c,trace.initialVelocity,chargedTime*i/samples).position):[];
 // Every complete turn has exactly the same transverse footprint. Showing
 // the first turn plus its true terminal point avoids projected aliasing.
 const xyTime=angle>2*Math.PI?chargedTime*2*Math.PI/angle:chargedTime,xySteps=Math.max(32,Math.ceil(Math.min(angle,2*Math.PI)/.025));
 const chargedProjectionXY=Array.from({length:xySteps+1},(_,i)=>hydrogenHelix(c,trace.initialVelocity,xyTime*i/xySteps).position.slice(0,2));
 return {destination:trace.destination,charged,chargedDisplay:charged.length?'resolved-full-path' as const:'withheld-phase-resolution' as const,
  chargedProjectionXY,chargedTerminalPosition:hydrogenHelix(c,trace.initialVelocity,chargedTime).position,
  neutral:trace.captured?[trace.capturePosition!,trace.exitPosition]:[],slowIon:trace.slowIon?.position??null};
}

export function simulateHydrogenTracer(c:HydrogenTracerConfig){
 validateHydrogenTracer(c);
 const captureRandom=createRandomStream(c.seed,0x43584831),angleRandom=createRandomStream(c.seed,0x415a4831);
 const traces=Array.from({length:c.particles},()=>traceHydrogenFirstCapture(c,captureRandom(),2*Math.PI*angleRandom()));
 const captures=traces.filter(t=>t.captured).length,speed=norm(traces[0].initialVelocity);
 const uninterrupted=uninterruptedHydrogenExit(c,traces[0].initialVelocity),rate=hydrogenCaptureHazard(traces[0].initialVelocity,c.neutralDensityM3).ratePerS;
 const times=Array.from({length:65},(_,i)=>uninterrupted.timeS*i/64),angularScale=mass*speed*c.radiusM;
 const primary={injected:c.particles,chargedOut:c.particles-captures,neutralOut:captures,
  wall:traces.filter(t=>t.destination==='wall').length,end:traces.filter(t=>t.destination==='end').length,remaining:0};
 const ledger={incomingTaggedNuclei:c.particles,incomingReservoirNuclei:captures,outgoingTaggedNuclei:c.particles,
  retainedReservoirIons:captures,reservoirNetNeutralsConsumed:captures,
  incomingChargeE:c.particles,outgoingChargeE:c.particles-captures,retainedChargeE:captures,
  initialNuclearKineticJ:c.particles*.5*mass*speed**2,
  finalNuclearKineticJ:traces.reduce((sum,t)=>sum+.5*mass*dot(t.exitVelocity,t.exitVelocity),0),
  maxNormalizedCanonicalAngularError:Math.max(...traces.map(t=>Math.abs(t.ledger.canonicalAngularError)/angularScale))};
 return {kind:'restricted-H1-first-capture-tracer' as const,config:{...c},randomSource:RANDOM_STREAM_VERSION,
  qualification:'Conditional first-capture approximation; not full physical transport.',
  scope:['H-1 only; uniform B, E=RF=0; on-axis monoenergetic launch at z=0.02 L.',
   'Total capture fit supplies event probability, not a validated differential nuclear-scattering law.',
   'Straight-through capture products; fast neutral ballistic; slow ion has prescribed-field-only motion.',
   'Further neutral scattering, secondary reactions, ion-ion collisions, electron inertia and gas/plasma response are not modeled.',
   'Full 3D display is withheld beyond 4096 segments at ≤0.05 rad phase/segment; the exact transverse footprint omits identical repeated turns.',
   'No cross section is extrapolated to the stationary slow ion; its subsequent atomic kinetics remain unresolved.'],
  horizonS:uninterrupted.endTimeS,primary,ledger,traces,paths:traces.slice(0,12).map(t=>drawPath(c,t)),
  expectedCaptureFraction:-Math.expm1(-rate*uninterrupted.timeS),
  curves:[{label:'Analytic survival for prescribed fit',x:times.map(t=>t*1e6),y:times.map(t=>Math.exp(-rate*t)),xLabel:'Time before uninterrupted exit (µs)',yLabel:'Uncaptured tagged fraction',color:'#a4c4b1'},
   {label:'Sampled first-capture survival',x:times.map(t=>t*1e6),y:times.map(t=>traces.filter(v=>v.captureTimeS===null||v.captureTimeS>t).length/c.particles),xLabel:'Time before uninterrupted exit (µs)',yLabel:'Uncaptured tagged fraction',color:'#d2956b'}]};
}

import { collisionProbability, elasticCollision } from './collisions.js';
import {locateOrbitEvent,type OrbitDrive,type OrbitAdvance} from './orbit-events.js';
/** Prescribed-field orbit models. SI except explicit eV/u inputs.
 * Coordinates: z axial, x/y transverse. phi=V(1-r²/a²), B=Bz.
 * Electron response and field penetration are assumptions, not solved results.
 */
export const E_CHARGE = 1.602176634e-19;
export const AMU = 1.66053906660e-27;
export type Vec = [number, number, number];
export interface Particle { position: Vec; velocity: Vec }
export interface Fields { electric: Vec; magnetic: Vec }
export interface Model { radius: number; length: number; magneticT: number; voltage: number }
export interface IonSpecies { massU: number; chargeState: number }
export interface RunConfig extends Model {
  seed: number;
  particlesPerSpecies: number;
  perpendicularEV: number;
  parallelEV: number;
  sourceRadius: number;
  dt: number;
  duration: number;
  mode?: 'rotating' | 'icr';
  distribution?: 'fixed' | 'thermal';
  axialTemperatureEV?: number;
  species?: IonSpecies[];
  rfAmplitudeVM?: number;
  rfFrequencyHz?: number;
  rfHandedness?: -1 | 1;
  neutralDensityM3?: number;
  neutralCrossSectionM2?: number;
  neutralMassU?: number;
}
export type Destination = 'wall' | 'end' | 'source';
export interface Hit { fraction: number; destination: Destination; position: Vec }
export interface SpeciesResult {
  massU: number;
  chargeState: number;
  injected: number;
  wall: number;
  end: number;
  source: number;
  remaining: number;
  wallAxialBins: number[];
  endRadialBins: number[];
  maxRelativeEnergyError: number;
  maxRelativeImpactEnergyError: number;
  collisions: number;
  rfWorkEV: number;
  neutralEnergyEV: number;
  meanInitialKineticEV: number;
  impacts: { destination: Destination; time: number; kineticEV: number; position: Vec }[];
  paths: { positions: Vec[]; destination: Destination | 'remaining' }[];
}
export const DEFAULT_CONFIG: RunConfig = {
  radius: .48, length: 2.8, magneticT: .10, voltage: 400,
  seed: 42, particlesPerSpecies: 96, perpendicularEV: .5, parallelEV: 20,
  sourceRadius: .04, dt: 5e-8, duration: .0006,
};
const add = (a: Vec, b: Vec): Vec => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
const scale = (a: Vec, s: number): Vec => [a[0]*s, a[1]*s, a[2]*s];
const cross = (a: Vec, b: Vec): Vec => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const norm2 = (a: Vec): number => a[0]**2+a[1]**2+a[2]**2;

export function fields(position: Vec, model: Model): Fields {
  const slope = 2 * model.voltage / model.radius**2;
  return { electric: [slope*position[0], slope*position[1], 0], magnetic: [0,0,model.magneticT] };
}

/** Uniform circular RF drive, continuously present throughout the ideal chamber. */
export function rfField(time: number, amplitudeVM: number, frequencyHz: number, handedness: -1|1): Vec {
  const phase=2*Math.PI*frequencyHz*time;
  return [amplitudeVM*Math.cos(phase),handedness*amplitudeVM*Math.sin(phase),0];
}

export function gaussian(random: () => number): number {
  return Math.sqrt(-2*Math.log(1-random()))*Math.cos(2*Math.PI*random());
}

/** A pulsed drifting source at z=0; negative axial velocities return to the source. */
export function sourceVelocity(massU: number, transverseEV: number, beamEV: number,
  axialTemperatureEV: number, phase: number, distribution: 'fixed'|'thermal', random: () => number): Vec {
  const mass=massU*AMU,beam=Math.sqrt(2*E_CHARGE*beamEV/mass);
  if(distribution==='fixed') {
    const speed=Math.sqrt(2*E_CHARGE*transverseEV/mass);
    return [speed*Math.cos(phase),speed*Math.sin(phase),beam];
  }
  const sigma=Math.sqrt(E_CHARGE*transverseEV/mass);
  return [sigma*gaussian(random),sigma*gaussian(random),beam+Math.sqrt(E_CHARGE*axialTemperatureEV/mass)*gaussian(random)];
}

/** Symmetric drift–Boris-kick–drift: positions and velocities at the same time. */
export function step(p: Particle, chargeOverMass: number, dt: number,
  evaluate: (position: Vec) => Fields): Particle {
  const midpoint = add(p.position, scale(p.velocity, dt/2));
  const f = evaluate(midpoint);
  const impulse = scale(f.electric, chargeOverMass*dt/2);
  const minus = add(p.velocity, impulse);
  const t = scale(f.magnetic, chargeOverMass*dt/2);
  const s = scale(t, 2/(1+norm2(t)));
  const prime = add(minus, cross(minus, t));
  const velocity = add(add(minus, cross(prime, s)), impulse);
  return { position: add(midpoint, scale(velocity, dt/2)), velocity };
}

/** Advance a validated prescribed-field orbit to its first absorbing contact.
 * Boundary localization consumes no random numbers. The full proposed step is
 * returned separately inside simulate for its collision-resolution check.
 */
export function advanceOrbit(p:Particle,qm:number,dt:number,model:Model,drive?:OrbitDrive):OrbitAdvance{
 const at=(elapsed:number):Particle=>{
  if(elapsed===0)return {position:[...p.position],velocity:[...p.velocity]};
  const rf=drive?rfField(drive.timeS+elapsed/2,drive.amplitudeVM,drive.frequencyHz,drive.handedness):[0,0,0] as Vec;
  return step(p,qm,elapsed,position=>{
   const f=fields(position,model);return {...f,electric:add(f.electric,rf)};
  });
 };
 return locateOrbitEvent(p,qm,dt,model,at,at(dt),drive);
}

export function energy(p: Particle, mass: number, charge: number, model: Model): number {
  const r2 = p.position[0]**2+p.position[1]**2;
  return mass*norm2(p.velocity)/2 + charge*model.voltage*(1-r2/model.radius**2);
}

/** Infinite-length, ideal cold-orbit threshold; not a finite-device efficiency. */
export function cutoffMassU(model: Model, chargeState = 1): number | null {
  if (model.voltage <= 0 || chargeState <= 0) return null;
  return chargeState*E_CHARGE*model.magneticT**2*model.radius**2/(8*model.voltage*AMU);
}

/** First crossing of the straight numerical substep, with physical surface position.
 * Curved-path crossing accuracy is controlled by timestep convergence.
 */
export function firstHit(start: Vec, end: Vec, model: Model): Hit | null {
  const d: Vec = [end[0]-start[0], end[1]-start[1], end[2]-start[2]];
  const candidates: { fraction: number; destination: Destination }[] = [];
  const A=d[0]**2+d[1]**2, B=2*(start[0]*d[0]+start[1]*d[1]);
  const C=start[0]**2+start[1]**2-model.radius**2;
  const discriminant=B*B-4*A*C;
  if (A>0 && discriminant>=0) {
    const fraction=(-B+Math.sqrt(discriminant))/(2*A);
    if (fraction>=0 && fraction<=1) candidates.push({ fraction, destination: 'wall' });
  }
  if (d[2]>0) {
    const fraction=(model.length-start[2])/d[2];
    if (fraction>=0 && fraction<=1) candidates.push({ fraction, destination: 'end' });
  } else if (d[2]<0) {
    const fraction=-start[2]/d[2];
    if (fraction>=0 && fraction<=1) candidates.push({ fraction, destination: 'source' });
  }
  candidates.sort((a,b)=>a.fraction-b.fraction);
  const hit=candidates[0];
  return hit ? { ...hit, position: add(start,scale(d,hit.fraction)) } : null;
}

export function validate(config: RunConfig): void {
  const scalars=['radius','length','magneticT','voltage','seed','particlesPerSpecies','perpendicularEV','parallelEV','sourceRadius','dt','duration'] as const;
  if (!scalars.every(key=>Number.isFinite(config[key]))) throw new Error('All inputs must be finite.');
  for (const key of ['radius','length','parallelEV','dt','duration'] as const) {
    if (config[key]<=0) throw new Error(`${key} must be positive.`);
  }
  if (config.perpendicularEV<0 || config.sourceRadius<=0 || config.sourceRadius>=config.radius)
    throw new Error('Source must have nonnegative energy and lie strictly inside the chamber.');
  if (!Number.isInteger(config.seed) || config.seed<0 || config.seed>0xffffffff)
    throw new Error('Seed must be a uint32 integer.');
  if (!Number.isInteger(config.particlesPerSpecies) || config.particlesPerSpecies<1 || config.particlesPerSpecies>1000)
    throw new Error('Use 1–1000 particles per species for this browser solver.');
  // Explicit compute budget and gyro-resolution invariant for the supported species.
  if (config.duration/config.dt>100000) throw new Error('Run exceeds 100000 physical steps.');
  const ions=config.species??[{massU:40,chargeState:1},{massU:84,chargeState:1}];
  if(ions.length!==2 || ions.some(s=>!Number.isFinite(s.massU)||s.massU<=0||!Number.isInteger(s.chargeState)||s.chargeState<1))
    throw new Error('Two positive-mass, positive-integer-charge species are required.');
  for(const value of [config.axialTemperatureEV??0,config.rfAmplitudeVM??0,config.rfFrequencyHz??0,
    config.neutralDensityM3??0,config.neutralCrossSectionM2??1e-19])
    if(!Number.isFinite(value)||value<0) throw new Error('Source, RF and neutral parameters must be finite and nonnegative.');
  if(!Number.isFinite(config.neutralMassU??40)||(config.neutralMassU??40)<=0) throw new Error('Neutral mass must be positive.');
  if(config.mode!==undefined && !['rotating','icr'].includes(config.mode)) throw new Error('Unknown orbit model.');
  if(config.distribution!==undefined && !['fixed','thermal'].includes(config.distribution)) throw new Error('Unknown source distribution.');
  if(config.rfHandedness!==undefined && ![-1,1].includes(config.rfHandedness)) throw new Error('RF handedness must be -1 or +1.');
  if(config.mode==='icr' && config.voltage!==0) throw new Error('This ICR mode uses RF without a DC radial potential.');
  const maxQM=Math.max(...ions.map(s=>E_CHARGE*s.chargeState/(s.massU*AMU)));
  const omega=maxQM*Math.abs(config.magneticT);
  const electricRate=Math.sqrt(maxQM*Math.abs(2*config.voltage/config.radius**2));
  const rfRate=config.mode==='icr'?2*Math.PI*(config.rfFrequencyHz??0):0;
  // Include constant RF too: frequency alone cannot resolve accelerated wall crossings.
  const rfAccelerationRate=config.mode==='icr'?Math.sqrt(maxQM*(config.rfAmplitudeVM??0)/config.radius):0;
  if (config.dt*Math.max(omega,electricRate,rfRate,rfAccelerationRate)>.03)
    throw new Error('Timestep must resolve gyrofrequency, RF frequency and electric acceleration.');
}

function randomGenerator(seed: number): () => number {
  let state=seed>>>0;
  return () => { state=(Math.imul(1664525,state)+1013904223)>>>0; return state/4294967296; };
}

export function simulate(config: RunConfig): { config: RunConfig; species: SpeciesResult[]; cutoffMassU: number | null } {
  validate(config);
  // Identical source samples for both masses: fair initial-condition comparison.
  const random=randomGenerator(config.seed);
  const samples=Array.from({length:config.particlesPerSpecies},()=>({
    r:config.sourceRadius*Math.sqrt(random()), angle:random()*2*Math.PI, phase:random()*2*Math.PI,
  }));
  const species=(config.species??[{massU:40,chargeState:1},{massU:84,chargeState:1}]).map(({massU,chargeState})=>{
    const mass=massU*AMU, charge=chargeState*E_CHARGE,qm=charge/mass;
    // Display sampling must resolve the actual dynamical rates too. A 0.1-rad
    // gyro chord has <0.125% radial sag; the old fixed stride allowed 0.48 rad.
    const displayRate=Math.max(Math.abs(qm*config.magneticT),Math.sqrt(Math.abs(2*qm*config.voltage/config.radius**2)),
      config.mode==='icr'?2*Math.PI*(config.rfFrequencyHz??0):0,
      config.mode==='icr'?Math.sqrt(qm*(config.rfAmplitudeVM??0)/config.radius):0);
    const pathStride=Math.max(1,Math.min(16,Math.floor(.1/(config.dt*displayRate))));
    const result: SpeciesResult={massU,chargeState,injected:samples.length,wall:0,end:0,source:0,remaining:0,
      collisions:0,rfWorkEV:0,neutralEnergyEV:0,meanInitialKineticEV:0,impacts:[],
      wallAxialBins:Array(24).fill(0),endRadialBins:Array(24).fill(0),maxRelativeEnergyError:0,maxRelativeImpactEnergyError:0,paths:[]};
    // Independent random streams keep source samples identical when only collisions change.
    const velocityRandom=randomGenerator(config.seed^0xa341316c),collisionRandom=randomGenerator(config.seed^0x9e3779b9);
    samples.forEach((sample,index)=>{
      let p: Particle={position:[sample.r*Math.cos(sample.angle),sample.r*Math.sin(sample.angle),0],
        velocity:sourceVelocity(massU,config.perpendicularEV,config.parallelEV,config.axialTemperatureEV??0,
          sample.phase,config.distribution??'fixed',velocityRandom)};
      const positions: Vec[]=[p.position];
      const initialEnergy=energy(p,mass,charge,config);
      result.meanInitialKineticEV+=mass*norm2(p.velocity)/(2*E_CHARGE*samples.length);
      const energyScale=Math.max(Math.abs(initialEnergy),E_CHARGE*(config.parallelEV+config.perpendicularEV));
      let rfWork=0,collisionEnergy=0;
      let destination: Destination|'remaining'='remaining',time=0,indexStep=0;
      while(time<config.duration){
        const dt=Math.min(config.dt,config.duration-time);
        const rf=config.mode==='icr'?rfField(time+dt/2,config.rfAmplitudeVM??0,config.rfFrequencyHz??0,config.rfHandedness??-1):[0,0,0] as Vec;
        const next=step(p,qm,dt,position=>{
          const f=fields(position,config);return {...f,electric:add(f.electric,rf)};
        });
        // Resolution is a property of the whole proposed step, including steps
        // that encounter an absorbing surface. Do not bypass it on collection.
        const speed=Math.max(Math.sqrt(norm2(p.velocity)),Math.sqrt(norm2(next.velocity)));
        const opticalDepth=(config.neutralDensityM3??0)*(config.neutralCrossSectionM2??1e-19)*speed*dt;
        if(opticalDepth>.02) throw new Error('Collision timestep unresolved: reduce density/cross section or timestep.');
        const drive=config.mode==='icr'?{timeS:time,amplitudeVM:config.rfAmplitudeVM??0,
          frequencyHz:config.rfFrequencyHz??0,handedness:config.rfHandedness??-1 as -1|1}:undefined;
        const at=(elapsed:number):Particle=>{
          if(elapsed===0)return {position:[...p.position],velocity:[...p.velocity]};
          const partialRF=drive?rfField(time+elapsed/2,drive.amplitudeVM,drive.frequencyHz,drive.handedness):[0,0,0] as Vec;
          return step(p,qm,elapsed,position=>{
            const f=fields(position,config);return {...f,electric:add(f.electric,partialRF)};
          });
        };
        const advanced=locateOrbitEvent(p,qm,dt,config,at,next,drive),hit=advanced.hit;
        const displacement=next.position.map((v,i)=>v-p.position[i]);
        const work=charge*rf.reduce((sum,v,i)=>sum+v*displacement[i],0);
        rfWork+=work;
        const error=Math.abs(energy(next,mass,charge,config)-initialEnergy-rfWork-collisionEnergy)/energyScale;
        result.maxRelativeEnergyError=Math.max(result.maxRelativeEnergyError,error);
        if(hit){
          destination=hit.destination;
          if(destination==='wall') result.wallAxialBins[Math.min(23,Math.floor(24*hit.position[2]/config.length))]++;
          if(destination==='end') result.endRadialBins[Math.min(23,Math.floor(24*Math.hypot(hit.position[0],hit.position[1])/config.radius))]++;
          const impactDt=advanced.elapsedS;
          const impactRF=config.mode==='icr'?rfField(time+impactDt/2,config.rfAmplitudeVM??0,
            config.rfFrequencyHz??0,config.rfHandedness??-1):[0,0,0] as Vec;
          const impact=advanced.particle;
          const impactWork=charge*impactRF.reduce((sum,v,i)=>sum+v*(impact.position[i]-p.position[i]),0);
          rfWork+=impactWork-work;
          result.impacts.push({destination,time:time+impactDt,kineticEV:mass*norm2(impact.velocity)/(2*E_CHARGE),position:hit.position});
          // Keep the fractional-contact energy residual separate from the full
          // proposed-step diagnostic; both still require timestep convergence.
          const impactError=Math.abs(energy({position:hit.position,velocity:impact.velocity},mass,charge,config)
            -initialEnergy-rfWork-collisionEnergy)/energyScale;
          result.maxRelativeImpactEnergyError=Math.max(result.maxRelativeImpactEnergyError,impactError);
          if(index<8) positions.push(hit.position);
          break;
        }
        let hadCollision=false;
        if(collisionRandom()<collisionProbability(Math.sqrt(norm2(next.velocity)),config.neutralDensityM3??0,config.neutralCrossSectionM2??1e-19,dt)) {
          const scattered=elasticCollision(next.velocity,massU,config.neutralMassU??40,collisionRandom);
          collisionEnergy+=mass*(norm2(scattered.ionVelocity)-norm2(next.velocity))/2;
          next.velocity=scattered.ionVelocity;result.collisions++;
          // An instantaneous velocity change is a real path corner.
          if(index<8)positions.push(next.position);
          // Already retained at this step; do not duplicate its stride sample.
          hadCollision=true;
        }
        p=next;time+=dt;indexStep++;
        if(index<8 && !hadCollision && indexStep%pathStride===0) positions.push(p.position);
      }
      result[destination]++;
      result.rfWorkEV+=rfWork/E_CHARGE;
      result.neutralEnergyEV-=collisionEnergy/E_CHARGE;
      if(index<8){if(destination==='remaining'&&positions.at(-1)!==p.position) positions.push(p.position);result.paths.push({positions,destination});}
    });
    return result;
  });
  return {config:{...config},species,cutoffMassU:cutoffMassU(config)};
}

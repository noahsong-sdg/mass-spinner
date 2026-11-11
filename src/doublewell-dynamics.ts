import {AMU,E_CHARGE,gaussian,type IonSpecies,type Particle,type Vec} from './physics.js';
import {collideCoulombCell,type CoulombIon,type CoulombScatteringMethod} from './coulomb.js';
import {advanceDoublewell,canonicalMomentum,doublewellEnergy,quarticPotential,validateDoublewellOrbitSettings,type DoublewellModel} from './doublewell-orbits.js';
import type {Curve} from './ensemble.js';
import {inspectDoublewellRegime} from './doublewell-regime.js';
import {adaptiveCollisionCells,circleRectangleArea,collisionDensityDiagnostics} from './collision-locality.js';
import {axisymmetricGrid,axisymmetricCollisionCells,collideAxisymmetricCell,cylindricalVelocity} from './axisymmetric-collisions.js';
import {createRandomStream,RANDOM_STREAM_VERSION} from './random-stream.js';
export {circleRectangleArea} from './collision-locality.js';
export type DoublewellExecutionMode='interactive'|'research';
export type DoublewellRandomSource='mulberry32-v1'|typeof RANDOM_STREAM_VERSION;
/** Omitted persisted selectors retain the historical stream; null is invalid. */
export function resolveDoublewellRandomSource(value:unknown):DoublewellRandomSource{
 if(value===undefined||value==='mulberry32-v1')return 'mulberry32-v1';
 if(value===RANDOM_STREAM_VERSION)return value;
 throw new Error('Unknown double-well random source.');
}

export interface DoublewellConfig extends DoublewellModel {
 densityM3:number;ionTemperatureEV:number;electronTemperatureEV:number;coulombLog:number;
 particlesPerSpecies:number;cellsAcross:number;dt:number;duration:number;seed:number;
 species:IonSpecies[];boundary:'closed'|'open';initialState:'pulse'|'equilibrium';
 rotationMode:'common'|'zero-canonical';rotationRadS:number;beamEV:number;
 sourceRadius:number;pulseLengthFraction:number;collisions:boolean;
 collisionMethod?:'fixed'|'adaptive'|'axisymmetric';collisionTarget?:number;collisionMaxDepth?:number;collisionSourceAligned?:boolean;
 collisionScattering?:CoulombScatteringMethod;collisionAxialCells?:number;
 randomSource?:DoublewellRandomSource;
}
export const DEFAULT_DOUBLEWELL:DoublewellConfig={radius:.2,length:.6,magneticT:.06,voltage:20,quadraticShape:1.2,
 densityM3:1e18,ionTemperatureEV:5,electronTemperatureEV:5,coulombLog:10,particlesPerSpecies:128,
 cellsAcross:3,dt:1e-7,duration:2e-4,seed:42,species:[{massU:40,chargeState:1},{massU:84,chargeState:1}],
 boundary:'open',initialState:'pulse',rotationMode:'zero-canonical',rotationRadS:-20000,beamEV:5,
 sourceRadius:.08,pulseLengthFraction:.25,collisions:true,randomSource:RANDOM_STREAM_VERSION};
interface Ion extends Particle,CoulombIon {speciesIndex:number;active:boolean}
const norm2=(v:Vec)=>v.reduce((sum,x)=>sum+x*x,0);
function rng(seed:number){let state=seed>>>0;return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;
 t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}

/** Explicit offline research admission raises particle/work ceilings. Both modes
 * retain the same physical-step and orbit-resolution bounds; physics is identical.
 */
export function validateDoublewell(config:DoublewellConfig,executionMode:DoublewellExecutionMode='interactive'){
 const c=config;
 resolveDoublewellRandomSource(c.randomSource);
 if(executionMode!=='interactive'&&executionMode!=='research')throw new Error('Unknown double-well execution mode.');
 const maximumParticles=executionMode==='research'?65536:4096;
 const maximumParticleSteps=executionMode==='research'?32e7:8e7;
 if(![c.densityM3,c.ionTemperatureEV,c.electronTemperatureEV,c.coulombLog,c.duration,c.rotationRadS,c.beamEV,c.sourceRadius,c.pulseLengthFraction].every(Number.isFinite)
  ||c.densityM3<=0||c.ionTemperatureEV<=0||c.electronTemperatureEV<=0||c.coulombLog<=0||c.duration<=0||c.beamEV<0
  ||c.sourceRadius<=0||c.sourceRadius>=c.radius||c.pulseLengthFraction<=0||c.pulseLengthFraction>1)
  throw new Error('Double-well density/temperatures/log/time must be positive, with a finite interior pulse.');
 if(!Number.isSafeInteger(c.seed)||c.seed<0||c.seed>0xffffffff||!Number.isInteger(c.particlesPerSpecies)||c.particlesPerSpecies<8||c.particlesPerSpecies>maximumParticles
  ||!Number.isInteger(c.cellsAcross)||c.cellsAcross<2||c.cellsAcross>12||c.duration/c.dt>40000
  ||2*c.particlesPerSpecies*c.duration/c.dt>maximumParticleSteps)
  throw new Error(`Use 8–${maximumParticles} representatives/species, 2–12 cells across, and at most 40000 steps / ${maximumParticleSteps/1e6} million particle steps.`);
 if(!['closed','open'].includes(c.boundary)||!['pulse','equilibrium'].includes(c.initialState)
  ||!['common','zero-canonical'].includes(c.rotationMode)||typeof c.collisions!=='boolean'
  ||c.species.length!==2)throw new Error('Unknown double-well boundary, initial state or two-species configuration.');
 c.species.forEach(s=>validateDoublewellOrbitSettings(s,c.dt,c));
 if(!['fixed','adaptive','axisymmetric'].includes(c.collisionMethod??'fixed')
  ||c.collisionSourceAligned!==undefined&&typeof c.collisionSourceAligned!=='boolean'
  ||!Number.isInteger(c.collisionTarget??32)||(c.collisionTarget??32)<16||(c.collisionTarget??32)>256
  ||!Number.isInteger(c.collisionMaxDepth??15)||(c.collisionMaxDepth??15)<3||(c.collisionMaxDepth??15)>24)
  throw new Error('Collision locality requires fixed/adaptive/axisymmetric mode, target 16–256 and depth 3–24.');
 if(!['takizuka-abe','nanbu'].includes(c.collisionScattering??'takizuka-abe')
  ||c.collisionAxialCells!==undefined&&(!Number.isSafeInteger(c.collisionAxialCells)||c.collisionAxialCells<1||c.collisionAxialCells>1024))
  throw new Error('Use TA or Nanbu scattering and 1–1024 axial ring cells.');
 if(c.initialState==='equilibrium'&&(c.boundary!=='closed'||c.rotationMode!=='common'||c.beamEV!==0))
  throw new Error('The equilibrium benchmark requires closed boundaries, common rotation and zero axial beam.');
}

/** Stated initial-state regime, not a solved electron response or measured log Λ. */
export function doublewellRegime(c:DoublewellConfig){
 const r=inspectDoublewellRegime(c,[]).reference;
 return {debyeM:r.debyeM,particlesPerDebyeSphere:r.debyePopulation,coupling:r.maxCoupling,
  estimatedCoulombLog:r.minEstimatedCoulombLog,encounterMagnetization:r.maxEncounterMagnetization};
}

function equilibriumRadii(c:DoublewellConfig,s:IonSpecies){
 // Integrate in r²: the cylindrical Jacobian is then constant.
 const bins=4096,logWeight=Array.from({length:bins+1},(_,i)=>{
  const r2=c.radius**2*i/bins;
  return(-s.chargeState*quarticPotential([Math.sqrt(r2),0,0],c)
   +(s.massU*AMU*c.rotationRadS**2+s.chargeState*E_CHARGE*c.rotationRadS*c.magneticT)*r2/(2*E_CHARGE))/c.ionTemperatureEV;
 });
 const quadratic=s.chargeState*c.voltage/c.ionTemperatureEV;
 const linear=s.chargeState*c.voltage*c.quadraticShape/c.ionTemperatureEV
  +(s.massU*AMU*c.rotationRadS**2+s.chargeState*E_CHARGE*c.rotationRadS*c.magneticT)*c.radius**2/(2*E_CHARGE*c.ionTemperatureEV);
 const mode=quadratic>0?Math.max(0,Math.min(1,linear/(2*quadratic))):linear>0?1:0;
 const max=-quadratic*mode**2+linear*mode;
 const weights=logWeight.map(x=>Math.exp(x-max)),cdf=[0];let lowerIntegral=0;
 for(let i=1;i<=bins;i++)cdf.push(cdf[i-1]+(weights[i-1]+weights[i])/2);
 // The log weight is concave in r²; endpoint minima bound each interval's
 // integral below. Their sum gives an upper bound on the normalized peak.
 for(let i=1;i<=bins;i++)lowerIntegral+=Math.min(weights[i-1],weights[i]);
 if(!(lowerIntegral>0))throw new Error('Equilibrium initial density is too sharply concentrated for the initialization grid.');
 const sample=(random:number)=>{
  if(random===0)return 0;
  const target=random*cdf[bins];let low=0,high=bins;
  while(high-low>1){const mid=(low+high)>>>1;if(cdf[mid]<target)low=mid;else high=mid;}
  // Invert the integral of the linearly interpolated weight within this bin.
  const area=target-cdf[low],w=weights[low],slope=weights[high]-w;
  const fraction=slope===0?area/w:2*area/(w+Math.sqrt(Math.max(0,w*w+2*slope*area)));
  return c.radius*Math.sqrt((low+fraction)/bins);
 };
 return {sample,peakRatio:bins/lowerIntegral};
}

export function simulateDoublewell(c:DoublewellConfig,executionMode:DoublewellExecutionMode='interactive'){
 validateDoublewell(c,executionMode);
 const tables=c.initialState==='equilibrium'?c.species.map(s=>equilibriumRadii(c,s)):null;
 const peakRatios=tables?.map(t=>t.peakRatio)??[1,1];
 const meanZ=c.species.reduce((sum,s)=>sum+s.chargeState,0)/2;
 // Sum of species peak bounds, with an additional charge-density bound when
 // their maxima and charge states differ. This is conservative, not a fitted peak.
 const initialPeakDensityM3=c.densityM3*Math.max(peakRatios.reduce((a,b)=>a+b,0)/2,
  peakRatios.reduce((sum,p,i)=>sum+p*c.species[i].chargeState,0)/(2*meanZ));
 const referenceRegime=inspectDoublewellRegime(c,[],initialPeakDensityM3);
 const regime={...doublewellRegime({...c,densityM3:initialPeakDensityM3}),initialPeakDensityM3};
 if(c.collisions&&referenceRegime.reference.reasons.length)
  throw new Error('Initial state is outside the supported weakly coupled, screened, unmagnetized-encounter Coulomb regime.');
 const legacy=resolveDoublewellRandomSource(c.randomSource)==='mulberry32-v1';
 // Philox key word 1 names separate initialization (0) and collision (1) streams.
 const random=legacy?rng(c.seed):createRandomStream(c.seed,0);
 const collisionRandom=legacy?rng(c.seed^0x9e3779b9):createRandomStream(c.seed,1);
 const pulseVolume=Math.PI*c.sourceRadius**2*c.length*c.pulseLengthFraction;
 const columnVolume=Math.PI*c.radius**2*c.length;
 const weight=c.densityM3*(c.initialState==='equilibrium'?columnVolume:pulseVolume)/(2*c.particlesPerSpecies);
 const ions:Ion[]=c.species.flatMap((s,speciesIndex)=>{
  const radial=tables?.[speciesIndex];
  return Array.from({length:c.particlesPerSpecies},()=>{
   const radius=radial?radial.sample(random()):c.sourceRadius*Math.sqrt(random()),angle=2*Math.PI*random();
   const x=radius*Math.cos(angle),y=radius*Math.sin(angle);
   const omega=c.rotationMode==='common'?c.rotationRadS:-s.chargeState*E_CHARGE*c.magneticT/(2*s.massU*AMU);
   const sigma=Math.sqrt(E_CHARGE*c.ionTemperatureEV/(s.massU*AMU));
   return {...s,speciesIndex,active:true,position:[x,y,c.length*random()*(c.initialState==='equilibrium'?1:c.pulseLengthFraction)] as Vec,
    velocity:[sigma*gaussian(random)-omega*y,sigma*gaussian(random)+omega*x,
     sigma*gaussian(random)+Math.sqrt(2*E_CHARGE*c.beamEV/(s.massU*AMU))] as Vec};
  });
 });
 const species=c.species.map(s=>({...s,injected:c.particlesPerSpecies,active:c.particlesPerSpecies,wall:0,end:0,source:0,
  impacts:[] as {destination:'wall'|'end'|'source';time:number;radius:number;energyJ:number;canonicalMomentum:number}[]}));
 const initialH=ions.reduce((sum,p)=>sum+doublewellEnergy(p,p,c),0);
 const initialP=ions.reduce((sum,p)=>sum+canonicalMomentum(p,p,c),0);
 const energyScale=ions.reduce((sum,p)=>sum+p.massU*AMU*norm2(p.velocity)/2+Math.abs(p.chargeState*E_CHARGE*quarticPotential(p.position,c)),0);
 const momentumScale=ions.reduce((sum,p)=>sum+Math.abs(canonicalMomentum(p,p,c))+p.massU*AMU*c.radius*Math.sqrt(E_CHARGE*c.ionTemperatureEV/(p.massU*AMU)),0);
 let energyOut=0,momentumOut=0,collisionTorque=0,absoluteCellTorque=0,absolutePairTorque=0,pairTorqueSquares=0;
 let maxEnergyResidual=0,maxMomentumResidual=0,maxCorrectedMomentumResidual=0;
 const collisions={pairs:0,maxVariance:0,largeAnglePairs:0,unpairedIonSteps:0,activeIonSteps:0,maxCellDensityM3:0,maxCellOccupancy:0,
  pairSeparationSquaredSumM2:0,maxPairSeparationM:0,pairRadialSeparationSquaredSumM2:0,maxPairRadialSeparationM:0};
 const across=c.cellsAcross,width=2*c.radius/across,nz=Math.max(1,Math.ceil(c.length/width)),dz=c.length/nz;
 const ringSettings={radius:c.radius,length:c.length,radialCells:across,axialCells:c.collisionAxialCells??Math.ceil(c.length/(c.radius/across)),
  ...(c.collisionSourceAligned&&c.initialState==='pulse'?{radiusBreakM:c.sourceRadius,axialBreakM:c.length*c.pulseLengthFraction}:{})};
 const ringGrid=c.collisionMethod==='axisymmetric'?axisymmetricGrid(ringSettings):null;
 const maxGap=(edges:number[])=>Math.max(...edges.slice(1).map((x,i)=>x-edges[i]));
 const volumes=Array.from({length:across*across},(_,i)=>{
  const x=i%across,y=Math.floor(i/across);
  return circleRectangleArea(-c.radius+x*width,-c.radius+(x+1)*width,-c.radius+y*width,-c.radius+(y+1)*width,c.radius)*dz;
 });
 function collisionCells(){
  if(c.collisionMethod==='axisymmetric')return axisymmetricCollisionCells(ions.filter(p=>p.active),{...ringSettings,weight});
  if(c.collisionMethod==='adaptive')return adaptiveCollisionCells(ions.filter(p=>p.active),{
   radius:c.radius,length:c.length,weight,target:c.collisionTarget??32,maxDepth:c.collisionMaxDepth??15});
  const cells=new Map<number,Ion[]>();
  for(const p of ions)if(p.active){
   const ix=Math.min(across-1,Math.max(0,Math.floor((p.position[0]+c.radius)/width)));
   const iy=Math.min(across-1,Math.max(0,Math.floor((p.position[1]+c.radius)/width)));
   const iz=Math.min(nz-1,Math.max(0,Math.floor(p.position[2]/dz))),key=ix+across*(iy+across*iz);
   if(!cells.has(key))cells.set(key,[]);cells.get(key)!.push(p);
  }
  return [...cells].map(([key,cell])=>({ions:cell,densityM3:cell.length*weight/volumes[key%(across*across)],volumeM3:volumes[key%(across*across)]}));
 }
 function collide(dt:number){
  if(!c.collisions)return;
  for(const {ions:cell,densityM3:density}of collisionCells()){
   if(!Number.isFinite(density))throw new Error('A collision cell has zero physical volume.');
   const before=cell.reduce((sum,p)=>sum+canonicalMomentum(p,p,c),0);
   const collision=c.collisionMethod==='axisymmetric'?collideAxisymmetricCell<Ion>:collideCoulombCell;
   const d=collision(cell,density,c.coulombLog,dt,collisionRandom,(a,b,impulse)=>{
    const pa=a as Ion,pb=b as Ion;
    const radialGap=Math.hypot(pa.position[0],pa.position[1])-Math.hypot(pb.position[0],pb.position[1]);
    const separation=c.collisionMethod==='axisymmetric'?Math.hypot(radialGap,pa.position[2]-pb.position[2]):Math.hypot(...pa.position.map((x,i)=>x-pb.position[i]));
    collisions.pairSeparationSquaredSumM2+=separation**2;
    collisions.maxPairSeparationM=Math.max(collisions.maxPairSeparationM,separation);
    collisions.pairRadialSeparationSquaredSumM2+=radialGap**2;
    collisions.maxPairRadialSeparationM=Math.max(collisions.maxPairRadialSeparationM,Math.abs(radialGap));
    const torque=c.collisionMethod==='axisymmetric'?radialGap*impulse[1]
     :(pa.position[0]-pb.position[0])*impulse[1]-(pa.position[1]-pb.position[1])*impulse[0];
    absolutePairTorque+=Math.abs(torque);pairTorqueSquares+=torque*torque;
   },c.collisionScattering??'takizuka-abe');
   const torque=cell.reduce((sum,p)=>sum+canonicalMomentum(p,p,c),0)-before;
   collisionTorque+=torque;absoluteCellTorque+=Math.abs(torque);
   collisions.pairs+=d.pairs;collisions.maxVariance=Math.max(collisions.maxVariance,d.maxVariance);
   collisions.largeAnglePairs+=d.largeAnglePairs;collisions.unpairedIonSteps+=d.unpaired;
   collisions.activeIonSteps+=cell.length;collisions.maxCellDensityM3=Math.max(collisions.maxCellDensityM3,density);
   collisions.maxCellOccupancy=Math.max(collisions.maxCellOccupancy,cell.length);
  }
 }
 type Snapshot={time:number;species:{active:number;wall:number;end:number;source:number;meanRadius:number|null;temperatureEV:number|null;rotationRadS:number|null;meanCanonicalMomentum:number|null}[];energyResidual:number;momentumResidual:number;collisionTorque:number};
 const history:Snapshot[]=[];
 const regimeHistory:{time:number;assessment:ReturnType<typeof inspectDoublewellRegime>}[]=[];
 function record(time:number){
  const cells=collisionCells();
  // Ring cells combine azimuths: temperature/drift must use each ion's local
  // cylindrical frame or rigid rotation would be mistaken for thermal spread.
  const regimeCells=c.collisionMethod==='axisymmetric'?cells.map(cell=>({...cell,ions:cell.ions.map(p=>({...p,
   velocity:cylindricalVelocity(p.position,p.velocity)}))})):cells;
  regimeHistory.push({time,assessment:inspectDoublewellRegime(c,regimeCells,initialPeakDensityM3)});
  const h=ions.filter(p=>p.active).reduce((sum,p)=>sum+doublewellEnergy(p,p,c),0)+energyOut-initialH;
  const p=ions.filter(p=>p.active).reduce((sum,p)=>sum+canonicalMomentum(p,p,c),0)+momentumOut-initialP;
  maxEnergyResidual=Math.max(maxEnergyResidual,Math.abs(h)/energyScale);
  maxMomentumResidual=Math.max(maxMomentumResidual,Math.abs(p)/momentumScale);
  maxCorrectedMomentumResidual=Math.max(maxCorrectedMomentumResidual,Math.abs(p-collisionTorque)/momentumScale);
  history.push({time,energyResidual:h/energyScale,momentumResidual:p/momentumScale,collisionTorque:collisionTorque/momentumScale,
   species:species.map((s,i)=>{
    const active=ions.filter(p=>p.active&&p.speciesIndex===i),n=active.length;
    if(!n)return {active:0,wall:s.wall,end:s.end,source:s.source,meanRadius:null,temperatureEV:null,rotationRadS:null,meanCanonicalMomentum:null};
    const sumR2=active.reduce((sum,p)=>sum+p.position[0]**2+p.position[1]**2,0);
    const omega=sumR2?active.reduce((sum,p)=>sum+p.position[0]*p.velocity[1]-p.position[1]*p.velocity[0],0)/sumR2:0;
    const vz=active.reduce((sum,p)=>sum+p.velocity[2],0)/n;
    const thermal=active.reduce((sum,p)=>sum+(p.velocity[0]+omega*p.position[1])**2+(p.velocity[1]-omega*p.position[0])**2+(p.velocity[2]-vz)**2,0);
    return {active:n,wall:s.wall,end:s.end,source:s.source,
     meanRadius:active.reduce((sum,p)=>sum+Math.hypot(p.position[0],p.position[1]),0)/n,
     temperatureEV:s.massU*AMU*thermal/(3*n*E_CHARGE),rotationRadS:omega,
     meanCanonicalMomentum:active.reduce((sum,p)=>sum+canonicalMomentum(p,p,c),0)/n};
   })});
 }
 const initialSpatialDensity=collisionDensityDiagnostics(collisionCells(),weight);
 record(0);let time=0,index=0;
 const stride=Math.max(1,Math.ceil(c.duration/c.dt/160));
 while(time<c.duration){
  const dt=Math.min(c.dt,c.duration-time);collide(dt/2);
  for(const p of ions)if(p.active){
   let remaining=dt,elapsed=0,events=0;
   while(remaining>0){
    const next=advanceDoublewell(p,p,remaining,c,c.boundary==='closed'?'periodic':'absorbing');
    p.position=next.particle.position;p.velocity=next.particle.velocity;
    elapsed+=next.elapsedS;remaining-=next.elapsedS;
    if(!next.hit)break;
    if(c.boundary==='open'){
     const s=species[p.speciesIndex],energyJ=doublewellEnergy(p,p,c),canonical=canonicalMomentum(p,p,c);
     s[next.hit.destination]++;s.active--;energyOut+=energyJ;momentumOut+=canonical;p.active=false;
     s.impacts.push({destination:next.hit.destination,time:time+elapsed,radius:Math.hypot(p.position[0],p.position[1]),energyJ,canonicalMomentum:canonical});break;
    }
    const nx=p.position[0]/c.radius,ny=p.position[1]/c.radius,dot=p.velocity[0]*nx+p.velocity[1]*ny;
    p.velocity=[p.velocity[0]-2*dot*nx,p.velocity[1]-2*dot*ny,p.velocity[2]];
    if(++events>4)throw new Error('Unresolved repeated wall reflection: reduce timestep.');
   }
   if(c.boundary==='closed')p.position[2]=((p.position[2]%c.length)+c.length)%c.length;
  }
  collide(dt/2);time=Math.min(c.duration,time+dt);index++;
  if(index%stride===0||time===c.duration)record(time);
 }
 const curves:Curve[]=[],x=history.map(h=>h.time*1e3);
 for(const i of [0,1]){
  const label=['A','B'][i],series=history.map(h=>h.species[i]);
  for(const destination of ['active','wall','end','source'] as const)curves.push({label:`${label} ${destination}`,x,
   y:series.map(s=>s[destination]/c.particlesPerSpecies),xLabel:'Time (ms)',yLabel:`Fraction of injected ${label} representatives`});
  for(const [key,yLabel,scale]of [['meanRadius','Survivor mean radius (m)',1],['temperatureEV','Survivor residual kinetic temperature (eV)',1],
   ['rotationRadS','Survivor fitted rigid rotation (rad/s)',1],['meanCanonicalMomentum','Survivor mean Pθ (kg m²/s)',1]] as const)
   curves.push({label,x,y:series.map(s=>s[key]===null?NaN:s[key]!*scale),xLabel:'Time (ms)',yLabel});
  const bins=20,counts=Array(bins).fill(0);
  ions.filter(p=>p.active&&p.speciesIndex===i).forEach(p=>counts[Math.min(bins-1,Math.floor(Math.hypot(p.position[0],p.position[1])/c.radius*bins))]++);
  curves.push({label,x:counts.map((_,j)=>c.radius*(j+.5)/bins),y:counts.map((n,j)=>n*weight/(Math.PI*c.radius**2*((j+1)**2-j*j)/bins**2*c.length)),
   xLabel:'Radius (m)',yLabel:'Final axially averaged active density (m⁻³)'});
 }
 for(const [key,label]of [['energyResidual','H including exit flux'],['momentumResidual','Pθ including exit flux'],['collisionTorque','Accumulated collision-cell torque']] as const)
  curves.push({label,x,y:history.map(h=>h[key]),xLabel:'Time (ms)',yLabel:'Signed conservation residual / initial positive scale'});
 const conservation={initialEnergyJ:initialH*weight,initialCanonicalMomentum:initialP*weight,
  energyScaleJ:energyScale*weight,canonicalMomentumScale:momentumScale*weight,energyOutJ:energyOut*weight,
  canonicalMomentumOut:momentumOut*weight,maxEnergyResidual,maxMomentumResidual,maxCorrectedMomentumResidual,
  collisionTorque:collisionTorque*weight,absoluteCellTorque:absoluteCellTorque*weight,absolutePairTorque:absolutePairTorque*weight,
  normalizedAbsoluteCellTorque:absoluteCellTorque/momentumScale,normalizedAbsolutePairTorque:absolutePairTorque/momentumScale};
 const localityQuadraticVariationScale=Math.sqrt(pairTorqueSquares)/momentumScale;
 const regimeViolations=regimeHistory.filter(h=>h.assessment.status==='outside-supported-domain');
 const unresolvedSnapshots=regimeHistory.filter(h=>h.assessment.status==='unresolved');
 const regimeSummary={status:regimeViolations.length?'outside-supported-domain':unresolvedSnapshots.length?'unresolved':'within-supported-domain',
  outsideSnapshots:regimeViolations.length,unresolvedSnapshots:unresolvedSnapshots.length,
  reasons:[...new Set(regimeHistory.flatMap(h=>h.assessment.reasons))]};
 const metrics=[
  {label:'Physical ions per representative',value:weight,unit:''},
  {label:'Collision pairs',value:collisions.pairs,unit:''},
  {label:c.collisionMethod==='axisymmetric'?'RMS meridional pair separation':'RMS pair separation',value:collisions.pairs?Math.sqrt(collisions.pairSeparationSquaredSumM2/collisions.pairs):NaN,unit:'m'},
  {label:c.collisionMethod==='axisymmetric'?'Maximum meridional pair separation':'Maximum pair separation',value:collisions.pairs?collisions.maxPairSeparationM:NaN,unit:'m'},
  {label:'RMS radial pair separation',value:collisions.pairs?Math.sqrt(collisions.pairRadialSeparationSquaredSumM2/collisions.pairs):NaN,unit:'m'},
  {label:'Pairs with TA half-angle variance > 0.1 (resolution marker)',value:collisions.pairs?collisions.largeAnglePairs/collisions.pairs:0,unit:'fraction'},
  {label:'Unpaired representative exposure',value:collisions.activeIonSteps?collisions.unpairedIonSteps/collisions.activeIonSteps:0,unit:'fraction'},
  {label:'Max sampled H balance residual including exits',value:maxEnergyResidual,unit:''},
  {label:'Max sampled raw Pθ balance residual including exits',value:maxMomentumResidual,unit:''},
  {label:'Accumulated absolute cell-net torque / P scale',value:absoluteCellTorque/momentumScale,unit:''},
  {label:'Accumulated absolute pair torque / P scale',value:absolutePairTorque/momentumScale,unit:''},
  {label:'Pair torque quadratic-variation scale / P scale',value:localityQuadraticVariationScale,unit:''},
  ...(c.collisionMethod==='adaptive'?[
   {label:'Adaptive target occupancy',value:c.collisionTarget??32,unit:'representatives'},
   {label:'Adaptive maximum bisection depth',value:c.collisionMaxDepth??15,unit:''},
  ]:c.collisionMethod==='axisymmetric'?[
   {label:'Maximum annular radial cell width / initial radial scale',value:maxGap(ringGrid!.radialEdgesM)/(c.initialState==='equilibrium'?c.radius:c.sourceRadius),unit:''},
   {label:'Maximum annular axial cell length / initial axial scale',value:maxGap(ringGrid!.axialEdgesM)/(c.length*(c.initialState==='equilibrium'?1:c.pulseLengthFraction)),unit:''},
  ]:[
   {label:c.initialState==='equilibrium'?'Collision cell width / column radius':'Collision cell width / initial source radius',value:width/(c.initialState==='equilibrium'?c.radius:c.sourceRadius),unit:''},
   {label:c.initialState==='equilibrium'?'Axial cell length / column length':'Axial cell length / initial pulse length',value:dz/(c.length*(c.initialState==='equilibrium'?1:c.pulseLengthFraction)),unit:''},
  ]),
  {label:'Pθ residual after measured cell torque',value:maxCorrectedMomentumResidual,unit:''},
  {label:'Initial electron Debye length',value:regime.debyeM,unit:'m'},
  {label:'Initial ion coupling parameter',value:regime.coupling,unit:''},
  {label:'Initial electrons per Debye sphere',value:regime.particlesPerDebyeSphere,unit:''},
  {label:'Initial estimated lnΛ (supplied value is used)',value:regime.estimatedCoulombLog,unit:''},
  {label:'Initial encounter magnetization',value:regime.encounterMagnetization,unit:''},
  {label:'Regime snapshots outside supported local estimates',value:regimeViolations.length,unit:`of ${regimeHistory.length}`},
  {label:'Regime snapshots unresolved by local sampling',value:unresolvedSnapshots.length,unit:`of ${regimeHistory.length}`},
  ...species.flatMap((s,i)=>['wall','end','source','active'].map(destination=>{
   const key=destination as 'wall'|'end'|'source'|'active';
   return {label:`${['A','B'][i]} ${destination} fraction (descriptive only; coupled particles)`,value:s[key]/s.injected,unit:''};
  })),
 ];
 return {config:structuredClone(c),curves,metrics,history,species,conservation:{...conservation,localityQuadraticVariationScale},collisions,regime,regimeHistory,regimeSummary,
  scatteringMethod:c.collisionScattering??'takizuka-abe',
  spatialCollision:{method:c.collisionMethod??'fixed',target:c.collisionTarget??32,maxDepth:c.collisionMaxDepth??15,
   separationCoordinates:c.collisionMethod==='axisymmetric'?'r-z':'x-y-z',
   sourceInterfacesFitted:c.collisionMethod==='axisymmetric'&&Boolean(c.collisionSourceAligned)&&c.initialState==='pulse',
   ...(ringGrid?{...ringGrid,nominalRadialCells:across,nominalAxialCells:ringSettings.axialCells,
    maxRadialCellWidthM:maxGap(ringGrid.radialEdgesM),maxAxialCellLengthM:maxGap(ringGrid.axialEdgesM)}:{}),
   initial:initialSpatialDensity,final:collisionDensityDiagnostics(collisionCells(),weight)},
  assumptions:[
   `Sampled local Coulomb-regime assessment: ${regimeSummary.status}. ${regimeSummary.reasons.join(' ')}`,
   'Exploratory equal-weight prescribed-field multispecies kinetic model. No self-consistent electrons, potential, magnetic field, source circuit, instability or calibrated apparatus prediction.',
   c.boundary==='closed'?'Closed column: specular radial wall and periodic axial boundary; no collector purity is defined.':'Open finite initial pulse: uniform disk and finite axial slug at t=0, then absorbing source/wall/end. This is not continuous injection or steady throughput.',
   ...(c.collisionScattering==='nanbu'?['Nanbu cumulative pair scattering uses s=2 times the TA half-angle variance and a Langevin-parameter exponential angular law. Its first angular moment is exp(−s), and its large-s limit is isotropic. Higher angular moments and nonlinear Landau evolution remain finite-step approximations; timestep convergence is still required.']:[]),
   c.collisionMethod==='axisymmetric'
    ?'Axisymmetric ring reduction: exact annular r-z volumes; each velocity is transformed into its own cylindrical frame for scattering and local-regime estimates. This requires the present axisymmetric fields and source distribution; azimuthal fluctuations are not represented. Finite radial cells still inject measured (ra-rb)Δpθ torque; radial/axial/particle refinement remains required. No angular-momentum projection is applied.'
    :c.collisionMethod==='adaptive'
    ?'Experimental adaptive geometric bisection: exact cylinder-cut leaf volumes and unchanged mixed-pair generator. Position-selected leaves can bias density. Target occupancy and spatial depth must converge jointly; the baseline fixed grid is retained for comparison. No continuum convergence is claimed.'
    :'Density is inferred from active equal-weight representatives and exact cylinder-cut Cartesian cell volumes. Finite cell occupancy and spatially separated collision partners bias relaxation and inject measured numerical torque. Refine cells together with particle count.',
   ...(c.collisionMethod==='axisymmetric'?[c.collisionSourceAligned&&c.initialState==='pulse'
    ?'Fixed source-fitted mesh: faces are inserted at the declared initial source radius and pulse end. Full physical annular volumes remain in the rate. This removes initial sharp-support averaging, not finite-count noise or later evolving-profile smoothing; no particle-dependent support estimate or density renormalization is used.'
    :'Uniform annular mesh: a sharp pulse partly filling a ring cell remains diluted over the full physical cell. Source fitting is a separate explicit numerical setting.']:[]),
   c.collisionMethod==='axisymmetric'
    ?`${c.collisionScattering==='nanbu'?'Nanbu cumulative':'Takizuka–Abe'} rotations preserve pair energy and momentum in the common cylindrical frame, including axial momentum. Cartesian transverse point-pair momentum is not an invariant of this ring representation. Finite radial separation prevents exact physical angular conservation. Time/seed convergence and finite-step angular-variance diagnostics remain required.`
    :`${c.collisionScattering==='nanbu'?'Nanbu cumulative':'Takizuka–Abe small-angle'} pair rotations preserve pair energy and linear momentum. Finite timestep approximates Landau scattering; large angular variances are reported without a relative-speed floor. Time/seed convergence is required.`,
   'Absolute pair-torque sums reveal cancellation but can grow under time refinement for stochastic impulses. The torque quadratic-variation scale is a diagnostic, not a confidence bound; raw signed Pθ drift remains the measured conservation error.',
   'Sampling errors are correlated by collisions. Outlet fractions are descriptive counts; independent seed ensembles are required for uncertainty, not independent-ion Wilson purity bands.',
   'Initial screening uses a conservative species-peak/charge-density bound and declared temperatures. Sampled local checks remove each species mean drift and require four representatives per present species. Sparse cells are unresolved; violations flag the run rather than modifying trajectories. This is not proof between sampled times. Electron temperature and supplied Coulomb logarithm remain prescribed.',
   'Survivor flow/temperature/radius are conditional on remaining particles; a fitted rigid-rotation subtraction is a diagnostic, not a local thermodynamic temperature. Empty survivor populations are undefined.',
   'Species-specific zero-canonical mean rotation is only an initial flow; thermal velocity gives a distribution of Pθ. Interspecies collisions exchange angular momentum; no thermostat forces species toward their separate effective-well Boltzmann profiles.',
  ]};
}

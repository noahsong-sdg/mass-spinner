import * as THREE from 'three';
import {rotorResponse,rotorPhase} from './fuel-centrifuge.js';
import {sampleFuelTransport} from './fuel-transport.js';
import type {FuelRenderResult} from './fuel-field.js';
import {createFuelMotionGlyphs} from './fuel-motion-glyphs.js';
import {createFuelBulkMarkers,syncFuelBulkMarkers} from './fuel-bulk-markers.js';
export type {FuelRenderResult} from './fuel-field.js';

export type FuelMotionMode = 'equilibrium' | 'spin' | 'transport' | 'flow';
export type FuelSpecies = 'all' | 'light' | 'heavy';
type FuelCloud = {
 rotor: THREE.Group; points: THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
 lines: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
 ion: boolean; species: number; n: number;
};

const U=1.66053906892e-27,K=1.380649e-23,TAU=2*Math.PI;
const tracerAngle=(i: number,species: number,ion: boolean)=>i*2.399963229728653+species*Math.PI+(ion?Math.PI/2:0);
const TRAIL_SEGMENTS=8,TRAIL_STRIDE=8;
function populationQuantile(cdf:ArrayLike<number>|undefined,beta:number,p:number){
 if(!cdf)return radialQuantile(beta,p);
 let j=1;while(j<cdf.length-1&&cdf[j]<p)j++;
 return (j-1+(p-cdf[j-1])/(cdf[j]-cdf[j-1]))/(cdf.length-1);
}
/** Inverse CDF in y=r²/a², including an exponentially thin wall layer. */
export function radialQuantile(beta: number,p: number){
 if(p===0||p===1)return p;
 if(beta<1e-7)return p+beta*p*(1-p)/2;
 return beta<50?Math.log1p(p*Math.expm1(beta))/beta:1+Math.log(p+(1-p)*Math.exp(-beta))/beta;
}
function transportSpeedBound(result:FuelRenderResult){
 const end=result.samples.at(-1)!;let speed=Math.max(Math.abs(end.ionRadS),Math.abs(end.neutralRadS));
 for(const sample of result.transport?.checkpoints??result.transport?.snapshots??[])speed=Math.max(speed,Math.abs(sample.ionRadS),Math.abs(sample.neutralRadS));
 return speed;
}
/** A display adapter, not a new transport solver. Phases and speeds retain SI units. */
export function fuelMotionState(result: FuelRenderResult,timeS: number,mode: FuelMotionMode='equilibrium'){
 return motionState(result,timeS,mode);
}
function motionState(result:FuelRenderResult,timeS:number,mode:FuelMotionMode,speedBound?:number){
 const {config:c,mechanics:m}=result,end=result.samples.at(-1)!;
 const args=[m.ii,m.nn,m.gamma,m.drag,m.torque] as const,spin=mode==='spin'||mode==='transport';
 const transport=result.transport,coupled=spin&&transport?sampleFuelTransport(transport,timeS):null;
 const speeds=coupled?{ion:coupled.ionRadS,neutral:coupled.neutralRadS}:spin?rotorResponse(...args,timeS):{ion:end.ionRadS,neutral:end.neutralRadS};
 const phases=coupled?{ion:coupled.ionPhaseRad,neutral:coupled.neutralPhaseRad}:spin?rotorPhase(...args,timeS):{ion:end.ionRadS*timeS,neutral:end.neutralRadS*timeS};
 const beta=result.pair.masses.map(mass=>spin?0:mass*U*end.neutralMS**2/(2*K*c.gasK));
 const neutralNumber=c.pressurePa*Math.PI*c.radiusM**2*c.lengthM/(K*c.gasK);
 const turnoverHz=result.pumping.gasLoadPaM3S/(K*c.gasK*neutralNumber);
 let resolvedSpeed=Math.max(Math.abs(end.ionRadS),Math.abs(end.neutralRadS));
 if(coupled)resolvedSpeed=speedBound??transportSpeedBound(result);
 // Both populations use one rotation clock, bounded at 1.8 rad per screen second.
 const rotationSecondsPerScreenSecond=Math.min(1,1.8/Math.max(resolvedSpeed,TAU*turnoverHz,1.8));
 return {speeds,phases,beta,neutralNumber,turnoverHz,rotationSecondsPerScreenSecond,
  secondsPerScreenSecond:mode==='flow'?Math.min(1,.25/Math.max(turnoverHz,.25)):rotationSecondsPerScreenSecond};
}

/** Weighted bulk samples, not microscopic trajectories or predicted emission. */
export function createFuelMotion(result: FuelRenderResult){
 // The accepted result is immutable for this renderer's lifetime; standalone calls remain uncached.
 const speedBound=transportSpeedBound(result),stateAt=(timeS:number,mode:FuelMotionMode='equilibrium')=>motionState(result,timeS,mode,speedBound);
 const {config:c}=result,R=c.radiusM,L=c.lengthM,group=new THREE.Group(),clouds: FuelCloud[]=[];
 group.name='Gas motion';group.userData.nonPickable=true;
 const sprites=new Map<boolean, THREE.DataTexture>();
 function sprite(ion: boolean){
  if(sprites.has(ion))return sprites.get(ion)!;
  const data=new Uint8Array(32*32*4),clamp=(v: number)=>Math.max(0,Math.min(1,v));
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){
   const r=Math.hypot(x+.5-16,y+.5-16)/16,edge=clamp((1-r)/.3),center=ion?clamp((r-.35)/.2):1;
   data.set([255,255,255,Math.round(255*edge*center)],(y*32+x)*4);
  }
  const map=new THREE.DataTexture(data,32,32);map.magFilter=map.minFilter=THREE.LinearFilter;map.needsUpdate=true;sprites.set(ion,map);return map;
 }
 function dots(positions: number[] | Float32Array,color: THREE.ColorRepresentation,size: number,opacity: number,ion=false,depthTest=true){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  // Built-in depth/color chunks match the logarithmic-depth hardware renderer.
  const material=new THREE.PointsMaterial({color,size,opacity,map:sprite(ion),sizeAttenuation:false,transparent:true,alphaTest:.01,depthWrite:false,depthTest});
  const points=new THREE.Points(geometry,material);points.frustumCulled=false;return points;
 }
 const fractions=[c.lightFraction,1-c.lightFraction],colors=[0x94d9cd,0xe5ab70],reference=stateAt(0);
 const glyphs=createFuelMotionGlyphs(result);group.add(glyphs.group);
 for(const ion of [false,true])for(let species=0;species<2;species++){
  const n=Math.max(1,Math.round((ion?192:768)*fractions[species])),positions: number[]=[];
  for(let i=0;i<n;i++){
   const radius=R*Math.sqrt(radialQuantile(ion?0:reference.beta[species],(i+.5)/n));
   // Independent irrational increments fill azimuth × z. Reusing the golden
   // ratio for z locks theta + 2πz/L to a constant: a spurious helical sheet.
   const angle=tracerAngle(i,species,ion),z=L*((i*Math.SQRT2+.37)%1);
   positions.push(radius*Math.cos(angle),radius*Math.sin(angle),z);
  }
  const rotor=new THREE.Group();rotor.name=`${ion?'Ions':'Neutrals'} · ${species===0?result.pair.light:result.pair.heavy}`;
  const points=createFuelBulkMarkers(positions,colors[species],R*(ion?.035:.022),ion);
  rotor.userData={species,ion,representedNumber:reference.neutralNumber*fractions[species]*(ion?c.ionFraction/(1-c.ionFraction):1),tracers:n};
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(Math.ceil(n/TRAIL_STRIDE)*TRAIL_SEGMENTS*6),3));
  const lines=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:colors[species],transparent:true,opacity:.35,depthWrite:false,toneMapped:false}));
  lines.name='Accepted bulk history traces';lines.frustumCulled=false;
  lines.userData.purpose='Equal-population bulk history, not molecular paths';
  rotor.add(points,lines);rotor.visible=fractions[species]>0;group.add(rotor);clouds.push({rotor,points,lines,ion,species,n});
 }
 // Outside-vessel packet paths show Q, not a fluid velocity through the chamber.
 const paths=glyphs.paths;
 const flows=paths.flatMap(path=>[0,1].map(species=>{
  const share=result.pumping.gasLoadPaM3S>0?result.pumping.species[species].gasLoadPaM3S/result.pumping.gasLoadPaM3S:0;
  const points=dots(new Float32Array(12*3),colors[species],5,Math.sqrt(share),false,false);
  points.name='Schematic throughput packets';points.visible=share>0;points.renderOrder=2;group.add(points);
  points.userData={packetNumber:reference.neutralNumber*share/12,species};return {path,points,species};
 }));
 let previousMode: FuelMotionMode='equilibrium';
 function update(timeS: number,mode: FuelMotionMode='equilibrium',secondsPerScreenSecond?: number,rotationSecondsPerScreenSecond?:number){
  const state=stateAt(timeS,mode);
  if(secondsPerScreenSecond!==undefined)state.secondsPerScreenSecond=secondsPerScreenSecond;
  if(rotationSecondsPerScreenSecond!==undefined)state.rotationSecondsPerScreenSecond=Math.min(state.rotationSecondsPerScreenSecond,rotationSecondsPerScreenSecond);
  // Transport and throughput need faster timelines. Compress only their rotation.
  // A constant phase factor preserves direction, speed ratios, and frame independence.
  const phaseScale=mode==='transport'||mode==='flow'?Math.min(1,state.rotationSecondsPerScreenSecond/state.secondsPerScreenSecond):1;
  const displayPhases={ion:state.phases.ion*phaseScale,neutral:state.phases.neutral*phaseScale};
  // Hidden tracers still supply physical clocks/readouts. Rebuild from the
  // current state when shown; previousMode records the last displayed state.
  if(!group.visible)return state;
  const coupled=(mode==='spin'||mode==='transport')&&result.transport?sampleFuelTransport(result.transport,timeS):null;
  const quantile=(species:number,p:number)=>populationQuantile(coupled?.[species?'heavyCDF':'lightCDF'],state.beta[species],p);
  // A trailing arc integrates the accepted phase history, rather than using
  // endpoint speed × exposure during acceleration. Never invent pre-run motion.
  const transient=mode==='spin'||mode==='transport';
  const exposureS=transient?Math.min(timeS,state.secondsPerScreenSecond*.5):state.secondsPerScreenSecond*.5;
  const before=stateAt(timeS-exposureS,mode).phases;
  glyphs.update({...state,phases:displayPhases},mode,quantile,{seconds:exposureS,ion:(state.phases.ion-before.ion)*phaseScale,neutral:(state.phases.neutral-before.neutral)*phaseScale});
  const history=Array.from({length:TRAIL_SEGMENTS+1},(_,j)=>{
   const time=timeS-exposureS*(1-j/TRAIL_SEGMENTS),frame=stateAt(time,mode);
   const sample=transient&&result.transport?sampleFuelTransport(result.transport,time):null;
   return {...frame,cdf:[sample?.lightCDF,sample?.heavyCDF]};
  });
  for(const cloud of clouds){
   const {rotor,points,lines,ion,species,n}=cloud;
  if((mode!==previousMode||['spin','transport'].includes(mode))&&!ion){
    const a=points.geometry.attributes.samplePosition;
    for(let i=0;i<n;i++){
     const radius=R*Math.sqrt(quantile(species,(i+.5)/n)),angle=tracerAngle(i,species,ion);
     a.setXY(i,radius*Math.cos(angle),radius*Math.sin(angle));
    }syncFuelBulkMarkers(points);
   }
   const kind=ion?'ion':'neutral';rotor.rotation.z=displayPhases[kind]%TAU;
   rotor.userData.azimuthAveraged=false;
   rotor.userData.rotationPhaseScale=phaseScale;rotor.userData.physicalPhaseRad=state.phases[kind];
   points.visible=true;lines.visible=history.length>0&&state.speeds[kind]!==0&&exposureS>0;
   lines.userData.exposureS=exposureS;
   if(lines.visible){
    const a=points.geometry.attributes.samplePosition,b=lines.geometry.attributes.position;
    for(let i=0;i<n;i+=TRAIL_STRIDE)for(let j=0;j<TRAIL_SEGMENTS;j++)for(let end=0;end<2;end++){
     const frame=history[j+end],p=(i+.5)/n;
     const radius=ion?Math.hypot(a.getX(i),a.getY(i)):R*Math.sqrt(populationQuantile(frame.cdf[species],frame.beta[species],p));
     const angle=tracerAngle(i,species,ion)+(frame.phases[kind]-state.phases[kind])*phaseScale;
     b.setXYZ((i/TRAIL_STRIDE*TRAIL_SEGMENTS+j)*2+end,radius*Math.cos(angle),radius*Math.sin(angle),a.getZ(i));
    }
    b.needsUpdate=true;
   }
  }
  for(const {path,points,species}of flows){
   points.visible=mode==='flow'&&result.pumping.species[species].gasLoadPaM3S>0;
   const a=points.geometry.attributes.position;
   for(let i=0;i<12;i++){const p=path.getPoint(((i+.5)/12+timeS*state.turnoverHz)%1);a.setXYZ(i,p.x,p.y,p.z);}a.needsUpdate=true;
  }
  previousMode=mode;return state;
 }
 update(0);return {group,update,setSpecies(value: FuelSpecies){glyphs.setSpecies(value);for(const cloud of clouds){const selected=value==='all'||cloud.species===(value==='light'?0:1);cloud.points.material.opacity=selected?(cloud.ion?1:.85):.08;cloud.lines.material.opacity=selected?.35:.02;}}};
}

export type FuelMotion = ReturnType<typeof createFuelMotion>;
export type FuelMotionState = ReturnType<typeof fuelMotionState>;

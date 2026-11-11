import * as THREE from 'three';
import {rotorResponse,rotorPhase} from './fuel-centrifuge.ts';
import {sampleFuelTransport} from './fuel-transport.ts';

const U=1.66053906892e-27,K=1.380649e-23,TAU=2*Math.PI;
/** Inverse CDF in y=r²/a², including an exponentially thin wall layer. */
export function radialQuantile(beta,p){
 if(p===0||p===1)return p;
 if(beta<1e-7)return p+beta*p*(1-p)/2;
 return beta<50?Math.log1p(p*Math.expm1(beta))/beta:1+Math.log(p+(1-p)*Math.exp(-beta))/beta;
}
/** A display adapter, not a new transport solver. Every clock uses physical seconds. */
export function fuelMotionState(result,timeS,mode='equilibrium'){
 const {config:c,mechanics:m}=result,end=result.samples.at(-1);
 const args=[m.ii,m.nn,m.gamma,m.drag,m.torque],spin=mode==='spin'||mode==='transport';
 const coupled=spin&&result.transport?sampleFuelTransport(result.transport,timeS):null;
 const speeds=coupled?{ion:coupled.ionRadS,neutral:coupled.neutralRadS}:spin?rotorResponse(...args,timeS):{ion:end.ionRadS,neutral:end.neutralRadS};
 const phases=coupled?{ion:coupled.ionPhaseRad,neutral:coupled.neutralPhaseRad}:spin?rotorPhase(...args,timeS):{ion:end.ionRadS*timeS,neutral:end.neutralRadS*timeS};
 const beta=result.pair.masses.map(mass=>spin?0:mass*U*end.neutralMS**2/(2*K*c.gasK));
 const neutralNumber=c.pressurePa*Math.PI*c.radiusM**2*c.lengthM/(K*c.gasK);
 const turnoverHz=result.pumping.gasLoadPaM3S/(K*c.gasK*neutralNumber);
 let resolvedSpeed=Math.max(Math.abs(end.ionRadS),Math.abs(end.neutralRadS));
 if(coupled)for(const s of result.transport.checkpoints??result.transport.snapshots)resolvedSpeed=Math.max(resolvedSpeed,Math.abs(s.ionRadS),Math.abs(s.neutralRadS));
 return {speeds,phases,beta,neutralNumber,turnoverHz,
  // One common slow-motion scale bounds angular change to 1.8 rad / screen s.
  secondsPerScreenSecond:mode==='flow'?Math.min(1,.25/Math.max(turnoverHz,.25)):Math.min(1,1.8/Math.max(resolvedSpeed,TAU*turnoverHz,1.8))};
}

/** Weighted bulk tracers: no claim of thermal gyromotion or time-resolved separation. */
export function createFuelMotion(result){
 const {config:c}=result,R=c.radiusM,L=c.lengthM,group=new THREE.Group(),clouds=[];let selectedSpecies='all';
 group.name='Gas motion';group.userData.nonPickable=true;
 const sprites=new Map();
 function sprite(ion){
  if(sprites.has(ion))return sprites.get(ion);
  const data=new Uint8Array(32*32*4),clamp=v=>Math.max(0,Math.min(1,v));
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){
   const r=Math.hypot(x+.5-16,y+.5-16)/16,edge=clamp((1-r)/.3),center=ion?clamp((r-.35)/.2):1;
   data.set([255,255,255,Math.round(255*edge*center)],(y*32+x)*4);
  }
  const map=new THREE.DataTexture(data,32,32);map.magFilter=map.minFilter=THREE.LinearFilter;map.needsUpdate=true;sprites.set(ion,map);return map;
 }
 function dots(positions,color,size,opacity,ion=false,depthTest=true){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  // Built-in depth/color chunks match the logarithmic-depth hardware renderer.
  const material=new THREE.PointsMaterial({color,size,opacity,map:sprite(ion),sizeAttenuation:false,transparent:true,alphaTest:.01,depthWrite:false,depthTest});
  const points=new THREE.Points(geometry,material);points.frustumCulled=false;return points;
 }
 const fractions=[c.lightFraction,1-c.lightFraction],colors=[0x94d9cd,0xe5ab70],reference=fuelMotionState(result,0);
 for(const ion of [false,true])for(let species=0;species<2;species++){
  const n=Math.max(1,Math.round((ion?192:768)*fractions[species])),positions=[],trails=[];
  for(let i=0;i<n;i++){
   const radius=R*Math.sqrt(radialQuantile(ion?0:reference.beta[species],(i+.5)/n));
   const angle=i*2.399963229728653,z=L*((i*.618033988749895+.37)%1);
   positions.push(radius*Math.cos(angle),radius*Math.sin(angle),z);
   if(i%4===0)trails.push(radius*Math.cos(angle-.1),radius*Math.sin(angle-.1),z,...positions.slice(-3));
  }
  const rotor=new THREE.Group();rotor.name=`${ion?'Ions':'Neutrals'} · ${species===0?result.pair.light:result.pair.heavy}`;
  const points=dots(positions,colors[species],ion?6:3.5,ion?1:.85,ion);
  rotor.userData={species,ion,representedNumber:reference.neutralNumber*fractions[species]*(ion?c.ionFraction/(1-c.ionFraction):1),tracers:n};
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(trails,3));
  const lines=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:colors[species],transparent:true,opacity:.22,depthWrite:false,toneMapped:false}));
  rotor.add(points,lines);rotor.visible=fractions[species]>0;group.add(rotor);clouds.push({rotor,points,lines,ion,species,n});
 }
 // Outside-vessel packet paths show Q, not a fluid velocity through the chamber.
 const paths=[new THREE.CatmullRomCurve3([[0,0,-R*.95],[0,0,-R*.5],[0,0,L*.08]].map(p=>new THREE.Vector3(...p))),
  new THREE.CatmullRomCurve3([[0,R,L*.88],[0,R*1.5,L*.88],[0,R*1.5,L*1.14]].map(p=>new THREE.Vector3(...p)))];
 const flows=paths.flatMap(path=>[0,1].map(species=>{
  const share=result.pumping.species[species].gasLoadPaM3S/result.pumping.gasLoadPaM3S;
  const points=dots(new Float32Array(12*3),colors[species],5,Math.sqrt(share),false,false);
  points.name='Schematic throughput packets';points.visible=share>0;points.renderOrder=2;group.add(points);
  points.userData={packetNumber:reference.neutralNumber*share/12,species};return {path,points,species};
 }));
 let previousMode='equilibrium';
 function update(timeS,mode='equilibrium',secondsPerScreenSecond){
  const state=fuelMotionState(result,timeS,mode);
  if(secondsPerScreenSecond!==undefined)state.secondsPerScreenSecond=secondsPerScreenSecond;
  // Hidden tracers still supply physical clocks/readouts. Rebuild from the
  // current state when shown; previousMode records the last displayed state.
  if(!group.visible)return state;
  for(const cloud of clouds){
   const {rotor,points,lines,ion,species,n}=cloud;
  if((mode!==previousMode||['spin','transport'].includes(mode))&&!ion){
    const transport=['spin','transport'].includes(mode)&&result.transport?sampleFuelTransport(result.transport,timeS):null;
    const cdf=transport?.[species?'heavyCDF':'lightCDF'];
    const quantile=p=>{if(!cdf)return radialQuantile(state.beta[species],p);let j=1;while(j<cdf.length-1&&cdf[j]<p)j++;return (j-1+(p-cdf[j-1])/(cdf[j]-cdf[j-1]))/(cdf.length-1);};
    const a=points.geometry.attributes.position;
    for(let i=0;i<n;i++){
     const radius=R*Math.sqrt(quantile((i+.5)/n)),angle=i*2.399963229728653;
     a.setXY(i,radius*Math.cos(angle),radius*Math.sin(angle));
     if(i%4===0){const j=i/4*2,b=lines.geometry.attributes.position;b.setXYZ(j,radius*Math.cos(angle-.1),radius*Math.sin(angle-.1),a.getZ(i));b.setXYZ(j+1,a.getX(i),a.getY(i),a.getZ(i));}
    }a.needsUpdate=true;
   }
   const kind=ion?'ion':'neutral',averaged=['flow','transport'].includes(mode)&&state.speeds[kind]!==0;rotor.rotation.z=averaged?0:state.phases[kind]%TAU;
   points.visible=!averaged;lines.visible=!averaged&&state.speeds[kind]!==0;
   if(averaged&&!cloud.average){
    const circles=[],a=points.geometry.attributes.position;
    for(let i=0;i<n;i++){const radius=Math.hypot(a.getX(i),a.getY(i)),z=a.getZ(i);
     for(let j=0;j<48;j++)for(const angle of [TAU*j/48,TAU*(j+1)/48])circles.push(radius*Math.cos(angle),radius*Math.sin(angle),z);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(circles,3));
    const selected=selectedSpecies==='all'||species===(selectedSpecies==='light'?0:1);
    cloud.average=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:colors[species],transparent:true,opacity:selected?(ion?.12:.085):.003,depthWrite:false}));rotor.add(cloud.average);
   }
   if(cloud.average)cloud.average.visible=averaged;
   if(averaged&&(mode==='transport'||mode!==previousMode)){
    const a=points.geometry.attributes.position,b=cloud.average.geometry.attributes.position;
    for(let i=0;i<n;i++){const radius=Math.hypot(a.getX(i),a.getY(i));for(let j=0;j<48;j++)for(let end=0;end<2;end++){const angle=TAU*(j+end)/48;b.setXYZ(i*96+j*2+end,radius*Math.cos(angle),radius*Math.sin(angle),a.getZ(i));}}b.needsUpdate=true;
   }
   const a=points.geometry.attributes.position,b=lines.geometry.attributes.position,exposure=state.speeds[kind]*state.secondsPerScreenSecond*.07;
   for(let i=0;i<n;i+=4){const radius=Math.hypot(a.getX(i),a.getY(i)),angle=Math.atan2(a.getY(i),a.getX(i));b.setXYZ(i/2,radius*Math.cos(angle-exposure),radius*Math.sin(angle-exposure),a.getZ(i));b.setXYZ(i/2+1,a.getX(i),a.getY(i),a.getZ(i));}b.needsUpdate=true;
  }
  for(const {path,points,species}of flows){
   points.visible=!['spin','transport'].includes(mode)&&result.pumping.species[species].gasLoadPaM3S>0;
   const a=points.geometry.attributes.position;
   for(let i=0;i<12;i++){const p=path.getPoint(((i+.5)/12+timeS*state.turnoverHz)%1);a.setXYZ(i,p.x,p.y,p.z);}a.needsUpdate=true;
  }
  previousMode=mode;return state;
 }
 update(0);return {group,update,setSpecies(value){selectedSpecies=value;for(const cloud of clouds){const selected=value==='all'||cloud.species===(value==='light'?0:1);cloud.points.material.opacity=selected?(cloud.ion?1:.85):.08;cloud.lines.material.opacity=selected?.22:.02;if(cloud.average)cloud.average.material.opacity=selected?(cloud.ion?.12:.085):.003;}}};
}

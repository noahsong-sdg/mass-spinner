import * as THREE from 'three';
import type {FuelMotionMode, FuelMotionState, FuelSpecies} from './fuel-motion.js';
import type {FuelRenderResult} from './fuel-field.js';

/** Diagnostic geometry in chamber metres. No extra forces or fluid solver. */
export function createFuelMotionGlyphs(result: FuelRenderResult){
 const {radiusM:R,lengthM:L}=result.config,group=new THREE.Group();
 group.name='Gas mode diagnostics';group.userData={nonPickable:true,quantitativeOnly:true};
 const rotation=new THREE.Group(),migration=new THREE.Group(),flow=new THREE.Group();
 rotation.name='Resolved bulk rotation';migration.name='Population-shell displacement';flow.name='Reference throughput routes';
 group.add(rotation,migration,flow);
 const makeMaterial=(color:number)=>new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,toneMapped:false});
 // Two axial stations distinguish charge populations, not different axial physics.
 const rotors=([['ion',.32,0x9bb8cf],['neutral',.68,0xe0e6be]] as const).map(([kind,z,color])=>{
  const rotor=new THREE.Group(),geometry=new THREE.BufferGeometry(),n=48,indices:number[]=[];
  geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array((n+1)*6),3));
  for(let i=0;i<n;i++){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}geometry.setIndex(indices);
  const arc=new THREE.Mesh(geometry,makeMaterial(color));arc.frustumCulled=false;
  const head=new THREE.Mesh(new THREE.ConeGeometry(R*.055,R*.16,16),makeMaterial(color));
  rotor.position.z=L*z;head.position.x=R*.72;rotor.add(arc,head);rotation.add(rotor);
  rotor.name=kind==='ion'?'Ion rotation arrow':'Neutral rotation arrow';
  rotor.userData={kind,radiusM:R*.72,scope:'Bulk angular speed; two display stations, axially uniform model. Arc integrates up to 0.5 screen seconds of rotation.'};
  return {kind,rotor,arc,head,n};
 });
 const shells=[0,1].flatMap(species=>[.25,.5,.75].map((probability,i)=>{
  const arrow=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),R*.1,species?0xe5ab70:0x94d9cd);
  // ArrowHelper geometries are shared globally; the scene owns these clones.
  arrow.line.geometry=arrow.line.geometry.clone();arrow.cone.geometry=arrow.cone.geometry.clone();
  arrow.name='Equal-count shell displacement';arrow.userData={species,probability,scope:'Change in a population quantile since uniform start; not a microscopic trajectory or instantaneous velocity.'};
  migration.add(arrow);return {arrow,species,probability,z:L*(.24+i*.26),angle:species?Math.PI*.18:Math.PI*.7};
 }));
 // External paths carry number throughput only. They do not imply axial chamber flow.
 const paths=[new THREE.CatmullRomCurve3([[0,0,-R*.95],[0,0,-R*.5],[0,0,L*.08]].map(p=>new THREE.Vector3(p[0],p[1],p[2]))),
  new THREE.CatmullRomCurve3([[0,R,L*.88],[0,R*1.5,L*.88],[0,R*1.5,L*1.14]].map(p=>new THREE.Vector3(p[0],p[1],p[2])))];
 for(const [i,path]of paths.entries()){
  const geometry=new THREE.BufferGeometry().setFromPoints(path.getPoints(64));
  const line=new THREE.Line(geometry,new THREE.LineDashedMaterial({color:0xabbab5,dashSize:R*.08,gapSize:R*.05,transparent:true,opacity:.7}));line.computeLineDistances();
  line.name=i?'Schematic exhaust route':'Schematic inlet route';
  line.userData.scope='Reference Q/(kT); external routing is schematic, not a computed streamline.';
  const direction=path.getTangent(1),head=new THREE.ArrowHelper(direction,path.getPoint(.83),R*.15,0xabbab5,R*.09,R*.06);
  head.line.geometry=head.line.geometry.clone();head.cone.geometry=head.cone.geometry.clone();flow.add(line,head);
 }
 function update(state:FuelMotionState,mode:FuelMotionMode,quantile:(species:number,p:number)=>number,exposure:{ion:number;neutral:number;seconds:number}){
  rotation.visible=mode==='spin'||mode==='equilibrium';migration.visible=mode==='transport';flow.visible=mode==='flow'&&state.turnoverHz>0;
  for(const {kind,rotor,arc,head,n}of rotors){
   const speed=state.speeds[kind],direction=Math.sign(speed),sweep=exposure[kind];
   rotor.visible=speed!==0&&(mode==='spin'||kind==='neutral');rotor.rotation.z=state.phases[kind]%(2*Math.PI);head.rotation.z=direction<0?Math.PI:0;
   rotor.userData.angularSpeedRadS=speed;rotor.userData.exposureS=exposure.seconds;rotor.userData.angularDisplacementRad=sweep;
   const a=arc.geometry.getAttribute('position');
   for(let i=0;i<=n;i++)for(let side=0;side<2;side++){
    const angle=-sweep*i/n,radius=R*(.72+(side?1:-1)*.016);
    a.setXYZ(i*2+side,radius*Math.cos(angle),radius*Math.sin(angle),0);
   }a.needsUpdate=true;
  }
  if(migration.visible)for(const {arrow,species,probability,z,angle}of shells){
   const start=R*Math.sqrt(probability),end=R*Math.sqrt(quantile(species,probability)),distance=end-start,sign=Math.sign(distance);
   arrow.visible=Math.abs(distance)>R*1e-7&&(species===0?result.config.lightFraction>0:result.config.lightFraction<1);
   arrow.userData.startRadiusM=start;arrow.userData.endRadiusM=end;arrow.userData.displacementM=distance;
   if(!arrow.visible)continue;
   arrow.position.set(start*Math.cos(angle),start*Math.sin(angle),z);
   arrow.setDirection(new THREE.Vector3(sign*Math.cos(angle),sign*Math.sin(angle),0));
   arrow.setLength(Math.abs(distance),Math.min(R*.07,Math.abs(distance)*.4),Math.min(R*.04,Math.abs(distance)*.25));
  }
 }
 group.traverse(node=>{
  // CAD-style diagnostics stay readable through hardware; gas particles retain occlusion.
  if(node instanceof THREE.Mesh||node instanceof THREE.Line){
   node.renderOrder=3;
   for(const material of [node.material].flat()){material.depthTest=false;material.depthWrite=false;material.transparent=true;}
  }
  const scope:unknown=node.userData.scope;
  node.userData={...node.userData,quantitativeOnly:true,componentId:'motion',materialBasis:'Numerical diagnostic; no physical material',geometryBasis:'Accepted chamber SI dimensions; glyph widths and display stations are illustrative.',purpose:typeof scope==='string'?scope:'Display diagnostic for gas motion, not physical hardware.'};
 });
 function setSpecies(value:FuelSpecies){for(const {arrow,species}of shells){
  const selected=value==='all'||species===(value==='light'?0:1);
  for(const material of [arrow.line.material,arrow.cone.material].flat()){material.transparent=true;material.opacity=selected?1:.08;}
 }}
 return {group,paths,update,setSpecies};
}

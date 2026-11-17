import * as THREE from 'three';
import {createFuelDrive} from './fuel-drive.js';
import {createFuelCutFaces, type FuelShellMesh} from './fuel-cut-faces.js';
import type {FuelRenderResult, FuelSpecies, createFuelMotion} from './fuel-motion.js';
import type {FuelFieldState, FuelFieldSample} from './fuel-field.js';
import type {FuelConfig} from './fuel-centrifuge.js';
export type {FuelSpecies} from './fuel-motion.js';
import {sampleFuelField,validateProfiles} from './fuel-field.js';
export {sampleFuelField} from './fuel-field.js';

export type FuelFieldLayer = 'composition' | 'enrichment' | 'density' | 'speed' | 'temperature';
export type FuelStaging = {cutaway?: number; ghost?: boolean; explode?: number};
export type FuelColorDomain = readonly [number,number];
export type FuelColorDomains = Partial<Record<FuelFieldLayer,FuelColorDomain>>;
export type FuelDiagnosticSample = FuelFieldSample & {axialM: number; radiusFraction: number; axialUniform: boolean};
type FieldMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
type ShellClone = {mesh: FuelShellMesh; original: FuelShellMesh['material']; clones: THREE.MeshStandardMaterial[]};
type ExplodedMesh = {mesh: THREE.Object3D; position: THREE.Vector3; offset: THREE.Vector3};
type SceneOptions = {scene: THREE.Object3D; result: FuelRenderResult; onSample?: (sample: FuelDiagnosticSample) => void; onControl?: (key: keyof FuelConfig, value?: number, selection?: {componentId: string; keys: readonly (keyof FuelConfig)[]}) => void};

function isMesh(node: THREE.Object3D): node is THREE.Mesh {return 'isMesh' in node && node.isMesh===true;}
function isLayer(value: string): value is FuelFieldLayer {return Object.hasOwn(LAYERS,value);}

const COLORS=['#d29456','#8db3a6'];
const LAYERS: Record<FuelFieldLayer,{label: string; unit: string}>={composition:{label:'Light fraction',unit:''},enrichment:{label:'Δ light fraction · color clipped at ±0.01',unit:''},density:{label:'Neutral density',unit:'m⁻³'},speed:{label:'Neutral bulk speed',unit:'m/s'},temperature:{label:'Neutral temperature',unit:'K'}};
const EQUILIBRIUM='Radial equilibrium reference';
const TRANSIENT='Coupled rotor and radial transport · reflecting wall';
export const FUEL_COMPONENT_CONTROLS: Readonly<Record<string,readonly (keyof FuelConfig)[]>>=Object.freeze({coils:['magneticT'],electrodes:['currentA','driveInnerFraction'],supply:['currentA'],pump:['pumpSpeedM3S'],liner:['linerK'],'light-outlet':['cutFraction'],feed:['conductanceM3S']});

function bounded(value: number,min: number,max: number,name: string){
 if(!Number.isFinite(value)||value<min||value>max)throw new RangeError(`${name} must lie in [${min}, ${max}].`);
 return value;
}
/** Shader clipping is not applied by THREE.Raycaster; use this predicate before accepting a hit. */
export function visibleFuelHit(hit: THREE.Intersection){
 const materials=isMesh(hit.object)?hit.object.material:undefined,material=Array.isArray(materials)?materials[hit.face?.materialIndex??0]:materials;
 const planes=material?.clippingPlanes;
 if(!planes?.length)return true;
 const outside=(p: THREE.Plane)=>p.distanceToPoint(hit.point)<0;
 return !(material.clipIntersection?planes.every(outside):planes.some(outside));
}

/** All numerical geometry is in local SI metres; attach directly to the accepted apparatus root. */
export function createFuelSceneTools({scene,result,onSample=()=>{},onControl=()=>{}}: SceneOptions){
 const c=result.config,R=c.radiusM,L=c.lengthM;
 if(!Number.isFinite(R)||R<=0||!Number.isFinite(L)||L<=0)throw new RangeError('Positive finite gas dimensions required.');
 validateProfiles(result.profiles,R);
 const group=new THREE.Group();group.name='Gas diagnostic slice';group.userData={componentId:'slice',quantitativeOnly:true,purpose:'Axial placement only; the radial model is uniform along z.',materialBasis:'Numerical diagnostic; no physical material'};
 const rings: FieldMesh[]=[],owned: FieldMesh[]=[],originals: ShellClone[]=[],exploded: ExplodedMesh[]=[];
 const gasField=new THREE.Group();gasField.name='Axially uniform gas field';gasField.userData={componentId:'slice',quantitativeOnly:true,purpose:'Numerical density section extruded along the uniform axial model; not predicted optical emission.',materialBasis:'Numerical diagnostic; no physical material'};group.add(gasField);
 let state: FuelFieldState={},layer: FuelFieldLayer='composition',species: FuelSpecies='all',slice=.5,disposed=false,fieldCells=0;
 const peak=Math.max(...result.profiles.map(p=>sampleFuelField(result,p.radiusM).densityM3));
 let domains: Record<FuelFieldLayer,FuelColorDomain>={composition:[0,1],enrichment:[-.01,.01],density:[0,peak],speed:[0,Math.abs(result.samples.at(-1)!.neutralRadS)*R],temperature:[c.gasK,c.gasK]};
 const low=new THREE.Color(COLORS[0]),high=new THREE.Color(COLORS[1]);
 for(let i=0;i<64;i++){
  const inner=R*i/64,outer=R*(i+1)/64;
  const material=new THREE.MeshBasicMaterial({color:low,toneMapped:false,transparent:true,opacity:.72,side:THREE.DoubleSide,depthWrite:false});
  const mesh=new THREE.Mesh(new THREE.RingGeometry(inner,outer,96),material);mesh.name='Radial field sample';
  mesh.userData={componentId:'slice',quantitativeOnly:true,radiusM:Math.sqrt((inner**2+outer**2)/2)};
  rings.push(mesh);owned.push(mesh);group.add(mesh);
 }
 const edge=new THREE.Mesh(new THREE.TorusGeometry(R,R*.004,6,96),new THREE.MeshBasicMaterial({color:0xc3d5cc,transparent:true,opacity:.8,depthWrite:false}));
 edge.name='Axial slice handle';edge.userData={componentId:'slice',controlKey:'slice',quantitativeOnly:true};group.add(edge);owned.push(edge);
 const cut=new THREE.Mesh(new THREE.TorusGeometry(R,R*.006,6,96),new THREE.MeshBasicMaterial({color:0xe1ad78,depthWrite:false}));
 cut.name='Collection radius handle';cut.position.z=R*.012;cut.userData={componentId:'light-outlet',controlKey:'cutFraction',quantitativeOnly:true,purpose:'Prescribed inventory cut; extraction flow is not solved.'};group.add(cut);owned.push(cut);
 const probe=new THREE.Mesh(new THREE.TorusGeometry(R,R*.003,6,96),new THREE.MeshBasicMaterial({color:0xe8eae4,depthTest:false,depthWrite:false}));
 probe.name='Composition probe';probe.position.z=R*.02;probe.renderOrder=5;
 probe.userData={componentId:'slice',quantitativeOnly:true,purpose:'Selected sample radius; display only.'};group.add(probe);owned.push(probe);
 const probeAxis=new THREE.Mesh(new THREE.SphereGeometry(R*.008,8,6),probe.material.clone());
 probeAxis.name='Composition probe axis';probeAxis.position.z=probe.position.z;probeAxis.renderOrder=5;probeAxis.userData={...probe.userData};group.add(probeAxis);owned.push(probeAxis);
 function setProbe(fraction: number){bounded(fraction,0,1,'Probe radius');probe.scale.set(fraction,fraction,1);probe.visible=fraction>0;probeAxis.visible=fraction===0;probe.userData.radiusM=probeAxis.userData.radiusM=fraction*R;return sampleAt(fraction*R);}
 // Clone only the two shell materials; shared electrode and hardware materials retain their original state.
 scene.traverse(mesh=>{
  if(!isMesh(mesh))return;
  if(['Vessel pressure wall','Lithium refractory sub-vessel'].includes(mesh.name)){
   const shell=mesh as FuelShellMesh;
   const original=shell.material,clones=(Array.isArray(original)?original:[original]).map(m=>m.clone());
   shell.material=Array.isArray(original)?clones:clones[0];originals.push({mesh:shell,original,clones});
  }
  if(['coils','electrodes','insulators'].includes(mesh.userData.componentId)){
   scene.updateMatrixWorld(true);
   const local=scene.worldToLocal(mesh.getWorldPosition(new THREE.Vector3()));
   const origin=mesh.parent!.worldToLocal(scene.localToWorld(new THREE.Vector3()));
   const offset=mesh.parent!.worldToLocal(scene.localToWorld(new THREE.Vector3(0,0,R*.65))).sub(origin).multiplyScalar(Math.sign(local.z-L/2));
   exploded.push({mesh,position:mesh.position.clone(),offset});
  }
 });
 scene.add(group);
 const drive=createFuelDrive(c);scene.add(drive.group);
 const cutFaces=createFuelCutFaces(scene,originals,R);

 function sampleAt(radiusM: number): FuelDiagnosticSample{return {...sampleFuelField(result,radiusM,state),axialM:slice*L,radiusFraction:radiusM/R,axialUniform:true};}
 function rebuildField(cells: number){
  if(cells===fieldCells)return;fieldCells=cells;
  for(const node of [...gasField.children]){const mesh=node as FieldMesh;mesh.geometry.dispose();mesh.material.dispose();gasField.remove(mesh);}
  // Equal-volume cell edges match transport exactly. The two flat longitudinal
  // faces reveal the radial field, without implying an axial flow or emissivity.
  for(let i=0;i<cells;i++)for(const side of [-1,1]){
   const inner=R*Math.sqrt(i/cells),outer=R*Math.sqrt((i+1)/cells),a=side*inner,b=side*outer;
   const geometry=new THREE.BufferGeometry();
   geometry.setAttribute('position',new THREE.Float32BufferAttribute([a,0,0,b,0,0,b,0,L,a,0,0,b,0,L,a,0,L],3));
   const material=new THREE.MeshBasicMaterial({color:low,toneMapped:false,side:THREE.DoubleSide});
   const mesh=new THREE.Mesh(geometry,material);mesh.name='Longitudinal gas cell';
   mesh.userData={componentId:'slice',quantitativeOnly:true,cell:i,side,innerRadiusM:inner,outerRadiusM:outer,radiusM:R*Math.sqrt((i+.5)/cells),volumeM3:Math.PI*(outer**2-inner**2)*L};gasField.add(mesh);
  }
 }
 function fieldValue(sample: FuelFieldSample){
  if(layer==='composition')return sample.lightFraction;
  if(layer==='enrichment')return sample.lightFraction===null?null:sample.lightFraction-c.lightFraction;
  if(layer==='density')return species==='light'?sample.lightDensityM3:species==='heavy'?sample.heavyDensityM3:sample.densityM3;
  if(layer==='temperature')return sample.temperatureK;
  return sample.speedMS;
 }
 function fieldColor(value: number | null,domain: FuelColorDomain){
  if(value===null)return new THREE.Color(0x69777a);
  const fraction=domain[1]===domain[0]?0:THREE.MathUtils.clamp((value-domain[0])/(domain[1]-domain[0]),0,1);
  if(layer==='enrichment'){
   const neutral=new THREE.Color('#69777a');return fraction<.5?low.clone().lerp(neutral,fraction*2):neutral.lerp(high,(fraction-.5)*2);
  }
  return low.clone().lerp(high,fraction);
 }
 function repaint(){
  rebuildField(state.lightMass?.length??64);
  const domain=domains[layer];
  for(const ring of [...rings,...gasField.children as FieldMesh[]]){
   const sample=sampleAt(ring.userData.radiusM),value=fieldValue(sample);
   ring.material.color.copy(fieldColor(value,domain));
   ring.userData={...ring.userData,...sample,value,layer,unit:LAYERS[layer].unit,purpose:`${sample.scope}; uniform along z. Numerical field, not optical emission.`};
  }
  group.userData={...group.userData,layer,timeS:state.timeS??result.samples.at(-1)!.timeS,scope:state.scope??(state.lightMass?TRANSIENT:EQUILIBRIUM)};
 }
 function setSlice(fraction: number){slice=bounded(fraction,0,1,'Slice');group.position.z=slice*L;gasField.position.z=-slice*L;repaint();return slice;}
 function setLayer(value: string){if(!isLayer(value))throw new RangeError('Unknown field layer.');layer=value;repaint();return layer;}
 function setSpecies(value: FuelSpecies){if(!['all','light','heavy'].includes(value))throw new RangeError('Unknown species display.');species=value;repaint();}
 function setDomains(next: FuelColorDomains){
  for(const [key,range] of Object.entries(next)){
   if(!isLayer(key)||!Array.isArray(range)||range.length!==2||!range.every(Number.isFinite)||key!=='enrichment'&&range[0]<0||range[1]<range[0]||key==='composition'&&(range[0]!==0||range[1]!==1)||key==='enrichment'&&(range[0]!==-.01||range[1]!==.01))throw new RangeError('Ordered finite physical color domains required; composition uses [0, 1] and enrichment uses [-0.01, 0.01].');
  }
  domains={...domains,...Object.fromEntries(Object.entries(next).map(([k,v])=>[k,[...v]]))};repaint();
 }
 function update(next: FuelFieldState={}){
  validateProfiles(next.profiles??result.profiles,R);
  if(next.timeS!==undefined)bounded(next.timeS,0,Number.MAX_VALUE,'Physical time');
  sampleFuelField(result,0,next);
  state={...next};repaint();
 }
 function setStaging({cutaway=0,ghost=false,explode=0}: FuelStaging={}){
  bounded(cutaway,0,1,'Cutaway');bounded(explode,0,1,'Explode');
  const previous=group.userData.staging;if(!previous||previous.cutaway!==cutaway||previous.ghost!==ghost||previous.explode!==explode)scene.userData.shadowRevision=(scene.userData.shadowRevision??0)+1;
  scene.updateMatrixWorld(true);
  // A planar opening in the illustrative shell, never a new gas boundary.
  const plane=new THREE.Plane(new THREE.Vector3(0,-1,0),R*(1-2*cutaway)).applyMatrix4(scene.matrixWorld);
  for(const {clones,original} of originals)for(let i=0;i<clones.length;i++){
   const material=clones[i],base=Array.isArray(original)?original[i]:original;
   material.clippingPlanes=cutaway>0?[plane]:base.clippingPlanes;material.clipShadows=cutaway>0||base.clipShadows;
   material.transparent=ghost||base.transparent;material.opacity=ghost?Math.min(.14,base.opacity):base.opacity;material.depthWrite=ghost?false:base.depthWrite;material.needsUpdate=true;
  }
  for(const {mesh,position,offset} of exploded)mesh.position.copy(position).addScaledVector(offset,explode);
  cutFaces.update(cutaway,ghost);
  group.userData.staging={cutaway,ghost,explode,scope:'Display staging only; numerical gas surfaces remain fixed.'};
 }
 function setCut(fraction: number,{commit=false}: {commit?: boolean}={}){
  bounded(fraction,0,1,'Collection cut');cut.scale.set(fraction,fraction,1);cut.visible=c.application==='enrichment'&&fraction>0;
  cut.userData.cutRadiusM=fraction*R;if(commit)onControl('cutFraction',fraction);return fraction;
 }
 function sampleWorld(point: THREE.Vector3){scene.updateMatrixWorld(true);const local=scene.worldToLocal(point.clone()),radiusM=Math.hypot(local.x,local.y);if(radiusM>R*(1+1e-10)||local.z < -L*1e-10||local.z>L*(1+1e-10))return null;const sample={...sampleAt(Math.min(radiusM,R)),axialM:THREE.MathUtils.clamp(local.z,0,L)};onSample(sample);return sample;}
 function projectCut(ray: THREE.Ray){scene.updateMatrixWorld(true);const plane=new THREE.Plane(new THREE.Vector3(0,0,1),-slice*L).applyMatrix4(scene.matrixWorld),point=ray.intersectPlane(plane,new THREE.Vector3());if(!point)return null;scene.worldToLocal(point);return THREE.MathUtils.clamp(Math.hypot(point.x,point.y)/R,0,1);}
 function handlePick(id: string){const keys=FUEL_COMPONENT_CONTROLS[id]??[];if(keys.length)onControl(keys[0],undefined,{componentId:id,keys});return keys;}
 function dispose(){
  if(disposed)return;disposed=true;cutFaces.dispose();group.removeFromParent();drive.group.removeFromParent();
  const resources=new Set<THREE.BufferGeometry | THREE.Material>();drive.group.traverse(node=>{if(isMesh(node)||node instanceof THREE.Line){resources.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:[node.material])resources.add(material);}});for(const resource of resources)resource.dispose();
  for(const mesh of [...owned,...gasField.children as FieldMesh[]]){mesh.geometry.dispose();mesh.material.dispose();}
  for(const {mesh,original,clones} of originals){mesh.material=original;for(const material of clones)material.dispose();}
  for(const {mesh,position} of exploded)mesh.position.copy(position);
 }
 setCut(c.cutFraction);setProbe(.5);setSlice(slice);
 const tools={group,drive,radiusM:R,setProbe,update,setSlice,setLayer,setSpecies,setDomains,setStaging,setCut,sampleAt,sampleWorld,projectCut,handlePick,visibleHit:visibleFuelHit,dispose,get legend(){return {layer,...LAYERS[layer],label:layer==='density'&&species!=='all'?`${species==='light'?result.pair.light:result.pair.heavy} neutral density`:LAYERS[layer].label,domain:[...domains[layer]],colors:layer==='enrichment'?[COLORS[0],'#69777a',COLORS[1]]:[...COLORS],scope:state.scope??(state.lightMass?TRANSIENT:EQUILIBRIUM),axialUniform:true};}};
 const resultTools: typeof tools & {motion?: ReturnType<typeof createFuelMotion>; circuit?: THREE.Group}=tools;
 return resultTools;
}
export type FuelSceneTools = ReturnType<typeof createFuelSceneTools>;

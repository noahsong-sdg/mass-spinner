import * as THREE from 'three/webgpu';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {DEFAULT_CONFIG} from './physics.js';
import {fieldGraphics} from './field-graphics.js';
import type {RunConfig,Vec,simulate} from './physics.js';
type OrbitResult=ReturnType<typeof simulate>;
export interface LegacyRendererOptions {
 $: { (id:'scene'):HTMLCanvasElement; (id:string):HTMLElement };
 config:()=>RunConfig; mode:()=>string;
 getLatest:()=>{kind:string;result:unknown}|null;
 getView:()=>string; isActive:()=>boolean; onFailure:(error:unknown)=>void;
}
function materials(item:{material:THREE.Material|THREE.Material[]}){return Array.isArray(item.material)?item.material:[item.material];}

/** Loaded only for the charged separator's hardware, field and orbit views. */
export function createLegacyRenderer({$,config,mode,getLatest,getView,isActive,onFailure}:LegacyRendererOptions){
let hardware:THREE.Group|undefined,renderer:THREE.WebGPURenderer|undefined,controls:OrbitControls|undefined,scene:THREE.Scene|undefined,camera:THREE.PerspectiveCamera|undefined;
const colors=[0xa4c4b1,0xd2956b];
const trajectories = new THREE.Group(), fieldGroup = new THREE.Group();
const legacyCenter=new THREE.Vector3();let legacyRadius=0;
const toScene = (p:Vec) => new THREE.Vector3(p[2]-DEFAULT_CONFIG.length/2,p[0],p[1]);

function clear(group:THREE.Object3D) {
  for(const child of [...group.children]) {
    child.traverse(item => { if(item instanceof THREE.Mesh||item instanceof THREE.Line||item instanceof THREE.Points){(item.geometry as THREE.BufferGeometry).dispose();for(const material of materials(item))material.dispose();} });
    group.remove(child);
  }
}
function line(points:THREE.Vector3[], color:THREE.ColorRepresentation, opacity=1) {
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));
}
function showView(next:string) {
  trajectories.visible=next==='orbits'; fieldGroup.visible=next==='fields';
  hardware?.traverse(item=>{
    if(!(item instanceof THREE.Mesh))return;
    for(const material of materials(item)){
     material.transparent=next!=='hardware';material.opacity=next==='hardware'?1:.12;
     material.depthWrite=next==='hardware';material.needsUpdate=true;
    }
  });
}
function updateFields() {
  clear(fieldGroup);
  if(!scene||!['rotating','icr'].includes(mode()))return;
  const c=config(),{radius:a,length:l}=c;
  let samples;
  try{samples=fieldGraphics(c);}catch{ $('field-scale').textContent='Enter finite field parameters.';return; }
  const ring = (x:number) => Array.from({length:97},(_,i)=>new THREE.Vector3(x,a*Math.cos(i*Math.PI/48),a*Math.sin(i*Math.PI/48)));
  for(const x of [-l/2,l/2]) fieldGroup.add(line(ring(x),0xb1b5ad,.8));
  for(let i=0;i<12;i++) {
    const t=i*Math.PI/6,y=a*Math.cos(t),z=a*Math.sin(t);
    fieldGroup.add(line([new THREE.Vector3(-l/2,y,z),new THREE.Vector3(l/2,y,z)],0x717c7a,.45));
  }
  for(const [glyphs,reference,color]of [[samples.electric,samples.electricReferenceVM,0xd2956b],[samples.magnetic,samples.magneticReferenceT,0xa4c4b1]] as const){
    for(const {position,vector}of glyphs){
      const direction=new THREE.Vector3(vector[2],vector[0],vector[1]),magnitude=direction.length();
      if(magnitude===0)continue;
      const length=.42*a*magnitude/reference;
      fieldGroup.add(new THREE.ArrowHelper(direction.normalize(),toScene(position),length,color,length*.24,length*.12));
    }
  }
  $('field-scale').textContent=`E (copper) ≤ ${samples.electricReferenceVM.toPrecision(3)} V/m · B (sage) ${c.magneticT.toPrecision(3)} T · arrows scaled separately${c.mode==='icr'?' · RF snapshot t = 0':''}`;
}
function drawPaths(result:OrbitResult|null) {
  clear(trajectories);
  if(!scene||!result)return;
  result.species.forEach((s,i)=>s.paths.forEach(path=>{
    trajectories.add(line(path.positions.map(toScene),colors[i],.88));
    const dot=new THREE.Mesh(new THREE.SphereGeometry(.009,8,6),new THREE.MeshBasicMaterial({color:colors[i]}));
    dot.position.copy(toScene(path.positions.at(-1)!)); trajectories.add(dot);
  }));
}
function legacyFitDistance(){
  if(!camera)return 0;
  const vertical=THREE.MathUtils.degToRad(camera.fov),horizontal=2*Math.atan(Math.tan(vertical/2)*camera.aspect);
  return 1.12*legacyRadius/Math.sin(Math.min(vertical,horizontal)/2);
}
function resetCamera() {
  if(!hardware||!camera||!controls)return;
  const distance=legacyFitDistance();
  controls.target.copy(legacyCenter);camera.position.copy(legacyCenter).addScaledVector(new THREE.Vector3(3.5,2.35,4.1).normalize(),distance);
  controls.minDistance=2;controls.maxDistance=Math.max(10,2*distance);
  camera.far=Math.max(100,controls.maxDistance+legacyRadius*20);camera.updateProjectionMatrix();controls.update();
}
function resizeScene(){
  if(!renderer||!camera||!controls)return;
  const {width,height}=$('stage').getBoundingClientRect();
  if(width<=0||height<=0)return;
  const previousFit=legacyFitDistance();
  renderer.setSize(width,height,false);camera.aspect=width/height;
  const ratio=legacyFitDistance()/previousFit;
  camera.position.sub(controls.target).multiplyScalar(ratio).add(controls.target);
  controls.minDistance*=ratio;controls.maxDistance*=ratio;controls.update();
  camera.far=Math.max(100,controls.maxDistance+legacyRadius*20);camera.updateProjectionMatrix();
}
let environment:THREE.RenderTarget|undefined,observer:ResizeObserver|undefined,keyboard:((event:KeyboardEvent)=>void)|undefined;
function dispose(){
    observer?.disconnect();if(keyboard)$('scene').removeEventListener('keydown',keyboard);
    void renderer?.setAnimationLoop(null);controls?.dispose();environment?.dispose();
    clear(trajectories);clear(fieldGroup);if(scene)clear(scene);void renderer?.dispose();
    renderer=undefined;controls=undefined;hardware=undefined;camera=undefined;scene=undefined;environment=undefined;observer=undefined;keyboard=undefined;
}
async function initScene() {
  try {
    scene=new THREE.Scene(); scene.background=new THREE.Color('#151919');
    camera=new THREE.PerspectiveCamera(33,1,.05,100);
    renderer=new THREE.WebGPURenderer({canvas:$('scene'),antialias:true,alpha:false});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.25;
    await renderer.init();
    const studio=new RoomEnvironment();
    let pmrem;
    try{pmrem=new THREE.PMREMGenerator(renderer);environment=pmrem.fromScene(studio,.04);}finally{studio.dispose();pmrem?.dispose();}
    scene.environment=environment.texture; scene.environmentIntensity=1.15;
    scene.add(new THREE.HemisphereLight(0xeaf0ed,0x242b29,1.5));
    const key=new THREE.DirectionalLight(0xffe4c8,3); key.position.set(0,5,4); scene.add(key);
    const fill=new THREE.DirectionalLight(0xa6c3d0,2); fill.position.set(-3,2,-3); scene.add(fill);
    controls=new OrbitControls(camera,$('scene')); controls.enableDamping=true;
    controls.minDistance=2; controls.maxDistance=10; controls.maxPolarAngle=Math.PI*.85;
    const gltf=await new GLTFLoader().loadAsync('/separator.glb');
    hardware=gltf.scene; scene.add(hardware,trajectories,fieldGroup);
    // Keep independently adjustable opacity per mesh when inspecting the interior.
    hardware.traverse(item=>{if(item instanceof THREE.Mesh){const mesh=item as THREE.Mesh<THREE.BufferGeometry,THREE.Material|THREE.Material[]>;mesh.material=Array.isArray(mesh.material)?mesh.material.map(material=>material.clone()):mesh.material.clone();}});
    hardware.updateWorldMatrix(true,true);const bounds=new THREE.Box3().setFromObject(hardware);
    bounds.getCenter(legacyCenter);legacyRadius=bounds.getBoundingSphere(new THREE.Sphere()).radius;
    if(!Number.isFinite(legacyRadius)||legacyRadius<=0)throw new Error('3D model has no finite geometry.');
    updateFields();const latest=getLatest();if(latest&&['rotating','icr'].includes(latest.kind))drawPaths(latest.result as OrbitResult);showView(getView());
    observer=new ResizeObserver(resizeScene);observer.observe($('stage'));
    resizeScene();resetCamera();
    await renderer.compileAsync(scene,camera);void renderer.render(scene,camera);
    void renderer.setAnimationLoop(()=>{if($('scene').hidden||!isActive()||!controls||!renderer||!scene||!camera)return;try{controls.update();void renderer.render(scene,camera);}catch(error){onFailure(error);}});
    keyboard=event=>{
      if(!camera||!controls)return;
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(event.key))return;
      event.preventDefault();
      const offset=camera.position.clone().sub(controls.target),s=new THREE.Spherical().setFromVector3(offset);
      if(event.key==='ArrowLeft')s.theta-=.1;if(event.key==='ArrowRight')s.theta+=.1;
      if(event.key==='ArrowUp')s.phi=Math.max(.1,s.phi-.1);if(event.key==='ArrowDown')s.phi=Math.min(Math.PI*.85,s.phi+.1);
      if(event.key==='+'||event.key==='=')s.radius=Math.max(controls.minDistance,s.radius*.9);if(event.key==='-')s.radius=Math.min(controls.maxDistance,s.radius*1.1);
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));controls.update();
    };$('scene').addEventListener('keydown',keyboard);
  } catch(error) {
    dispose();throw error;
  }
}

return {initScene,dispose,showView,updateFields,drawPaths,resetCamera,
 get hardware(){return hardware;},get camera(){return camera;},
 get webGPU(){return !!(renderer?.backend&&'isWebGPUBackend' in renderer.backend&&renderer.backend.isWebGPUBackend);}};
}

import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createSurfaceLayer, type SurfaceSettings} from './surface-layer.js';
import type {SurfaceState} from './surface-state.js';
import {createReactorMotionLayer} from './reactor-motion-layer.js';
import type {ReactorMotionState} from './reactor-motion.js';
import {createAssemblyLayout} from './assembly-layout.js';

export type CameraVector=[number,number,number];
export interface CameraPose {position:CameraVector;target:CameraVector;up?:CameraVector}
export interface ModelCamera {position?:number[];portraitPosition?:number[];target?:number[];up?:number[];fitScale?:number}
export interface ViewerAsset<Model=unknown> {model:Model;modelCamera?:ModelCamera;scaleLabel?:string;reactor?:'beam'|'power-reference'}
export interface ViewerLoader<Model=unknown> {loadAsync(source:Model):Promise<{scene:THREE.Object3D}>}
export interface ViewerControls {
 target:THREE.Vector3;enableDamping?:boolean;enabled?:boolean;minDistance:number;maxDistance:number;
 addEventListener(type:'change',listener:()=>void):void;removeEventListener(type:'change',listener:()=>void):void;
 update():unknown;dispose():void;
}
export interface ViewerRenderer {
 localClippingEnabled?:boolean;shadowMap?:{needsUpdate:boolean};
 compileAsync?(scene:THREE.Scene,camera:THREE.PerspectiveCamera):Promise<unknown>;
 render(scene:THREE.Scene,camera:THREE.PerspectiveCamera):void;clear():void;setSize(width:number,height:number,updateStyle?:boolean):void;
}
export interface DisplayAdapter {renderer:ViewerRenderer;environment?:THREE.Texture;dispose():void}
export type ViewerHit=THREE.Intersection<THREE.Object3D>;
export type ViewerDragEvent={phase:'start'|'move';ray:THREE.Ray;hits:ViewerHit[]}|{phase:'end'|'cancel'};
export interface ViewerRepresentation {geometry:'accepted'|'reference'|'none';status:string;layer:string;numerical:boolean}
export interface ApparatusViewerOptions<Model=string> {
 onSelect?:(id:string,part?:Record<string,unknown>,name?:string,hit?:ViewerHit)=>void;
 onError?:(error:unknown)=>void;onRepresentation?:(representation:ViewerRepresentation)=>void;
 onCamera?:(pose:CameraPose)=>void;onResize?:(pose:CameraPose)=>void;onHover?:(hit:ViewerHit|null)=>void;
 pickFilter?:(hit:ViewerHit)=>boolean;onDrag?:(event:ViewerDragEvent)=>boolean|void;
 displayFactory?:(canvas:HTMLCanvasElement)=>DisplayAdapter;
 controlsFactory?:(camera:THREE.PerspectiveCamera,canvas:HTMLCanvasElement)=>ViewerControls;
 loader?:ViewerLoader<Model>;
}
export interface ApparatusViewer<Model=unknown> {
 canvas:HTMLCanvasElement;load(asset:ViewerAsset<Model>,options?:{preserveOwnership?:boolean}):Promise<boolean>;
 select(id:string|null):void;focus(id:string,options?:{animate?:boolean}):void;reset():void;resize():void;refresh():void;
 explode(id:string|null):void;
 setAnimation(callback:((dt:number)=>void)|null):void;cameraPose():CameraPose;
 updateReactorState(value:ReactorMotionState|null):void;setActive(value:boolean):void;
 setCamera(pose:CameraPose|null|undefined,options?:{preserveOwnership?:boolean}):void;
 updateSurfaceState(packet:SurfaceState|null|undefined,settings?:SurfaceSettings):void;setPending(value:boolean):void;dispose():void;
}
type ViewerEvents={webglcontextrestored:Event;pointerdown:PointerEvent;wheel:WheelEvent;pointermove:PointerEvent;pointercancel:PointerEvent;lostpointercapture:PointerEvent;pointerup:PointerEvent;keydown:KeyboardEvent};
type Drawable=THREE.Object3D & {geometry?:THREE.BufferGeometry;material?:THREE.Material|THREE.Material[]};
function isDrawable(node:THREE.Object3D):node is Drawable {return 'geometry' in node||'material' in node;}
function isMesh(node:THREE.Object3D):node is THREE.Mesh {return 'isMesh' in node&&node.isMesh===true;}
function isPoints(node:THREE.Object3D):node is THREE.Points {return 'isPoints' in node&&node.isPoints===true;}
function isLine(node:THREE.Object3D):node is THREE.Line {return 'isLine' in node&&node.isLine===true;}
function isTexture(value:unknown):value is THREE.Texture {return typeof value==='object'&&value!==null&&'isTexture' in value&&value.isTexture===true;}
function materialIsTransparent(material:THREE.Material|THREE.Material[]) {return Array.isArray(material)?undefined:material.transparent;}
function isViewContext(node:THREE.Object3D){for(let parent:THREE.Object3D|null=node;parent;parent=parent.parent)if(parent.userData.viewContext)return true;return false;}


export function componentId(object:THREE.Object3D|null|undefined):string|null{
 for(let node=object;node;node=node.parent)if(typeof node.userData?.componentId==='string')return node.userData.componentId;
 return null;
}
/** PointsMaterial size is pixels; a metre-sized raycaster threshold is not a visual hit. */
export function screenSpacePointHit(hit:ViewerHit,camera:THREE.Camera,point:THREE.Vector2,bounds:Pick<DOMRect,'width'|'height'>,pixels=4){
 if(!isPoints(hit.object))return true;
 const position=new THREE.Vector3().fromBufferAttribute(hit.object.geometry.getAttribute('position'),hit.index!)
  .applyMatrix4(hit.object.matrixWorld).project(camera);
 return position.z>=-1&&position.z<=1&&Math.hypot((position.x-point.x)*bounds.width/2,(position.y-point.y)*bounds.height/2)<=pixels;
}

function displayFactory(canvas:HTMLCanvasElement):DisplayAdapter{
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,logarithmicDepthBuffer:true});
 renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,2));
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.88;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;
 const studio=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(studio,.04);
 studio.dispose();pmrem.dispose();
 return {renderer,environment:environment.texture,dispose(){environment.dispose();renderer.dispose();}};
}

function release(root:THREE.Object3D){
 const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
 root.traverse(node=>{if(node instanceof THREE.InstancedMesh)node.dispose();if(!isDrawable(node))return;if(node.geometry)geometries.add(node.geometry);for(const material of node.material?Array.isArray(node.material)?node.material:[node.material]:[]){
  materials.add(material);for(const value of Object.values(material))if(isTexture(value))textures.add(value);
 }});
 for(const value of [...textures,...materials,...geometries])value.dispose();
 root.removeFromParent();
}

/** Actual glTF/PBR display. Injected graphics adapters permit lifecycle tests without claiming GPU verification. */
export function createApparatusViewer(frame:HTMLElement,options?:ApparatusViewerOptions<string>):ApparatusViewer<string>;
export function createApparatusViewer<Model>(frame:HTMLElement,options:ApparatusViewerOptions<Model>&{loader:ViewerLoader<Model>}):ApparatusViewer<Model>;
export function createApparatusViewer(frame:HTMLElement,{onSelect=()=>{},onError=()=>{},onRepresentation=()=>{},onCamera=()=>{},onResize=()=>{},onHover=()=>{},pickFilter=()=>true,onDrag=()=>false,displayFactory:makeDisplay=displayFactory,
 controlsFactory=(camera,canvas)=>new OrbitControls(camera,canvas),loader=new GLTFLoader()}:ApparatusViewerOptions<unknown>={}):ApparatusViewer<unknown>{
 const doc=frame.ownerDocument,canvas=doc.createElement('canvas'),status=doc.createElement('p');
 canvas.tabIndex=0;canvas.setAttribute('aria-label','3D apparatus. Drag to turn the view. Scroll to zoom. Use the arrow keys to turn, or plus and minus to zoom.');
 status.setAttribute('role','status');status.className='apparatus-status';frame.replaceChildren(canvas,status);
 const scaleNote=doc.createElement('output');scaleNote.className='apparatus-scale-note';scaleNote.hidden=true;frame.append(scaleNote);
 const display=makeDisplay(canvas),renderer=display.renderer,scene=new THREE.Scene();
 renderer.localClippingEnabled=true;
 scene.background=new THREE.Color('#121716');scene.environment=display.environment??null;scene.environmentIntensity=.8;
 scene.add(new THREE.HemisphereLight(0xdde6e5,0x17201e,.3));
 const key=new THREE.DirectionalLight(0xffebd5,2.2);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.bias=-.00015;scene.add(key,key.target);
 const fill=new THREE.DirectionalLight(0xb5cadb,.7);fill.position.set(-3,2,-4);scene.add(fill);
 const rim=new THREE.DirectionalLight(0xe1eef3,1.5);rim.position.set(-2,1,-3);scene.add(rim);
 const camera=new THREE.PerspectiveCamera(35,1,.001,1000);let controls=controlsFactory(camera,canvas);
 controls.enableDamping=false;
 let root:THREE.Object3D|null=null,referenceRoot:THREE.Object3D|null=null,generation=0,disposed=false,asset:ViewerAsset|null=null,pointer:{id:number;x:number;y:number}|null=null,highlights:[THREE.Mesh,THREE.Material|THREE.Material[],THREE.Material[]][]=[],accepted:{packet:SurfaceState;settings:SurfaceSettings}|null=null;
 let animation:((dt:number)=>void)|null=null,animationFrame:number|null=null,lastFrame:number|null=null,flight:number|null=null,shadowRevision:unknown;
 let preparingGeneration:number|null=null,preparationChanged=false,drawFrame:number|null=null;
 const win=doc.defaultView!;
 let hoverFrame:number|null=null,hoverEvent:PointerEvent|null=null;
 function cancelHover(){if(hoverFrame!==null)win.cancelAnimationFrame(hoverFrame);hoverFrame=null;hoverEvent=null;}
 const assemblyBar=doc.createElement('div'),assemblyLabel=doc.createElement('span'),assemble=doc.createElement('button');
 assemblyBar.className='assembly-view';assemblyBar.hidden=true;assemblyLabel.setAttribute('role','status');
 assemble.type='button';assemble.textContent='Assemble';assemblyBar.append(assemblyLabel,assemble);frame.append(assemblyBar);
 let assembly:ReturnType<typeof createAssemblyLayout>|null=null,assemblyFrame:number|null=null,assemblyAmount=0,assemblyTarget=0,selectedComponent:string|null=null;
 const reducedAssemblyMotion=win?.matchMedia?.('(prefers-reduced-motion: reduce)');
 function stopAssembly(){if(assemblyFrame!==null)win.cancelAnimationFrame(assemblyFrame);assemblyFrame=null;}
 function clearAssembly(){
  stopAssembly();assembly?.apply(0);assembly=null;assemblyAmount=assemblyTarget=0;assemblyBar.hidden=true;
  canvas.setAttribute('data-assembly-state','assembled');canvas.removeAttribute?.('data-assembly-component');
 }
 function finishAssembly(){
  assembly?.apply(assemblyAmount=assemblyTarget);
  if(renderer.shadowMap)renderer.shadowMap.needsUpdate=true;
  canvas.setAttribute('data-assembly-state',assemblyTarget?'exploded':'assembled');
  if(!assemblyTarget){assembly=null;assemblyBar.hidden=true;select(selectedComponent);fit();reset();refreshReactor();}
  render();
 }
 function explode(id:string|null){
  if(!root||disposed)return;
  if(id){
   assembly??=createAssemblyLayout(root);if(!assembly.has(id)){if(assemblyTarget)explode(null);else assembly=null;return;}
   assemblyLabel.textContent='Exploded view · display only';assemblyBar.hidden=false;
   canvas.setAttribute('data-assembly-component',id);
   const alreadyOpen=assemblyTarget===1;assemblyTarget=1;select(id);if(alreadyOpen)return;
   // Frame the final bounds before parts move, so the outer parts stay in view.
   fit(assembly.bounds);reset();
  }else{if(!assembly)return;assemblyTarget=0;canvas.removeAttribute?.('data-assembly-component');}
  stopAssembly();canvas.setAttribute('data-assembly-state',assemblyTarget?'separating':'assembling');
  if(reducedAssemblyMotion?.matches){finishAssembly();return;}
  const from=assemblyAmount;let started:number|undefined;
  function step(now:number){
   assemblyFrame=null;if(disposed||!assembly)return;started??=now;
   const t=Math.min(1,(now-started)/(assemblyTarget?450:320)),ease=1-(1-t)**4;
   assembly.apply(assemblyAmount=from+(assemblyTarget-from)*ease);
   if(renderer.shadowMap)renderer.shadowMap.needsUpdate=true;
   if(t===1)finishAssembly();else{render();assemblyFrame=win.requestAnimationFrame(step);}
   if(animationFrame===null)flushRender();
  }
  cancelRender();assemblyFrame=win.requestAnimationFrame(step);
 }
 assemble.addEventListener('click',()=>explode(null));
 const settleAssembly=()=>{if(assemblyFrame!==null){stopAssembly();finishAssembly();}};
 reducedAssemblyMotion?.addEventListener?.('change',settleAssembly);
 function cameraPose():CameraPose{return {position:camera.position.toArray(),target:controls.target.toArray(),up:camera.up.toArray()};}
 let settingCamera=false,dragging:number|null=null,pristineCamera=true;
 function cameraChanged(){if(settingCamera)return;render();pristineCamera=false;onCamera(cameraPose());}
 function stopFlight(){if(flight!==null)win.cancelAnimationFrame(flight);flight=null;}
 function setCamera(pose:CameraPose|null|undefined,{preserveOwnership=false}:{preserveOwnership?:boolean}={}){
  if(!pose||disposed)return;stopFlight();if(!preserveOwnership)pristineCamera=false;settingCamera=true;cameraUp(new THREE.Vector3(...(pose.up??camera.up.toArray())));
  camera.position.fromArray(pose.position);controls.target.fromArray(pose.target);
  camera.far=Math.max(camera.far,camera.position.distanceTo(controls.target)+radius*20);camera.updateProjectionMatrix();controls.update();render();settingCamera=false;
 }
 function setAnimation(callback:((dt:number)=>void)|null){
  if(animationFrame!==null)win.cancelAnimationFrame(animationFrame);
  animationFrame=null;lastFrame=null;animation=disposed?null:callback;
  if(animation)cancelRender();
  if(animation&&!doc.hidden&&preparingGeneration===null)animationFrame=win.requestAnimationFrame(tick);
 }
 function tick(now:number){
  animationFrame=null;if(!animation||disposed||doc.hidden||preparingGeneration!==null)return;
  const callback=animation,dt=lastFrame===null?0:(now-lastFrame)/1000;lastFrame=now;
  callback(dt);render();flushRender();
  if(animation===callback)animationFrame=win.requestAnimationFrame(tick);
 }
 const visibility=()=>{if(doc.hidden){cancelHover();cancelRender();stopFlight();settleAssembly();}setAnimation(animation);if(!doc.hidden)render();};doc.addEventListener('visibilitychange',visibility);
 const center=new THREE.Vector3(),modelBounds=new THREE.Box3();let radius=1,representationKey='',loadStatus='reference';
 function reportRepresentation(){
  const acceptedRoot=root===stateLayer.group,representation:ViewerRepresentation={geometry:root?acceptedRoot?'accepted':'reference':'none',
   status:acceptedRoot?accepted?.packet.status??'reference':loadStatus,...(acceptedRoot?stateLayer.representation:{layer:'reference',numerical:false})};
  const key=JSON.stringify(representation);if(key!==representationKey){representationKey=key;onRepresentation(representation);}
 }
 function cancelRender(){if(drawFrame!==null)win.cancelAnimationFrame(drawFrame);drawFrame=null;}
 function flushRender(){
  cancelRender();
  if(disposed||!root||!active||doc.hidden||preparingGeneration!==null)return;
  if(assembly&&reactorLayer)reactorLayer.group.visible=false;
  if(root.userData.shadowRevision!==shadowRevision){shadowRevision=root.userData.shadowRevision;updateShadows();}
  renderer.render(scene,camera);reportRepresentation();
 }
 // Several controls can change one scene before the next screen frame.
 function render(){
  if(preparingGeneration!==null){preparationChanged=true;return;}
  if(disposed||!root)return;
  reportRepresentation();
  if(active&&!doc.hidden&&drawFrame===null&&animationFrame===null)drawFrame=win.requestAnimationFrame(flushRender);
 }
 const stateLayer=createSurfaceLayer(frame,{render,onSelect});scene.add(stateLayer.group);
 let reactorState:ReactorMotionState|null=null,reactorPending=false,active=true,reactorLayer:ReturnType<typeof createReactorMotionLayer>|null=null;
 const animateReactor=(dt:number)=>reactorLayer?.tick(dt);
 function refreshReactor(){
  reactorLayer?.update(reactorState,root,reactorPending);
  if(asset?.reactor){
   const nextAnimation=active&&reactorLayer?.running?animateReactor:null;
   // Input updates preserve the clock; visibility changes still restart it through setAnimation.
   if(animation!==nextAnimation)setAnimation(nextAnimation);
   render();
  }
 }
 function describeScale(){scaleNote.textContent=asset?.scaleLabel??'';scaleNote.hidden=!root||!asset?.scaleLabel;}
 function modelUp(){const up=asset?.modelCamera?.up??[0,1,0];return root===stateLayer.group?new THREE.Vector3(1,0,0).transformDirection(root.matrixWorld):new THREE.Vector3(up[0],up[1],up[2]);}
 function fit(expanded?:THREE.Box3){
  root!.updateWorldMatrix(true,true);const bounds=expanded?modelBounds.copy(expanded):modelBounds.makeEmpty();
  if(!expanded)root!.traverse(node=>{
   if(isViewContext(node)||!isMesh(node)&&!isLine(node)&&!isPoints(node))return;
   bounds.expandByObject(node);
  });
  radius=bounds.getBoundingSphere(new THREE.Sphere()).radius;
  if(!Number.isFinite(radius)||radius<=0)throw new Error('3D model has no finite geometry.');
  bounds.getCenter(center);radius=bounds.getBoundingSphere(new THREE.Sphere()).radius;
  // Shadow framing follows SI scene bounds, including microscopic targets and
  // large blanket models. Numerical overlays must not cast hardware shadows.
  updateShadows();
  key.target.position.copy(center);key.position.copy(center).addScaledVector(new THREE.Vector3(2,4,3),radius);
  Object.assign(key.shadow.camera,{left:-radius*2,right:radius*2,top:radius*2,bottom:-radius*2,near:radius*.01,far:radius*12});key.shadow.normalBias=radius*.0008;key.shadow.camera.updateProjectionMatrix();
  if(renderer.shadowMap)renderer.shadowMap.needsUpdate=true;
 }
 function updateShadows(){
  root?.traverse(node=>{if(isMesh(node)){node.castShadow=!node.userData.quantitativeOnly&&!materialIsTransparent(node.material)&&node.userData.componentId!=='profile';node.receiveShadow=node.castShadow;}});
  if(renderer.shadowMap)renderer.shadowMap.needsUpdate=true;
 }
 function updateSurfaceState(packet:SurfaceState|null|undefined,settings:SurfaceSettings={}){
  if(disposed)return;accepted=packet?{packet,settings}:null;
  clearAssembly();
  const previousRoot=root;
  clearSelection();const changed=stateLayer.update(packet,settings);
  if(!referenceRoot)return;
  referenceRoot.visible=stateLayer.group.children.length===0;loadStatus=packet?.status==='pending'?'pending':'reference';
  root=referenceRoot.visible?referenceRoot:stateLayer.group;
  if(changed||root!==previousRoot){fit();resize();reset();}else render();
  refreshReactor();
 }
 function resize(){
  if(disposed)return;const {width,height}=frame.getBoundingClientRect();if(width<=0||height<=0)return;
  const previousFit=fitDistance(),wasPortrait=camera.aspect<1;
  renderer.setSize(width,height,false);camera.aspect=width/height;
  // Keep the user's relative zoom, orbit and focused target as scene allocation changes.
  if(root){
   const previousSetting=settingCamera;settingCamera=true;
   if(portraitComposition()&&pristineCamera&&wasPortrait!==(camera.aspect<1))reset();
   else{const nextFit=fitDistance();camera.position.sub(controls.target).multiplyScalar(nextFit/previousFit).add(controls.target);}
   controls.maxDistance=Math.max(radius*20,camera.position.distanceTo(controls.target));controls.update();
   settingCamera=previousSetting;
  }
  camera.far=Math.max(camera.far,camera.position.distanceTo(controls.target)+radius*20);camera.updateProjectionMatrix();render();if(root)onResize(cameraPose());
 }
 function portraitComposition(){return root!==stateLayer.group&&asset?.modelCamera?.portraitPosition;}
 function defaultDirection(){
  const target=asset?.modelCamera?.target,position=camera.aspect<1&&portraitComposition()||asset?.modelCamera?.position;
  return root===stateLayer.group?new THREE.Vector3(0,1,-.2).transformDirection(root.matrixWorld):position&&target?new THREE.Vector3(position[0],position[1],position[2]).sub(new THREE.Vector3(target[0],target[1],target[2])).normalize():new THREE.Vector3(1.2,.65,1).normalize();
 }
 function fitDistance(){
  const vertical=THREE.MathUtils.degToRad(camera.fov),horizontal=2*Math.atan(Math.tan(vertical/2)*camera.aspect);
  const requested=asset?.modelCamera?.fitScale??1,scale=camera.aspect<1?Math.max(.9,requested):requested;
  if((portraitComposition()&&camera.aspect<1)&&!modelBounds.isEmpty()){
   const direction=pristineCamera?defaultDirection():camera.position.clone().sub(controls.target).normalize();
   const right=new THREE.Vector3().crossVectors(camera.up,direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right).normalize();
   let distance=0;
   // Fit projected SI corners rather than a sphere around the long vessel.
   // The camera's real orbit/up frame determines its visible width and height.
   for(const x of [modelBounds.min.x,modelBounds.max.x])for(const y of [modelBounds.min.y,modelBounds.max.y])for(const z of [modelBounds.min.z,modelBounds.max.z]){
    const p=new THREE.Vector3(x,y,z).sub(center),depth=p.dot(direction);
    distance=Math.max(distance,depth+Math.abs(p.dot(right))/Math.tan(horizontal/2),depth+Math.abs(p.dot(up))/Math.tan(vertical/2));
   }
   return Math.max(1,requested)*1.12*distance;
  }
  return scale*1.12*radius/Math.sin(Math.min(vertical,horizontal)/2);
 }
 function cameraUp(up:THREE.Vector3){
  if(camera.up.distanceToSquared(up)<1e-20)return;
  // OrbitControls caches the camera-up transform on construction.
  const target=controls.target.clone();controls.removeEventListener('change',cameraChanged);controls.dispose();camera.up.copy(up);
  controls=controlsFactory(camera,canvas);controls.enableDamping=false;controls.target.copy(target);controls.addEventListener('change',cameraChanged);
 }
 function reset(){
  if(!root||disposed)return;
  stopFlight();const previousSetting=settingCamera;settingCamera=true;pristineCamera=true;
  // The construction opens toward local +y. Transform its inspection direction
  // with the assembly, rather than aiming at the closed wall in world space.
  const direction=defaultDirection();
  // Local +x is transverse up; the axial source→target direction stays screen-right.
  cameraUp(modelUp());
  const distance=fitDistance();
  controls.target.copy(center);camera.position.copy(center).addScaledVector(direction,distance);
  camera.near=Math.max(radius/1e7,1e-9);camera.far=distance+radius*20;camera.updateProjectionMatrix();
  controls.minDistance=radius/100000;controls.maxDistance=Math.max(radius*20,distance);controls.update();render();
  settingCamera=previousSetting;if(!settingCamera)onCamera(cameraPose());
 }
 function focus(id:string,{animate=false}:{animate?:boolean}={}){
  if(!root||disposed)return;
  stopFlight();
  const bounds=new THREE.Box3();root.traverse(node=>{if(isMesh(node)&&!isViewContext(node)&&node.visible&&componentId(node)===id&&(id==='slice'||!node.userData.quantitativeOnly))bounds.expandByObject(node);});
  if(bounds.isEmpty())return;
  pristineCamera=false;
  const target=bounds.getCenter(new THREE.Vector3()),r=bounds.getBoundingSphere(new THREE.Sphere()).radius;
  const direction=camera.position.clone().sub(controls.target).normalize();
  const end=target.clone().addScaledVector(direction,Math.max(r*3,controls.minDistance));
  if(!animate||win.matchMedia?.('(prefers-reduced-motion: reduce)').matches){controls.target.copy(target);camera.position.copy(end);controls.update();render();return;}
  const startPosition=camera.position.clone(),startTarget=controls.target.clone();let started:number|undefined;
  function step(now:number){
   if(disposed)return;started??=now;const t=Math.min(1,(now-started)/350),ease=1-(1-t)**3;
   camera.position.lerpVectors(startPosition,end,ease);controls.target.lerpVectors(startTarget,target,ease);controls.update();render();if(animationFrame===null)flushRender();
   flight=t<1?win.requestAnimationFrame(step):null;
  }
  cancelRender();flight=win.requestAnimationFrame(step);
 }
 function clearSelection(){for(const [mesh,original,selected]of highlights){mesh.material=original;for(const material of selected)material.dispose();}highlights=[];}
 function select(id:string|null){
  if(id===null){const wasExploded=!!assembly;clearAssembly();if(wasExploded){fit();reset();}refreshReactor();}
  selectedComponent=id;
  clearSelection();root?.traverse(mesh=>{
   if(!isMesh(mesh)||isViewContext(mesh))return;const chosen=componentId(mesh)===id;if(!chosen&&!assemblyTarget)return;
   const original=mesh.material,selected=(Array.isArray(original)?original:[original]).map(material=>{
    const copy=material.clone() as THREE.Material & {color?:THREE.Color;emissive?:THREE.Color;emissiveIntensity?:number};
    if(chosen){copy.emissive?.setHex(0x986033);copy.emissiveIntensity=.7;if(assemblyTarget){copy.opacity=1;copy.transparent=false;copy.depthWrite=true;copy.clippingPlanes=[];}}
    else{copy.color?.multiplyScalar(.4);copy.emissiveIntensity=0;}
    return copy;
   });mesh.material=Array.isArray(original)?selected:selected[0];highlights.push([mesh,original,selected]);
  });render();
 }
 async function load(next:ViewerAsset,{preserveOwnership=false}:{preserveOwnership?:boolean}={}){
  if(disposed)return false;const previousOwnership=pristineCamera,token=++generation;asset=next;pristineCamera=true;scaleNote.hidden=true;
  cancelHover();
  setAnimation(null);cancelRender();
  reactorLayer?.dispose();reactorLayer=null;
  if(next.reactor){reactorLayer=createReactorMotionLayer(frame,refreshReactor);scene.add(reactorLayer.group);}
  stopFlight();clearAssembly();
  stateLayer.clear();clearSelection();if(referenceRoot)release(referenceRoot);root=referenceRoot=null;loadStatus='loading';reportRepresentation();renderer.clear();status.textContent='Loading 3D…';
  try{
   const gltf=await loader.loadAsync(next.model);
   if(disposed||token!==generation){release(gltf.scene);return false;}
   preparingGeneration=token;
   try{
    root=referenceRoot=gltf.scene;loadStatus='reference';fit();scene.add(root);describeScale();settingCamera=true;
    try{resize();reset();}finally{settingCamera=false;}
    if(accepted)updateSurfaceState(accepted.packet,accepted.settings);
    refreshReactor();
    if(renderer.compileAsync)do{
     preparationChanged=false;await renderer.compileAsync(scene,camera);
     if(disposed||token!==generation)return false;
    }while(preparationChanged);
   }finally{if(preparingGeneration===token)preparingGeneration=null;}
   status.textContent='';flushRender();setAnimation(animation);
   if(preserveOwnership)pristineCamera=pristineCamera&&previousOwnership;return true;
  }catch(error){
   if(disposed||token!==generation)return false;
   setAnimation(null);scaleNote.hidden=true;
   if(referenceRoot){clearSelection();release(referenceRoot);root=referenceRoot=null;}loadStatus='error';reportRepresentation();status.textContent='3D unavailable';onError(error);return false;
  }
 }
 const ray=new THREE.Raycaster(),point=new THREE.Vector2();
 function intersections(event:PointerEvent){
  if(!root)return [];const bounds=canvas.getBoundingClientRect();if(bounds.width<=0||bounds.height<=0)return [];
  point.set(2*(event.clientX-bounds.left)/bounds.width-1,1-2*(event.clientY-bounds.top)/bounds.height);
  camera.updateMatrixWorld();root.updateWorldMatrix(true,true);ray.setFromCamera(point,camera);
  ray.params.Points.threshold=2*(camera.position.distanceTo(controls.target)+radius)*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*4/bounds.height;
  const candidates:THREE.Object3D[]=[];
  function collect(node:THREE.Object3D){
   if(!node.visible||node.userData.nonPickable)return;
   if(!isLine(node)||componentId(node))candidates.push(node);
   for(const child of node.children)collect(child);
  }
  for(const tree of root===stateLayer.group?[root]:[root,stateLayer.group]){
   let allowed=true;for(let parent=tree.parent;parent;parent=parent.parent)if(!parent.visible||parent.userData.nonPickable){allowed=false;break;}
   if(allowed)collect(tree);
  }
  return ray.intersectObjects(candidates,false).filter(hit=>pickFilter(hit)&&screenSpacePointHit(hit,camera,point,bounds));
 }
 const handlers: { [K in keyof ViewerEvents]: (event:ViewerEvents[K])=>void }={
  webglcontextrestored:render,
  pointerdown:event=>{stopFlight();pointer=event.isPrimary!==false&&event.button===0?{id:event.pointerId,x:event.clientX,y:event.clientY}:null;},
  wheel:stopFlight,
  pointermove:event=>{
   if(dragging!==null&&event.pointerId!==dragging)return;
   if(dragging!==null){const hits=intersections(event);onHover(hits[0]??null);onDrag({phase:'move',ray:ray.ray,hits});render();return;}
   if(pointer?.id===event.pointerId&&Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)>5)pointer=null;
   hoverEvent=event;
   hoverFrame??=win.requestAnimationFrame(()=>{hoverFrame=null;const latest=hoverEvent;hoverEvent=null;if(latest&&!disposed&&active&&!doc.hidden)onHover(intersections(latest)[0]??null);});
  },
  pointercancel:event=>{cancelHover();if(dragging!==null&&event.pointerId===dragging)cancelDrag();pointer=null;},
  lostpointercapture:event=>{if(dragging!==null&&event.pointerId===dragging)cancelDrag();},
  pointerup:event=>{
   cancelHover();
   if(dragging!==null){if(event.pointerId!==dragging)return;dragging=null;controls.enabled=true;pointer=null;onDrag({phase:'end'});return;}
   const start=pointer;pointer=null;
   if(!root||!start||start.id!==event.pointerId||Math.hypot(event.clientX-start.x,event.clientY-start.y)>5)return;
   const hits=intersections(event);
   // Impact batches draw over hardware without depth testing; later vertices win overlaps.
   const impact=hits.filter(hit=>isPoints(hit.object)&&hit.object.userData.impactIndices&&(hit.object.material as THREE.PointsMaterial).depthTest===false)
    .sort((a,b)=>b.index!-a.index!)[0],hit=impact??hits[0];
   if(stateLayer.pick(hit))return;
   const id=hit&&componentId(hit.object);if(hit&&id){select(id);explode(id);onSelect(id,hit.object.userData,hit.object.name,hit);}
  },
  keydown:event=>{
   if(event.key==='Escape'&&assembly){event.preventDefault();explode(null);return;}
   if(event.key==='Escape'&&dragging!==null){event.preventDefault();cancelDrag();return;}
   if(!root||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(event.key))return;
   stopFlight();pristineCamera=false;
   event.preventDefault();const toUp=new THREE.Quaternion().setFromUnitVectors(camera.up,new THREE.Vector3(0,1,0));
   const spherical=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target).applyQuaternion(toUp));
   if(event.key==='ArrowLeft')spherical.theta-=.12;if(event.key==='ArrowRight')spherical.theta+=.12;
   if(event.key==='ArrowUp')spherical.phi-=.12;if(event.key==='ArrowDown')spherical.phi+=.12;
   if(['+','='].includes(event.key))spherical.radius=Math.max(controls.minDistance,spherical.radius*.85);
   if(event.key==='-')spherical.radius=Math.min(controls.maxDistance,spherical.radius/ .85);
   spherical.makeSafe();camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical).applyQuaternion(toUp.invert()));controls.update();render();
  },
 };
 // Capture handle drags before OrbitControls sees the same pointer event.
 function cancelDrag(){dragging=null;controls.enabled=true;pointer=null;onDrag({phase:'cancel'});render();}
 const dragStart=(event:PointerEvent)=>{if(event.button!==0||event.isPrimary===false||dragging!==null)return;cancelHover();const hits=intersections(event);if(onDrag({phase:'start',ray:ray.ray,hits})){dragging=event.pointerId;controls.enabled=false;canvas.setPointerCapture?.(event.pointerId);}};
 canvas.addEventListener('pointerdown',dragStart,true);
 for(const [name,handler]of Object.entries(handlers))canvas.addEventListener(name,handler as EventListener);
 controls.addEventListener('change',cameraChanged);
 const observer=new ResizeObserver(resize);observer.observe(frame);
 return {canvas,load,select,explode,focus,reset,resize,refresh:render,setAnimation,cameraPose,setCamera,updateSurfaceState,
  updateReactorState:value=>{reactorState=value;refreshReactor();},setActive:value=>{active=value;if(!active){cancelHover();cancelRender();}if(asset?.reactor)refreshReactor();else if(active)render();},
 setPending:value=>{reactorPending=value;if(value)updateSurfaceState({status:'pending',reason:'Current inputs are calculating. Quantitative surfaces are withheld.'});refreshReactor();},dispose(){
  if(disposed)return;disposed=true;cancelHover();stopFlight();clearAssembly();reducedAssemblyMotion?.removeEventListener?.('change',settleAssembly);setAnimation(null);cancelRender();reactorLayer?.dispose();doc.removeEventListener('visibilitychange',visibility);generation++;observer.disconnect();controls.removeEventListener('change',cameraChanged);controls.dispose();canvas.removeEventListener('pointerdown',dragStart,true);
  for(const [name,handler]of Object.entries(handlers))canvas.removeEventListener(name,handler as EventListener);
  clearSelection();stateLayer.dispose();if(referenceRoot)release(referenceRoot);root=referenceRoot=null;key.shadow.dispose();display.dispose();frame.replaceChildren();
 }};
}

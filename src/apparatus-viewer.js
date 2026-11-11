import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createSurfaceLayer} from './surface-layer.js';

export function componentId(object){
 for(let node=object;node;node=node.parent)if(typeof node.userData?.componentId==='string')return node.userData.componentId;
 return null;
}
/** PointsMaterial size is pixels; a metre-sized raycaster threshold is not a visual hit. */
export function screenSpacePointHit(hit,camera,point,bounds,pixels=4){
 if(!hit.object.isPoints)return true;
 const position=new THREE.Vector3().fromBufferAttribute(hit.object.geometry.getAttribute('position'),hit.index)
  .applyMatrix4(hit.object.matrixWorld).project(camera);
 return position.z>=-1&&position.z<=1&&Math.hypot((position.x-point.x)*bounds.width/2,(position.y-point.y)*bounds.height/2)<=pixels;
}

function displayFactory(canvas){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,logarithmicDepthBuffer:true});
 renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,2));
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.88;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;
 const studio=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(studio,.04);
 studio.dispose();pmrem.dispose();
 return {renderer,environment:environment.texture,dispose(){environment.dispose();renderer.dispose();}};
}

function release(root){
 const geometries=new Set(),materials=new Set(),textures=new Set();
 root.traverse(node=>{if(node.geometry)geometries.add(node.geometry);for(const material of node.material?Array.isArray(node.material)?node.material:[node.material]:[]){
  materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
 }});
 for(const value of [...textures,...materials,...geometries])value.dispose();
 root.removeFromParent();
}

/** Actual glTF/PBR display. Injected graphics adapters permit lifecycle tests without claiming GPU verification. */
export function createApparatusViewer(frame,{onSelect=()=>{},onError=()=>{},onRepresentation=()=>{},onCamera=()=>{},onResize=()=>{},onHover=()=>{},pickFilter=()=>true,onDrag=()=>false,displayFactory:makeDisplay=displayFactory,
 controlsFactory=(camera,canvas)=>new OrbitControls(camera,canvas),loader=new GLTFLoader()}={}){
 const doc=frame.ownerDocument,canvas=doc.createElement('canvas'),status=doc.createElement('p');
 canvas.tabIndex=0;canvas.setAttribute('aria-label','3D apparatus. Drag to rotate, scroll to zoom. Arrow keys rotate; plus and minus zoom.');
 status.setAttribute('role','status');status.className='apparatus-status';frame.replaceChildren(canvas,status);
 const display=makeDisplay(canvas),renderer=display.renderer,scene=new THREE.Scene();
 renderer.localClippingEnabled=true;
 scene.background=new THREE.Color('#121716');scene.environment=display.environment??null;scene.environmentIntensity=.8;
 scene.add(new THREE.HemisphereLight(0xdde6e5,0x17201e,.3));
 const key=new THREE.DirectionalLight(0xffebd5,2.2);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.bias=-.00015;scene.add(key,key.target);
 const fill=new THREE.DirectionalLight(0xb5cadb,.7);fill.position.set(-3,2,-4);scene.add(fill);
 const rim=new THREE.DirectionalLight(0xe1eef3,1.5);rim.position.set(-2,1,-3);scene.add(rim);
 const camera=new THREE.PerspectiveCamera(35,1,.001,1000);let controls=controlsFactory(camera,canvas);
 controls.enableDamping=false;
 let root=null,referenceRoot=null,generation=0,disposed=false,asset=null,pointer=null,highlights=[],accepted=null;
 let animation=null,animationFrame=null,lastFrame=null,flight=null,shadowRevision;
 const win=doc.defaultView;
 function cameraPose(){return {position:camera.position.toArray(),target:controls.target.toArray(),up:camera.up.toArray()};}
 let settingCamera=false,dragging=null,pristineCamera=true;
 function cameraChanged(){render();if(!settingCamera){pristineCamera=false;onCamera(cameraPose());}}
 function stopFlight(){if(flight!==null)win.cancelAnimationFrame(flight);flight=null;}
 function setCamera(pose,{preserveOwnership=false}={}){
  if(!pose||disposed)return;stopFlight();if(!preserveOwnership)pristineCamera=false;settingCamera=true;cameraUp(new THREE.Vector3(...(pose.up??camera.up.toArray())));
  camera.position.fromArray(pose.position);controls.target.fromArray(pose.target);
  camera.far=Math.max(camera.far,camera.position.distanceTo(controls.target)+radius*20);camera.updateProjectionMatrix();controls.update();render();settingCamera=false;
 }
 function setAnimation(callback){
  if(animationFrame!==null)win.cancelAnimationFrame(animationFrame);
  animationFrame=null;lastFrame=null;animation=disposed?null:callback;
  if(animation&&!doc.hidden)animationFrame=win.requestAnimationFrame(tick);
 }
 function tick(now){
  animationFrame=null;if(!animation||disposed||doc.hidden)return;
  const callback=animation,dt=lastFrame===null?0:(now-lastFrame)/1000;lastFrame=now;
  callback(dt);render();
  if(animation===callback)animationFrame=win.requestAnimationFrame(tick);
 }
 const visibility=()=>{if(doc.hidden)stopFlight();setAnimation(animation);};doc.addEventListener('visibilitychange',visibility);
 const center=new THREE.Vector3(),modelBounds=new THREE.Box3();let radius=1,representationKey='',loadStatus='reference';
 function reportRepresentation(){
  const acceptedRoot=root===stateLayer.group,representation={geometry:root?acceptedRoot?'accepted':'reference':'none',
   status:acceptedRoot?'ready':loadStatus,...(acceptedRoot?stateLayer.representation:{layer:'reference',numerical:false})};
  const key=JSON.stringify(representation);if(key!==representationKey){representationKey=key;onRepresentation(representation);}
 }
 function render(){if(!disposed&&root){
  if(root.userData.shadowRevision!==shadowRevision){shadowRevision=root.userData.shadowRevision;updateShadows();}
  renderer.render(scene,camera);reportRepresentation();
 }}
 const stateLayer=createSurfaceLayer(frame,{render,onSelect});scene.add(stateLayer.group);
 function fit(){
  root.updateWorldMatrix(true,true);const bounds=modelBounds.setFromObject(root);
  bounds.getCenter(center);radius=bounds.getBoundingSphere(new THREE.Sphere()).radius;
  if(!Number.isFinite(radius)||radius<=0)throw new Error('3D model has no finite geometry.');
  // Shadow framing follows SI scene bounds, including microscopic targets and
  // large blanket models. Numerical overlays must not cast hardware shadows.
  updateShadows();
  key.target.position.copy(center);key.position.copy(center).addScaledVector(new THREE.Vector3(2,4,3),radius);
  Object.assign(key.shadow.camera,{left:-radius*2,right:radius*2,top:radius*2,bottom:-radius*2,near:radius*.01,far:radius*12});key.shadow.normalBias=radius*.0008;key.shadow.camera.updateProjectionMatrix();
  if(renderer.shadowMap)renderer.shadowMap.needsUpdate=true;
 }
 function updateShadows(){
  root?.traverse(node=>{if(node.isMesh){node.castShadow=!node.userData.quantitativeOnly&&!node.material?.transparent&&node.userData.componentId!=='profile';node.receiveShadow=node.castShadow;}});
  if(renderer.shadowMap)renderer.shadowMap.needsUpdate=true;
 }
 function updateSurfaceState(packet,settings={}){
  if(disposed)return;accepted=packet?{packet,settings}:null;
  const previousRoot=root;
  clearSelection();const changed=stateLayer.update(packet,settings);
  if(!referenceRoot)return;
  referenceRoot.visible=packet?.status!=='ready'||stateLayer.group.children.length===0;loadStatus=packet?.status==='pending'?'pending':'reference';
  root=referenceRoot.visible?referenceRoot:stateLayer.group;
  if(changed||root!==previousRoot){fit();resize();reset();}else render();
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
  return root===stateLayer.group?new THREE.Vector3(0,1,-.2).transformDirection(root.matrixWorld):position&&target?new THREE.Vector3(...position).sub(new THREE.Vector3(...target)).normalize():new THREE.Vector3(1.2,.65,1).normalize();
 }
 function fitDistance(){
  const vertical=THREE.MathUtils.degToRad(camera.fov),horizontal=2*Math.atan(Math.tan(vertical/2)*camera.aspect);
  const requested=asset?.modelCamera?.fitScale??1,scale=camera.aspect<1?Math.max(.9,requested):requested;
  if(portraitComposition()&&camera.aspect<1&&!modelBounds.isEmpty()){
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
 function cameraUp(up){
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
  cameraUp(root===stateLayer.group?new THREE.Vector3(1,0,0).transformDirection(root.matrixWorld):new THREE.Vector3(...(asset.modelCamera?.up??[0,1,0])));
  const distance=fitDistance();
  controls.target.copy(center);camera.position.copy(center).addScaledVector(direction,distance);
  camera.near=Math.max(radius/1e7,1e-9);camera.far=distance+radius*20;camera.updateProjectionMatrix();
  controls.minDistance=radius/100000;controls.maxDistance=Math.max(radius*20,distance);controls.update();render();
  settingCamera=previousSetting;if(!settingCamera)onCamera(cameraPose());
 }
 function focus(id,{animate=false}={}){
  if(!root||disposed)return;
  stopFlight();
  const bounds=new THREE.Box3();root.traverse(node=>{if(node.isMesh&&node.visible&&componentId(node)===id&&(id==='slice'||!node.userData.quantitativeOnly))bounds.expandByObject(node);});
  if(bounds.isEmpty())return;
  pristineCamera=false;
  const target=bounds.getCenter(new THREE.Vector3()),r=bounds.getBoundingSphere(new THREE.Sphere()).radius;
  const direction=camera.position.clone().sub(controls.target).normalize();
  const end=target.clone().addScaledVector(direction,Math.max(r*3,controls.minDistance));
  if(!animate||win.matchMedia?.('(prefers-reduced-motion: reduce)').matches){controls.target.copy(target);camera.position.copy(end);controls.update();render();return;}
  const startPosition=camera.position.clone(),startTarget=controls.target.clone();let started;
  function step(now){
   if(disposed)return;started??=now;const t=Math.min(1,(now-started)/350),ease=1-(1-t)**3;
   camera.position.lerpVectors(startPosition,end,ease);controls.target.lerpVectors(startTarget,target,ease);controls.update();render();
   flight=t<1?win.requestAnimationFrame(step):null;
  }
  flight=win.requestAnimationFrame(step);
 }
 function clearSelection(){for(const [mesh,original,selected]of highlights){mesh.material=original;for(const material of selected)material.dispose();}highlights=[];}
 function select(id){
  clearSelection();root?.traverse(mesh=>{
   if(!mesh.isMesh||componentId(mesh)!==id)return;
   const original=mesh.material,selected=(Array.isArray(original)?original:[original]).map(material=>{
    const copy=material.clone();copy.emissive?.setHex(0x986033);copy.emissiveIntensity=.45;return copy;
   });mesh.material=Array.isArray(original)?selected:selected[0];highlights.push([mesh,original,selected]);
  });render();
 }
 async function load(next,{preserveOwnership=false}={}){
  if(disposed)return false;const previousOwnership=pristineCamera,token=++generation;asset=next;pristineCamera=true;
  setAnimation(null);
  stopFlight();
  stateLayer.clear();clearSelection();if(referenceRoot)release(referenceRoot);root=referenceRoot=null;loadStatus='loading';reportRepresentation();renderer.clear();status.textContent='Loading 3D…';
  try{
   const gltf=await loader.loadAsync(next.model);
   if(disposed||token!==generation){release(gltf.scene);return false;}
   root=referenceRoot=gltf.scene;loadStatus='reference';fit();scene.add(root);status.textContent='';settingCamera=true;resize();reset();settingCamera=false;
   if(accepted)updateSurfaceState(accepted.packet,accepted.settings);
   if(preserveOwnership)pristineCamera=previousOwnership;return true;
  }catch(error){
   if(disposed||token!==generation)return false;
   if(referenceRoot){clearSelection();release(referenceRoot);root=referenceRoot=null;}loadStatus='error';reportRepresentation();status.textContent='3D unavailable';onError(error);return false;
  }
 }
 const ray=new THREE.Raycaster(),point=new THREE.Vector2();
 function intersections(event){
  if(!root)return [];const bounds=canvas.getBoundingClientRect();if(bounds.width<=0||bounds.height<=0)return [];
  point.set(2*(event.clientX-bounds.left)/bounds.width-1,1-2*(event.clientY-bounds.top)/bounds.height);
  camera.updateMatrixWorld();root.updateWorldMatrix(true,true);ray.setFromCamera(point,camera);
  ray.params.Points.threshold=2*(camera.position.distanceTo(controls.target)+radius)*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*4/bounds.height;
  return ray.intersectObjects(root===stateLayer.group?[root]:[root,stateLayer.group],true).filter(hit=>{
   if(hit.object.isLine&&!componentId(hit.object))return false;
   for(let node=hit.object;node;node=node.parent)if(!node.visible||node.userData.nonPickable)return false;
   return pickFilter(hit)&&screenSpacePointHit(hit,camera,point,bounds);
  });
 }
 const handlers={
  webglcontextrestored:render,
  pointerdown:event=>{stopFlight();pointer=event.isPrimary!==false&&event.button===0?{id:event.pointerId,x:event.clientX,y:event.clientY}:null;},
  wheel:stopFlight,
  pointermove:event=>{
   if(dragging!==null&&event.pointerId!==dragging)return;
   const hits=intersections(event);onHover(hits[0]??null);
   if(dragging!==null){onDrag({phase:'move',ray:ray.ray,hits});render();return;}
   if(pointer?.id===event.pointerId&&Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)>5)pointer=null;
  },
  pointercancel:event=>{if(dragging!==null&&event.pointerId===dragging)cancelDrag();pointer=null;},
  lostpointercapture:event=>{if(dragging!==null&&event.pointerId===dragging)cancelDrag();},
  pointerup:event=>{
   if(dragging!==null){if(event.pointerId!==dragging)return;dragging=null;controls.enabled=true;pointer=null;onDrag({phase:'end'});return;}
   const start=pointer;pointer=null;
   if(!root||!start||start.id!==event.pointerId||Math.hypot(event.clientX-start.x,event.clientY-start.y)>5)return;
   const hits=intersections(event);
   // Impact batches draw over hardware without depth testing; later vertices win overlaps.
   const impact=hits.filter(hit=>hit.object.isPoints&&hit.object.userData.impactIndices&&hit.object.material.depthTest===false)
    .sort((a,b)=>b.index-a.index)[0],hit=impact??hits[0];
   if(stateLayer.pick(hit))return;
   const id=hit&&componentId(hit.object);if(id){select(id);onSelect(id,hit.object.userData,hit.object.name);}
  },
  keydown:event=>{
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
 const dragStart=event=>{if(event.button!==0||event.isPrimary===false||dragging!==null)return;const hits=intersections(event);if(onDrag({phase:'start',ray:ray.ray,hits})){dragging=event.pointerId;controls.enabled=false;canvas.setPointerCapture?.(event.pointerId);}};
 canvas.addEventListener('pointerdown',dragStart,true);
 for(const [name,handler]of Object.entries(handlers))canvas.addEventListener(name,handler);
 controls.addEventListener('change',cameraChanged);
 const observer=new ResizeObserver(resize);observer.observe(frame);
 return {canvas,load,select,focus,reset,resize,refresh:render,setAnimation,cameraPose,setCamera,updateSurfaceState,setPending:value=>{if(value)updateSurfaceState({status:'pending',reason:'Current inputs are calculating. Quantitative surfaces are withheld.'});},dispose(){
  if(disposed)return;disposed=true;stopFlight();setAnimation(null);doc.removeEventListener('visibilitychange',visibility);generation++;observer.disconnect();controls.removeEventListener('change',cameraChanged);controls.dispose();canvas.removeEventListener('pointerdown',dragStart,true);
  for(const [name,handler]of Object.entries(handlers))canvas.removeEventListener(name,handler);
  clearSelection();stateLayer.dispose();if(referenceRoot)release(referenceRoot);root=referenceRoot=null;key.shadow.dispose();display.dispose();frame.replaceChildren();
 }};
}

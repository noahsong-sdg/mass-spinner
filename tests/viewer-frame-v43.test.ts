import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createApparatusViewer,screenSpacePointHit} from '../src/apparatus-viewer.js';

const snapshot=()=>({model:'rotating',domain:{kind:'cylinder',radiusM:.2,lengthM:1},timeS:0,
 fields:[{id:'electric-radial',coordinate:'radius',positionsM:[0,.1,.2],values:[0,1,2],domain:[0,2],unit:'V/m',label:'E',scope:'Prescribed field'}],
 counts:[],scalars:[],unsupported:[],impacts:[],tracks:[]});
async function fixture(t:any,options:any={}){
 const dom=new JSDOM('<main></main>'),frame=dom.window.document.querySelector('main')!;
 let hidden=false,rafId=0;const frames=new Map<number,FrameRequestCallback>();
 Object.defineProperty(dom.window.document,'hidden',{get:()=>hidden});
 dom.window.requestAnimationFrame=fn=>{frames.set(++rafId,fn);return rafId;};dom.window.cancelAnimationFrame=id=>{frames.delete(id);};
 let size={width:1000,height:600};const bounds=()=>({...size,left:0,top:0,right:size.width,bottom:size.height,x:0,y:0,toJSON(){}});
 frame.getBoundingClientRect=bounds;const previous=(globalThis as any).ResizeObserver;
 (globalThis as any).ResizeObserver=class{observe(){}disconnect(){}};
 let scene:THREE.Scene,camera:THREE.PerspectiveCamera,controls:OrbitControls;const history:OrbitControls[]=[],selected:string[]=[],representations:any[]=[];
 const reference=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(1,.18,.18),new THREE.MeshStandardMaterial());
 body.userData.componentId='vessel';reference.add(body);
 const viewer=createApparatusViewer(frame,{...options,loader:{loadAsync:async()=>({scene:reference})},onSelect:(id:string)=>selected.push(id),onRepresentation:(v:any)=>representations.push(v),
  displayFactory:()=>({renderer:{render(s:THREE.Scene,c:THREE.PerspectiveCamera){scene=s;camera=c;s.updateMatrixWorld(true);c.updateMatrixWorld();},clear(){},setSize(){}},dispose(){}}),
  controlsFactory:(c:THREE.PerspectiveCamera,canvas:HTMLCanvasElement)=>{
   canvas.setPointerCapture=()=>{};canvas.releasePointerCapture=()=>{};
   camera=c;controls=new OrbitControls(c,canvas);history.push(controls);return controls;
  }});
 t.after(()=>{viewer.dispose();dom.window.close();(globalThis as any).ResizeObserver=previous;});
 viewer.canvas.getBoundingClientRect=bounds;
 await viewer.load({model:'reference.glb',modelCamera:{position:[-.2,.25,1],target:[0,0,0],up:[0,1,0]}});
 return {dom,frame,viewer,selected,representations,history,reference,frames,
  step(now:number){const callbacks=[...frames.values()];frames.clear();for(const fn of callbacks)fn(now);},visibility(value:boolean){hidden=value;dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'));},
  get scene(){return scene!;},get camera(){return camera!;},get controls(){return controls!;},
  resize(width:number,height:number){size={width,height};viewer.resize();},click(x:number,y:number){
   for(const type of ['pointerdown','pointerup']){
    const event=new dom.window.MouseEvent(type,{clientX:x,clientY:y,button:0});Object.defineProperty(event,'pointerId',{value:1});viewer.canvas.dispatchEvent(event);
   }
  },bounds};
}
test('animation clock freezes across visibility, pause, reload and disposal; no hidden elapsed-time jump',async t=>{
 const h=await fixture(t),elapsed:number[]=[];h.viewer.setAnimation((dt:number)=>elapsed.push(dt));
 assert.equal(h.frames.size,1);h.step(100);h.step(116);assert.deepEqual(elapsed,[0,.016]);
 h.visibility(true);assert.equal(h.frames.size,0);h.visibility(false);assert.equal(h.frames.size,1);
 h.step(5000);h.step(5016);assert.deepEqual(elapsed,[0,.016,0,.016]);
 h.viewer.setAnimation(null);assert.equal(h.frames.size,0);h.viewer.setAnimation(()=>{});assert.equal(h.frames.size,1);
 await h.viewer.load({model:'replacement.glb'});assert.equal(h.frames.size,0);
 h.viewer.setAnimation(()=>{});h.viewer.dispose();assert.equal(h.frames.size,0);
});

test('component framing eases to its SI target, respects reduced motion and yields to user input',async t=>{
 const h=await fixture(t),initial=h.viewer.cameraPose();h.viewer.focus('vessel',{animate:true});assert.equal(h.frames.size,1);
 assert.deepEqual(h.viewer.cameraPose(),initial);h.step(100);h.step(275);assert.notDeepEqual(h.viewer.cameraPose(),initial);h.step(450);assert.equal(h.frames.size,0);
 const focused=h.viewer.cameraPose();h.viewer.reset();h.viewer.focus('vessel',{animate:true});h.step(500);h.step(600);
 h.viewer.canvas.dispatchEvent(new h.dom.window.WheelEvent('wheel'));assert.equal(h.frames.size,0);
 Object.defineProperty(h.dom.window,'matchMedia',{value:()=>({matches:true}),configurable:true});h.viewer.reset();h.viewer.focus('vessel',{animate:true});assert.equal(h.frames.size,0);assert.deepEqual(h.viewer.cameraPose(),focused);
 Object.defineProperty(h.dom.window,'matchMedia',{value:()=>({matches:false}),configurable:true});h.viewer.reset();h.viewer.focus('vessel',{animate:true});h.visibility(true);assert.equal(h.frames.size,0);
});

test('bulk tracers cannot steal hardware inspection clicks',async t=>{
 const h=await fixture(t),overlay=new THREE.Group();overlay.userData.nonPickable=true;
 const p=h.camera.position.clone().normalize().multiplyScalar(.3),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p.toArray(),3));
 const points=new THREE.Points(geometry,new THREE.PointsMaterial({size:8}));points.userData.componentId='motion';overlay.add(points);h.reference.add(overlay);
 h.click(500,300);assert.equal(h.selected.at(-1),'vessel');
});
function projectedAxis(camera:THREE.Camera,a:THREE.Vector3,b:THREE.Vector3){return b.clone().project(camera).sub(a.clone().project(camera));}
test('captured component drag belongs to one pointer and Escape/cancel/lost capture never commit',async t=>{
 const events:string[]=[],h=await fixture(t,{onDrag:({phase}:any)=>{events.push(phase);return phase==='start';}});
 function pointer(type:string,id=1){const event=new h.dom.window.MouseEvent(type,{clientX:500,clientY:300,button:0});Object.defineProperty(event,'pointerId',{value:id});h.viewer.canvas.dispatchEvent(event);}
 pointer('pointerdown');assert.equal(h.controls.enabled,false);pointer('pointermove',2);pointer('pointerup',2);assert.deepEqual(events,['start']);
 pointer('pointermove');h.viewer.canvas.dispatchEvent(new h.dom.window.KeyboardEvent('keydown',{key:'Escape'}));assert.deepEqual(events,['start','move','cancel']);assert.equal(h.controls.enabled,true);
 for(const type of ['pointercancel','lostpointercapture']){pointer('pointerdown');pointer(type);assert.equal(events.at(-1),'cancel');assert.equal(h.controls.enabled,true);}
 pointer('pointerdown');pointer('pointerup');assert.equal(events.at(-1),'end');assert.equal(events.filter(p=>p==='end').length,1);
});
test('camera synchronization uses SI vectors without echoing updates and clipping filters actual picking',async t=>{
 const cameras:any[]=[],h=await fixture(t,{onCamera:(pose:any)=>cameras.push(pose),pickFilter:()=>false});
 const before=cameras.length,pose={position:[.5,1,.6],target:[.02,0,0]};h.viewer.setCamera(pose);
 assert.ok(new THREE.Vector3(...h.viewer.cameraPose().position).distanceTo(new THREE.Vector3(...pose.position))<1e-12);assert.deepEqual(h.viewer.cameraPose().target,pose.target);assert.equal(cameras.length,before);
 h.viewer.canvas.dispatchEvent(new h.dom.window.KeyboardEvent('keydown',{key:'ArrowRight'}));assert.ok(cameras.length>before);
 h.click(500,300);assert.deepEqual(h.selected,[]);
});
test('paired SI cameras resize independently without relaying programmatic fits or compounding zoom',async t=>{
 let a:any,b:any;const events:any[]=[];
 a=await fixture(t,{onCamera:(pose:any)=>{events.push('a');b?.viewer.setCamera(pose);}});
 b=await fixture(t,{onCamera:(pose:any)=>{events.push('b');a.viewer.setCamera(pose);}});
 assert.deepEqual(events,[],'loading a reference fit is not a user camera gesture');b.viewer.setCamera(a.viewer.cameraPose());
 const initial=a.viewer.cameraPose();for(const [width,height]of [[500,600],[250,800],[1000,600]]){
  a.resize(width,height);b.resize(width,height);assert.deepEqual(events,[]);
  assert.ok(a.camera.position.distanceTo(b.camera.position)<1e-12);
 }
 assert.ok(a.camera.position.distanceTo(new THREE.Vector3(...initial.position))<1e-12);
 a.viewer.canvas.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'ArrowRight'}));assert.equal(events.at(-1),'a');assert.ok(a.camera.position.distanceTo(b.camera.position)<1e-12);
});
function inside(root:THREE.Object3D,camera:THREE.Camera){
 const box=new THREE.Box3().setFromObject(root);
 for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
  const p=new THREE.Vector3(x,y,z).project(camera);assert.ok(Math.abs(p.x)<=1&&Math.abs(p.y)<=1,`projected bounds ${p.toArray()}`);
 }
}

test('real OrbitControls retain the horizontal reference/accepted frame and cutaway sightline',async t=>{
 const h=await fixture(t),axis=projectedAxis(h.camera,new THREE.Vector3(-.5,0,0),new THREE.Vector3(.5,0,0));
 assert.ok(axis.x>0&&Math.abs(axis.y)<axis.x*.2,'reference source→target points screen-right');
 h.viewer.updateSurfaceState({status:'ready',snapshot:snapshot()},{radius:.2,length:1});
 const group=h.scene.getObjectByName('SI engineering assembly')!;
 const start=new THREE.Vector3(0,0,0).applyMatrix4(group.matrixWorld),end=new THREE.Vector3(0,0,1).applyMatrix4(group.matrixWorld);
 const acceptedAxis=projectedAxis(h.camera,start,end);assert.ok(acceptedAxis.x>0&&Math.abs(acceptedAxis.y)<acceptedAxis.x*.01);
 assert.ok(h.camera.up.distanceTo(new THREE.Vector3(0,0,-1))<1e-12);
 assert.equal(h.history.length,2,'a new up frame constructs fresh OrbitControls rather than retaining its cached up quaternion');
 const localDirection=h.camera.position.clone().sub(h.controls.target).normalize().transformDirection(group.matrixWorld.clone().invert());
 assert.ok(localDirection.y>.9&&localDirection.z<0,'reset keeps the local +y cutaway sightline');
 const before=h.camera.position.clone();h.controls.update();assert.ok(h.camera.position.distanceTo(before)<1e-12,'real controls must not roll/reset the frame');
 const target=h.controls.target.clone();h.viewer.canvas.dispatchEvent(new h.dom.window.KeyboardEvent('keydown',{key:'ArrowRight'}));
 assert.ok(h.camera.position.distanceTo(before)>.01);assert.ok(h.controls.target.distanceTo(target)<1e-12);
 h.viewer.reset();assert.ok(h.camera.position.distanceTo(before)<1e-12);
 h.viewer.setPending(true);assert.equal(h.history.length,3);assert.deepEqual(h.camera.up.toArray(),[0,1,0]);
});

test('resize refits both representations while retaining relative user zoom, orbit and target',async t=>{
 const h=await fixture(t);
 for(const accepted of [false,true]){
  h.resize(1000,600);if(accepted)h.viewer.updateSurfaceState({status:'ready',snapshot:snapshot()},{radius:.2,length:1});h.viewer.reset();
  const root=accepted?h.scene.getObjectByName('SI engineering assembly')!:h.reference;
  for(const [width,height]of [[600,600],[250,800],[1000,600]]){h.resize(width,height);inside(root,h.camera);}
  // A focused and deliberately zoomed view preserves its chosen framing fraction.
  h.viewer.focus('vessel');const target=h.controls.target.clone();
  h.viewer.canvas.dispatchEvent(new h.dom.window.KeyboardEvent('keydown',{key:'ArrowRight'}));
  h.viewer.canvas.dispatchEvent(new h.dom.window.KeyboardEvent('keydown',{key:'+'}));
  const offset=h.camera.position.clone().sub(target),vertical=THREE.MathUtils.degToRad(h.camera.fov);
  const oldSin=Math.sin(vertical/2),newSin=Math.sin(Math.atan(Math.tan(vertical/2)*250/800));
  h.resize(250,800);assert.ok(h.controls.target.distanceTo(target)<1e-12);
  assert.ok(h.camera.position.clone().sub(target).distanceTo(offset.multiplyScalar(oldSin/newSin))<1e-10);
  if(accepted){const before=h.camera.position.clone();h.viewer.updateSurfaceState({status:'ready',snapshot:{...snapshot(),timeS:1}},{radius:.2,length:1});assert.ok(h.camera.position.distanceTo(before)<1e-12);}
 }
});

test('SI-framed hardware shadows exclude the numerical surfaces and preserve rendering on resize',async t=>{
 const h=await fixture(t);
 const key=h.scene.children.find((n:any)=>n.isDirectionalLight&&n.castShadow) as THREE.DirectionalLight;
 assert.ok(key);assert.equal((h.reference.children[0] as THREE.Mesh).castShadow,true);
 const before=key.shadow.camera.far;assert.ok(before>0);assert.ok(key.shadow.camera.near>0);
 h.viewer.updateSurfaceState({status:'ready',snapshot:snapshot()},{radius:.2,length:1});
 const assembly=h.scene.getObjectByName('SI engineering assembly')!;
 assembly.traverse((n:any)=>{if(n.isMesh&&n.userData.quantitativeOnly)assert.equal(n.castShadow,false);});
 assert.ok(key.shadow.camera.left<0&&key.shadow.camera.right>0);assert.ok(key.shadow.camera.far>key.shadow.camera.near);
 h.resize(320,740);assert.ok(Number.isFinite(h.camera.position.length()));
 let shadowReleased=false;const dispose=key.shadow.dispose.bind(key.shadow);key.shadow.dispose=()=>{shadowReleased=true;dispose();};
 h.viewer.dispose();assert.equal(shadowReleased,true,'viewer owns and releases the shadow render target');
});

test('the actual ray/pixel path selects displayed rear impacts before hardware with deterministic overlaps',async t=>{
 const h=await fixture(t),s=snapshot();s.fields=[];
 s.impacts=[
  {speciesIndex:0,destination:'wall',timeS:.01,kineticEV:10,positionM:[0,-.2,.5]},
  {speciesIndex:1,destination:'end',timeS:.02,kineticEV:20,positionM:[0,.2,.5]},
  {speciesIndex:2,destination:'source',timeS:.03,kineticEV:30,positionM:[.02,-.2,.5]},
 ] as any;
 h.viewer.updateSurfaceState({status:'ready',snapshot:s},{radius:.2,length:1});
 const view=h.frame.querySelector('select[aria-label="3D result layer"]') as HTMLSelectElement;view.value='impacts';view.dispatchEvent(new h.dom.window.Event('change'));
 h.camera.position.set(.5,2,0);h.controls.target.set(.5,0,0);h.controls.update();h.camera.updateMatrixWorld();h.scene.updateMatrixWorld(true);
 const assembly=h.scene.getObjectByName('SI engineering assembly')!,points=assembly.getObjectByProperty('isPoints',true) as THREE.Points;
 // Known opaque foreground hardware makes depth ordering unambiguous, independent of the cutaway opening.
 const blocker=new THREE.Mesh(new THREE.BoxGeometry(.12,.05,.12),new THREE.MeshStandardMaterial());
 blocker.position.set(0,.5,.5);blocker.userData.componentId='vessel';assembly.add(blocker);assembly.updateWorldMatrix(true,true);
 const ray=new THREE.Raycaster();ray.params.Points.threshold=.1;ray.setFromCamera(new THREE.Vector2(),h.camera);
 const hits=ray.intersectObject(assembly,true).filter(hit=>{for(let n:THREE.Object3D|null=hit.object;n;n=n.parent)if(!n.visible)return false;return screenSpacePointHit(hit,h.camera,new THREE.Vector2(),h.bounds());});
 assert.ok(hits[0].object.isMesh,'reproduces the old nearest-hardware selection despite a visible rear dot');
 assert.ok(hits.some(hit=>hit.object===points&&hit.index===0),'rear impact passes real ray + 4px filter');
 assert.ok(!hits.some(hit=>hit.object===points&&hit.index===2),'off-pixel impact is rejected despite broad ray threshold');
 assert.equal(points.renderOrder,1);assert.equal((points.material as THREE.PointsMaterial).depthTest,false);
 h.click(500,300);assert.match(h.frame.textContent!,/Species 2 · end · 0.02 s · 20 eV · 0, 0.2, 0.5 m/);
 assert.deepEqual(h.selected,[],'overlapping last-drawn event is inspected instead of hardware');
 // Keep only the rear event at the same pixel; hardware still must not intercept it.
 h.viewer.updateSurfaceState({status:'ready',snapshot:{...s,impacts:[s.impacts[0],s.impacts[2]]}},{radius:.2,length:1});
 h.click(500,300);assert.match(h.frame.textContent!,/Species 1 · wall · 0.01 s · 10 eV · 0, -0.2, 0.5 m/);
 h.click(510,300);assert.equal(h.selected.at(-1),'vessel','away from dots, ordinary hardware picking remains available');
 assert.equal(h.representations.at(-1).layer,'impacts');assert.equal(h.representations.at(-1).numerical,true);
 view.value='hardware';view.dispatchEvent(new h.dom.window.Event('change'));assert.equal(h.representations.at(-1).numerical,false);
});

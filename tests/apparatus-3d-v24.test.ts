import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createApparatusViewer,componentId} from '../src/apparatus-viewer.js';
import {setupApparatus} from '../src/apparatus-ui.js';
import {modelComponents} from '../src/tutorial-insights.ts';
import {fusionComponents} from '../src/component-catalog.ts';
import {blanketComponents} from '../src/blanket-reference.ts';

const manifest=JSON.parse(readFileSync(new URL('../web-assets/renders/manifest.json',import.meta.url),'utf8'));
test('every apparatus is a self-contained Blender GLB with actual finite PBR mesh geometry',async()=>{
 const paths=new Set<string>();
 for(const [mode,asset]of Object.entries<any>(manifest.assets)){
  assert.match(asset.model,/^\/models\/[a-z-]+\.glb$/);paths.add(asset.model);
  const bytes=readFileSync(new URL(`../web-assets${asset.model}`,import.meta.url));
  assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
  assert.equal(bytes.readUInt32LE(16),0x4e4f534a);
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  assert.equal(json.asset.version,'2.0');assert.match(json.asset.generator,/Blender/);
  assert.ok(json.meshes.length>0);assert.equal(json.cameras?.length??0,0);
  for(const buffer of json.buffers)assert.equal(buffer.uri,undefined,'GLB must not depend on external buffers');
  for(const image of json.images??[])assert.equal(image.uri,undefined,'GLB must not depend on external images');
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const ids=new Set<string>();let meshes=0;
  gltf.scene.traverse((node:any)=>{
   assert.equal(node.isLight??false,false);assert.doesNotMatch(node.name,/studio floor|studio surface/i);
   if(!node.isMesh)return;meshes++;const id=componentId(node);assert.ok(id,`${mode}: ${node.name} missing component metadata`);ids.add(id!);
   const position=node.geometry.getAttribute('position'),normal=node.geometry.getAttribute('normal');assert.ok(position.count>=3);assert.ok(normal);
   for(let i=0;i<position.array.length;i++)assert.ok(Number.isFinite(position.array[i]));
   for(let i=0;i<normal.count;i++)assert.ok(Math.abs(new THREE.Vector3().fromBufferAttribute(normal,i).length()-1)<.001,'unit surface normals');
   for(const material of Array.isArray(node.material)?node.material:[node.material]){
    assert.ok(material.isMeshStandardMaterial);assert.ok(material.metalness>=0&&material.metalness<=1);assert.ok(material.roughness>=0&&material.roughness<=1);
   }
  });
  assert.ok(meshes>0);assert.deepEqual([...ids].sort(),[...asset.modelMeshComponentIds].sort());
  assert.deepEqual([...new Set([...asset.modelMeshComponentIds,...asset.modelRegionComponentIds])].sort(),[...asset.componentIds].sort());
  const catalogue=mode==='beam-target'?fusionComponents:mode==='blanket'?blanketComponents:modelComponents(mode);
  for(const id of ids)assert.ok(catalogue.some(c=>c.id===id),`${mode}: uninspectable mesh component ${id}`);
  const box=new THREE.Box3().setFromObject(gltf.scene),min=box.min.toArray(),max=box.max.toArray();
  for(let axis=0;axis<3;axis++){
   assert.ok(Number.isFinite(min[axis])&&Number.isFinite(max[axis]));assert.ok(max[axis]>min[axis]);
   assert.ok(Math.abs(min[axis]-asset.modelBounds.min[axis])<1e-4,`${mode} bounds minimum`);
   assert.ok(Math.abs(max[axis]-asset.modelBounds.max[axis])<1e-4,`${mode} bounds maximum`);
  }
  const geometries=new Set<any>(),materials=new Set<any>();gltf.scene.traverse((node:any)=>{if(node.geometry)geometries.add(node.geometry);for(const material of node.material?Array.isArray(node.material)?node.material:[node.material]:[])materials.add(material);});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
 }
 assert.equal(paths.size,8);assert.equal(manifest.assets.doublewell.model,manifest.assets['doublewell-dynamics'].model);
});

// These adapters deliberately exercise CPU scene/camera/picking/lifecycle only.
// A renderer.render call below is not browser or GPU verification.
class Element {
 ownerDocument:any;children:any[]=[];listeners=new Map<string,Function[]>();attributes=new Map();
 textContent='';className='';tabIndex=-1;hidden=false;value='';
 constructor(doc:any){this.ownerDocument=doc;}
 setAttribute(k:string,v:string){this.attributes.set(k,v);}
 replaceChildren(...values:any[]){this.children=values;}
 append(...values:any[]){this.children.push(...values);}
 addEventListener(k:string,fn:Function){this.listeners.set(k,[...(this.listeners.get(k)??[]),fn]);}
 removeEventListener(k:string,fn:Function){this.listeners.set(k,(this.listeners.get(k)??[]).filter(f=>f!==fn));}
 getBoundingClientRect(){return {left:0,top:0,width:800,height:600};}
 dispatch(name:string,event:any={}){for(const fn of this.listeners.get(name)??[])fn(event);}
}
function model(id:string){
 const root=new THREE.Group(),group=new THREE.Group(),geometry=new THREE.BoxGeometry(1,1,1);
 const material=new THREE.MeshStandardMaterial({color:0x445566,metalness:.6,roughness:.3});
 const texture=new THREE.Texture();material.map=texture;group.userData.componentId=id;
 const mesh=new THREE.Mesh(geometry,material);group.add(mesh);root.add(group);
 const disposal={geometry:0,material:0,texture:0};
 geometry.addEventListener('dispose',()=>disposal.geometry++);
 material.addEventListener('dispose',()=>disposal.material++);
 texture.addEventListener('dispose',()=>disposal.texture++);
 return {scene:root,mesh,material,disposal};
}
function deferred(){let resolve!:(value:any)=>void,reject!:(error:any)=>void;const promise=new Promise<any>((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
async function settle(){for(let i=0;i<6;i++)await Promise.resolve();}
function wrapper(t:any,viewerModuleLoader:any){
 const doc:any={createElement:()=>new Element(doc)},host=new Element(doc),old=(globalThis as any).IntersectionObserver;
 let observe!:(value:any)=>void,disconnected=0;
 (globalThis as any).IntersectionObserver=class {constructor(fn:any){observe=fn;}observe(){}disconnect(){disconnected++;}};
 t.after(()=>{(globalThis as any).IntersectionObserver=old;});
 const ui=setupApparatus(host,{viewerModuleLoader});t.after(()=>ui.dispose());
 const figure=host.children[0],frame=figure.children[0],toolbar=figure.children[1];
 return {ui,host,frame,choices:toolbar.children[0],retry:toolbar.children[1],readout:figure.children[2],visible:(isIntersecting:boolean)=>observe([{isIntersecting}]),get disconnected(){return disconnected;}};
}

test('apparatus wrapper allocates no hidden 3D viewer after a deferred module import',async t=>{
 const module=deferred();let created=0;const loads:any[]=[];
 const w=wrapper(t,()=>module.promise);w.ui.show('gyro');w.visible(true);w.visible(false);
 module.resolve({createApparatusViewer:()=>{created++;return {load:async(asset:any)=>{loads.push(asset.model);return true;},select(){},dispose(){}};}});
 await settle();assert.equal(created,0);w.visible(true);await settle();
 assert.equal(created,1);assert.deepEqual(loads,['/models/gyro.glb']);
});

test('apparatus wrapper honors current mode across initial import and initial model loading',async t=>{
 const module=deferred(),initial=deferred(),loads:string[]=[];
 const w=wrapper(t,()=>module.promise);w.ui.show('gyro');w.visible(true);w.ui.show('curved');
 module.resolve({createApparatusViewer:()=>({load:(asset:any)=>{loads.push(asset.model);return loads.length===1?initial.promise:Promise.resolve(true);},select(){},dispose(){}})});
 await settle();assert.deepEqual(loads,['/models/curved.glb']);w.ui.show('rotating');initial.resolve(true);await settle();
 assert.deepEqual(loads,['/models/curved.glb','/models/rotating.glb']);
});

test('apparatus wrapper exposes actual asset-error retry and keyboard component descriptions',async t=>{
 let attempts=0;const selected:string[]=[];
 const w=wrapper(t,async()=>({createApparatusViewer:(_:any,options:any)=>({load:async()=>{attempts++;if(attempts===1){options.onError(new Error('network'));return false;}return true;},select:(id:string)=>selected.push(id),dispose(){}})}));
 w.ui.show('rotating');w.visible(true);await settle();assert.equal(w.retry.hidden,false);
 w.retry.dispatch('click');await settle();assert.equal(attempts,2);assert.equal(w.retry.hidden,true);
 w.choices.value='coils';w.choices.dispatch('change');assert.equal(selected.at(-1),'coils');
 assert.equal(w.readout.children[0].textContent,'Magnetic-field system');
 assert.equal(w.readout.children[2].children[0].textContent,'Materials & model');
 assert.match(w.readout.children[2].children[1].textContent,/material|copper|steel/i);
});

test('apparatus wrapper cancels deferred construction after disposal',async t=>{
 const module=deferred();let created=0;const w=wrapper(t,()=>module.promise);w.ui.show('gyro');w.visible(true);w.ui.dispose();
 module.resolve({createApparatusViewer:()=>{created++;}});await settle();assert.equal(created,0);assert.equal(w.host.children.length,0);assert.equal(w.disconnected,1);
});
function harness(t:any,loader:any){
 const doc:any={createElement:()=>new Element(doc),addEventListener(){},removeEventListener(){}},frame=new Element(doc),old=(globalThis as any).ResizeObserver;
 let disconnected=0; (globalThis as any).ResizeObserver=class {observe(){}disconnect(){disconnected++;}};
 t.after(()=>{(globalThis as any).ResizeObserver=old;});
 let camera:any,scene:any,rendered=0,displayDisposed=0,controlsDisposed=0;const sizes:any[]=[],selected:string[]=[],errors:any[]=[];
 const controls:any={target:new THREE.Vector3(),update(){camera.lookAt(this.target);},addEventListener(){},removeEventListener(){},dispose(){controlsDisposed++;}};
 const viewer=createApparatusViewer(frame,{loader,onSelect:(id:string)=>selected.push(id),onError:(e:any)=>errors.push(e),
  displayFactory:()=>({renderer:{render(s:any){scene=s;rendered++;},clear(){},setSize(...args:any[]){sizes.push(args);}},dispose(){displayDisposed++;}}),
  controlsFactory:(c:any)=>{camera=c;return controls;}});
 t.after(()=>viewer.dispose());
 const key=(key:string)=>{let prevented=false;(viewer.canvas as any).dispatch('keydown',{key,preventDefault(){prevented=true;}});return prevented;};
 const click=(drag=0)=>{const canvas:any=viewer.canvas;canvas.dispatch('pointerdown',{pointerId:1,button:0,clientX:400,clientY:300});
  if(drag)canvas.dispatch('pointermove',{pointerId:1,clientX:400+drag,clientY:300});
  canvas.dispatch('pointerup',{pointerId:1,clientX:400+drag,clientY:300});};
 return {viewer,frame,controls,key,click,selected,errors,sizes,get camera(){return camera;},get scene(){return scene;},
  get rendered(){return rendered;},get displayDisposed(){return displayDisposed;},get controlsDisposed(){return controlsDisposed;},get disconnected(){return disconnected;}};
}

test('3D viewer retains only the latest asynchronous model and releases stale results',async t=>{
 const a=deferred(),b=deferred(),first=model('first'),second=model('second');
 const h=harness(t,{loadAsync:(url:string)=>url==='a.glb'?a.promise:b.promise});
 const pendingA=h.viewer.load({model:'a.glb'}),pendingB=h.viewer.load({model:'b.glb'});
 b.resolve(second);assert.equal(await pendingB,true);a.resolve(first);assert.equal(await pendingA,false);
 assert.equal(h.scene.children.includes(second.scene),true);assert.equal(h.scene.children.includes(first.scene),false);
 assert.deepEqual(first.disposal,{geometry:1,material:1,texture:1});assert.deepEqual(second.disposal,{geometry:0,material:0,texture:0});
 h.viewer.dispose();h.viewer.dispose();
 assert.deepEqual(second.disposal,{geometry:1,material:1,texture:1});assert.equal(h.displayDisposed,1);assert.equal(h.controlsDisposed,1);assert.equal(h.disconnected,1);
});

test('3D viewer suppresses obsolete errors, reports current failure, and permits retry',async t=>{
 const old=deferred(),current=deferred(),asset=model('retry');let calls=0;
 const h=harness(t,{loadAsync:()=>++calls===1?old.promise:calls===2?current.promise:Promise.resolve(asset)});
 const a=h.viewer.load({model:'old.glb'}),b=h.viewer.load({model:'current.glb'});
 old.reject(new Error('obsolete'));assert.equal(await a,false);assert.equal(h.errors.length,0);
 current.reject(new Error('current'));assert.equal(await b,false);assert.equal(h.errors.length,1);
 assert.equal(h.frame.children[1].textContent,'3D unavailable');
 assert.equal(await h.viewer.load({model:'retry.glb'}),true);assert.equal(h.frame.children[1].textContent,'');
 assert.equal(h.frame.children.some((element:any)=>element.tagName==='IMG'),false);
});

test('3D viewer disposes results arriving after unmount',async t=>{
 const pending=deferred(),late=model('late'),h=harness(t,{loadAsync:()=>pending.promise});
 const loading=h.viewer.load({model:'late.glb'});h.viewer.dispose();pending.resolve(late);
 assert.equal(await loading,false);assert.deepEqual(late.disposal,{geometry:1,material:1,texture:1});
 assert.equal(await h.viewer.load({model:'disposed.glb'}),false);
});

test('3D viewer rejects empty geometry as an actual asset failure',async t=>{
 const h=harness(t,{loadAsync:async()=>({scene:new THREE.Group()})});
 assert.equal(await h.viewer.load({model:'empty.glb'}),false);assert.equal(h.errors.length,1);
});

test('3D viewer uses ancestor component IDs, restores PBR materials, and raycasts actual geometry',async t=>{
 const asset=model('target'),h=harness(t,{loadAsync:async()=>asset});await h.viewer.load({model:'target.glb'});
 assert.equal(componentId(asset.mesh),'target');assert.equal(componentId(new THREE.Object3D()),null);
 h.viewer.select('target');const highlighted=asset.mesh.material;assert.notEqual(highlighted,asset.material);
 assert.equal((highlighted as THREE.MeshStandardMaterial).map,asset.material.map);
 let highlightDisposed=0;(highlighted as any).addEventListener('dispose',()=>highlightDisposed++);
 h.viewer.select('missing');assert.equal(asset.mesh.material,asset.material);assert.equal(highlightDisposed,1);
 assert.equal(asset.disposal.material,0);assert.equal(asset.disposal.texture,0);
 h.click(6);assert.deepEqual(h.selected,[]);h.click();assert.deepEqual(h.selected,['target']);
 asset.scene.visible=false;h.click();assert.deepEqual(h.selected,['target']);
});

test('3D camera controls rotate, zoom within bounds, reset and resize without animation loops',async t=>{
 const asset=model('body'),h=harness(t,{loadAsync:async()=>asset});await h.viewer.load({model:'body.glb'});
 const initial=h.camera.position.clone(),distance=()=>h.camera.position.distanceTo(h.controls.target);
 assert.equal(h.camera.aspect,800/600);assert.deepEqual(h.sizes.at(-1),[800,600,false]);assert.ok(h.camera.near>0);
 assert.equal(h.key('ArrowLeft'),true);assert.ok(h.camera.position.distanceTo(initial)>.01);h.viewer.reset();assert.ok(h.camera.position.distanceTo(initial)<1e-10);
 const before=distance();h.key('+');assert.ok(distance()<before);h.key('-');assert.ok(Math.abs(distance()-before)<1e-10);
 for(let i=0;i<100;i++)h.key('+');assert.ok(distance()>=h.controls.minDistance-1e-10);
 for(let i=0;i<100;i++)h.key('-');assert.ok(distance()<=h.controls.maxDistance+1e-10);
 assert.equal(h.key('a'),false);const beforeRestore=h.rendered;(h.viewer.canvas as any).dispatch('webglcontextrestored');assert.equal(h.rendered,beforeRestore+1);
 const renders=h.rendered;h.viewer.dispose();h.key('ArrowRight');(h.viewer.canvas as any).dispatch('webglcontextrestored');assert.equal(h.rendered,renders);
 assert.equal(h.frame.children.length,0);
});

test('apparatus-specific presentation fit scales the default and reset while preserving user zoom on mobile resize',async t=>{
 const h=harness(t,{loadAsync:async()=>model('body')});await h.viewer.load({model:'body.glb'});
 const distance=()=>h.camera.position.distanceTo(h.controls.target),original=distance();
 await h.viewer.load({model:'body.glb',modelCamera:{fitScale:.78}});assert.ok(Math.abs(distance()/original-.78)<1e-12);
 const fitted=distance();h.key('+');const relative=distance()/fitted;
 h.frame.getBoundingClientRect=()=>({left:0,top:0,width:390,height:740});h.viewer.resize();
 const resized=distance();h.viewer.reset();assert.ok(Math.abs(resized/distance()-relative)<1e-12);
 const vertical=THREE.MathUtils.degToRad(h.camera.fov),horizontal=2*Math.atan(Math.tan(vertical/2)*390/740);
 const expected=.9*1.12*Math.sqrt(3)/2/Math.sin(Math.min(vertical,horizontal)/2);
 assert.ok(Math.abs(distance()/expected-1)<1e-12,'narrow framing must retain margin for external plumbing');
});

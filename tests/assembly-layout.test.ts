import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import * as THREE from 'three';
import {createAssemblyLayout} from '../src/assembly-layout.js';
import {createApparatusViewer} from '../src/apparatus-viewer.js';

function assembly(){
 const root=new THREE.Group(),module=new THREE.Group();root.rotation.y=.7;root.position.set(-.4,.2,.1);
 module.scale.set(2,.7,1.3);module.rotation.z=.3;root.add(module);
 const material=new THREE.MeshStandardMaterial({color:0x7e8b8e});
 function part(id:string,z:number,parent:THREE.Object3D=root){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(.2,.2,.1),material);mesh.userData.componentId=id;mesh.position.z=z;parent.add(mesh);return mesh;
 }
 const vessel=part('vessel',0),coils=part('coils',.6,module),electrodes=part('electrodes',1);
 const gas=part('slice',.5);gas.userData.quantitativeOnly=true;gas.layers.mask=3;
 const motion=new THREE.Group();motion.userData.nonPickable=true;root.add(motion);
 const tracer=part('coils',.5,motion);
 return {root,vessel,coils,electrodes,gas,tracer};
}

test('exploded layout moves owned hardware in nested SI frames and restores every position and layer',()=>{
 const a=assembly(),meshes=[a.vessel,a.coils,a.electrodes,a.gas,a.tracer];
 const positions=meshes.map(m=>m.position.clone()),vertices=meshes.map(m=>Array.from(m.geometry.getAttribute('position').array));
 const layout=createAssemblyLayout(a.root);assert.equal(layout.has('coils'),true);assert.equal(layout.has('slice'),false);
 layout.apply(.5);assert.ok(a.coils.position.distanceTo(positions[1])>0);assert.equal(a.gas.layers.mask,0);
 assert.deepEqual(a.gas.position,positions[3]);assert.deepEqual(a.tracer.position,positions[4]);
 layout.apply(1);const end=a.coils.position.clone();layout.apply(1);assert.deepEqual(a.coils.position,end,'no incremental drift');
 for(const mesh of [a.vessel,a.coils,a.electrodes]){
  const bounds=new THREE.Box3().setFromObject(mesh);
  assert.ok(layout.bounds.clone().expandByScalar(1e-9).containsBox(bounds),'camera bounds include every separated part');
 }
 layout.apply(0);meshes.forEach((m,i)=>{assert.deepEqual(m.position,positions[i]);assert.deepEqual(Array.from(m.geometry.getAttribute('position').array),vertices[i]);});
 assert.equal(a.gas.layers.mask,3);assert.equal(a.tracer.layers.mask,1);
});

function fixture(t:any,reduced=false){
 const dom=new JSDOM('<main></main>',{pretendToBeVisual:true}),doc=dom.window.document,frame=doc.querySelector('main')!;
 frame.getBoundingClientRect=()=>({x:0,y:0,left:0,top:0,right:800,bottom:600,width:800,height:600,toJSON(){return {};}});
 let serial=0;const frames=new Map<number,FrameRequestCallback>();
 dom.window.requestAnimationFrame=fn=>{frames.set(++serial,fn);return serial;};dom.window.cancelAnimationFrame=id=>{frames.delete(id);};
 Object.defineProperty(dom.window,'matchMedia',{value:()=>({matches:reduced,addEventListener(){},removeEventListener(){}})});
 const old=Object.getOwnPropertyDescriptor(globalThis,'ResizeObserver');
 Object.defineProperty(globalThis,'ResizeObserver',{configurable:true,value:class{observe(){}disconnect(){}}});
 let camera:THREE.PerspectiveCamera;
 const a=assembly(),viewer=createApparatusViewer(frame,{loader:{loadAsync:async()=>({scene:a.root})},
  displayFactory:()=>({renderer:{render(){},clear(){},setSize(){},shadowMap:{needsUpdate:false}},dispose(){}}),
  controlsFactory:value=>{camera=value;return {target:new THREE.Vector3(),minDistance:0,maxDistance:100,update(){camera.lookAt(this.target);},addEventListener(){},removeEventListener(){},dispose(){}};}});
 t.after(()=>{viewer.dispose();dom.window.close();if(old)Object.defineProperty(globalThis,'ResizeObserver',old);else Reflect.deleteProperty(globalThis,'ResizeObserver');});
 function step(time:number){const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(time));}
 return {...a,viewer,frame,doc,step,frames};
}

test('selection animates separation, switches parts without drift, and assembles through the visible button',async t=>{
 const f=fixture(t),position=f.coils.position.clone();await f.viewer.load({model:'assembly'});
 let physicsTicks=0;f.viewer.setAnimation(()=>physicsTicks++);
 f.viewer.explode('coils');assert.equal(f.viewer.canvas.getAttribute('data-assembly-state'),'separating');
 assert.deepEqual(f.coils.position,position);f.step(0);f.step(200);
 const halfway=f.coils.position.clone();assert.ok(halfway.distanceTo(position)>0);f.step(450);
 assert.equal(f.viewer.canvas.getAttribute('data-assembly-state'),'exploded');assert.ok(physicsTicks>=3);
 assert.ok(f.coils.position.distanceTo(halfway)>0);assert.equal(f.gas.layers.mask,0);
 assert.ok((f.coils.material as THREE.MeshStandardMaterial).emissiveIntensity>.5);
 const end=f.coils.position.clone();f.viewer.explode('electrodes');assert.deepEqual(f.coils.position,end);
 assert.equal(f.viewer.canvas.getAttribute('data-assembly-component'),'electrodes');
 f.frame.querySelector<HTMLButtonElement>('.assembly-view button')!.click();f.step(500);f.step(820);
 assert.equal(f.viewer.canvas.getAttribute('data-assembly-state'),'assembled');assert.deepEqual(f.coils.position,position);
 assert.equal(f.gas.layers.mask,3);assert.equal(f.frame.querySelector<HTMLElement>('.assembly-view')!.hidden,true);
});

test('reduced motion separates and restores hardware without animation callbacks',async t=>{
 const f=fixture(t,true),position=f.coils.position.clone();await f.viewer.load({model:'assembly'});
 f.viewer.explode('coils');assert.equal(f.viewer.canvas.getAttribute('data-assembly-state'),'exploded');assert.equal(f.frames.size,0);
 f.viewer.select('slice');f.viewer.explode('slice');assert.deepEqual(f.coils.position,position);assert.equal(f.gas.layers.mask,3);
 assert.equal(f.viewer.canvas.getAttribute('data-assembly-state'),'assembled','a numerical view restores assembled hardware');
});

test('interrupted transitions, reload and disposal restore hardware without late callbacks',async t=>{
 const g=fixture(t);await g.viewer.load({model:'assembly'});const initial=g.coils.position.clone();
 g.viewer.explode('coils');g.step(0);g.step(100);g.viewer.explode(null);g.step(120);g.step(440);
 assert.deepEqual(g.coils.position,initial);assert.equal(g.frames.size,0);
 g.viewer.explode('coils');g.step(500);g.viewer.select(null);assert.equal(g.frames.size,0);assert.deepEqual(g.coils.position,initial);
 g.viewer.explode('coils');await g.viewer.load({model:'assembly'});assert.equal(g.frames.size,0);assert.deepEqual(g.coils.position,initial);
 g.viewer.explode('coils');g.viewer.dispose();assert.equal(g.frames.size,0);g.step(1000);assert.deepEqual(g.coils.position,initial);
});

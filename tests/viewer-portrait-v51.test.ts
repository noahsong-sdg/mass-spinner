import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createApparatusViewer} from '../src/apparatus-viewer.js';

const desktop=[0,1,.65],portrait=[1,.65,.45];
const closeVector=(a:THREE.Vector3,b:THREE.Vector3)=>assert.ok(a.distanceTo(b)<1e-10,`${a.toArray()} ≠ ${b.toArray()}`);
async function fixture(t:any,{width=1000,height=600,optIn=true}={}){
 const dom=new JSDOM('<main></main>'),frame=dom.window.document.querySelector('main')!;
 let size={width,height};const rectangle=()=>({...size,left:0,top:0,right:size.width,bottom:size.height,x:0,y:0,toJSON(){}});
 frame.getBoundingClientRect=rectangle;
 const old=(globalThis as any).ResizeObserver;(globalThis as any).ResizeObserver=class{observe(){}disconnect(){}};
 let camera:THREE.PerspectiveCamera,controls:OrbitControls;const events:any[]=[];
 const root=new THREE.Group();root.add(new THREE.Mesh(new THREE.BoxGeometry(4,.4,.4),new THREE.MeshStandardMaterial()));
 const viewer=createApparatusViewer(frame,{
  loader:{loadAsync:async()=>({scene:root})},onCamera:(pose:any)=>events.push(pose),
  displayFactory:()=>({renderer:{render(s:THREE.Scene,c:THREE.PerspectiveCamera){camera=c;s.updateMatrixWorld(true);c.updateMatrixWorld();},clear(){},setSize(){}},dispose(){}}),
  controlsFactory:(c:THREE.PerspectiveCamera,canvas:HTMLCanvasElement)=>{camera=c;controls=new OrbitControls(c,canvas);return controls;}
 });
 t.after(()=>{viewer.dispose();dom.window.close();(globalThis as any).ResizeObserver=old;});
 await viewer.load({model:'centrifuge',modelCamera:{position:desktop,target:[0,0,0],up:[0,1,0],...(optIn?{portraitPosition:portrait}:{})}});
 return {viewer,root,events,dom,get camera(){return camera!;},get controls(){return controls!;},resize(width:number,height:number){size={width,height};viewer.resize();}};
}
const direction=(h:any)=>h.camera.position.clone().sub(h.controls.target).normalize();
function inside(h:any){
 const b=new THREE.Box3().setFromObject(h.root);
 for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){
  const p=new THREE.Vector3(x,y,z).project(h.camera);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z>=-1&&p.z<=1,`outside portrait frame ${p.toArray()}`);
 }
}

test('opt-in portrait composition fits projected SI corners and fills more of the narrow viewport',async t=>{
 const h=await fixture(t,{width:320,height:740});
 closeVector(direction(h),new THREE.Vector3(...portrait).normalize());inside(h);
 const radius=new THREE.Box3().setFromObject(h.root).getBoundingSphere(new THREE.Sphere()).radius;
 const horizontal=2*Math.atan(Math.tan(THREE.MathUtils.degToRad(h.camera.fov)/2)*320/740);
 const sphereDistance=1.12*radius/Math.sin(horizontal/2);
 assert.ok(h.camera.position.distanceTo(h.controls.target)<sphereDistance*.85,'projected fit removes excess end-on sphere padding');
 assert.deepEqual(h.events,[],'initial composition does not relay a user orbit');
});

test('pristine desktop/portrait crossings choose their composition without camera synchronization echoes',async t=>{
 const h=await fixture(t),start=h.camera.position.clone();closeVector(direction(h),new THREE.Vector3(...desktop).normalize());
 h.resize(320,740);closeVector(direction(h),new THREE.Vector3(...portrait).normalize());inside(h);
 h.resize(1000,600);closeVector(direction(h),new THREE.Vector3(...desktop).normalize());closeVector(h.camera.position,start);
 assert.deepEqual(h.events,[]);
});

test('explicit user framing retains orbit, focused target and relative zoom through portrait round trips',async t=>{
 const h=await fixture(t),pose={position:[.7,2,1.3],target:[.2,.03,.01],up:[0,1,0]};h.viewer.setCamera(pose);
 const before=h.camera.position.clone(),target=h.controls.target.clone(),orbit=direction(h);
 h.resize(320,740);closeVector(direction(h),orbit);closeVector(h.controls.target,target);
 h.resize(1000,600);closeVector(h.camera.position,before);closeVector(h.controls.target,target);assert.deepEqual(h.events,[]);
 h.viewer.reset();h.viewer.canvas.dispatchEvent(new h.dom.window.KeyboardEvent('keydown',{key:'ArrowRight'}));const changed=direction(h);
 h.resize(320,740);closeVector(direction(h),changed);
});

test('focusing a component suppresses automatic portrait reorientation while a missing component does not',async t=>{
 const h=await fixture(t);h.viewer.focus('missing');h.resize(320,740);closeVector(direction(h),new THREE.Vector3(...portrait).normalize());
 h.viewer.reset();h.root.children[0].userData.componentId='vessel';h.viewer.focus('vessel');const orbit=direction(h),target=h.controls.target.clone();
 h.resize(1000,600);closeVector(direction(h),orbit);closeVector(h.controls.target,target);
});

test('non-opt-in assets retain the existing portrait direction and sphere fit',async t=>{
 const legacy=await fixture(t,{optIn:false});legacy.resize(320,740);closeVector(direction(legacy),new THREE.Vector3(...desktop).normalize());inside(legacy);
});

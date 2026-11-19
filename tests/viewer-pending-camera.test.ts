import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createApparatusViewer,type ViewerRepresentation} from '../src/apparatus-viewer.js';
import type {SurfaceSnapshot} from '../src/surface-state.js';

function snapshot(radiusM=.2,lengthM=1):SurfaceSnapshot {
 return {model:'rotating',timeS:0,domain:{kind:'cylinder',radiusM,lengthM},
  fields:[{id:'electric-radial',coordinate:'radius',measure:'point',region:'plasma',positionsM:[0,radiusM/2,radiusM],
   values:[0,1,2],domain:[0,2],unit:'V/m',label:'E',scope:'Prescribed field'}],
  counts:[],scalars:[],unsupported:[],impacts:[],tracks:[]};
}
async function fixture(t:TestContext){
 const dom=new JSDOM('<main></main>'),frame=dom.window.document.querySelector('main')!;
 frame.getBoundingClientRect=()=>({width:1000,height:600,left:0,top:0,right:1000,bottom:600,x:0,y:0,toJSON(){}});
 const previous=globalThis.ResizeObserver;
 globalThis.ResizeObserver=class {observe(){}unobserve(){}disconnect(){}};
 let scene:THREE.Scene|undefined;
 const reference=new THREE.Group(),representations:ViewerRepresentation[]=[];
 reference.add(new THREE.Mesh(new THREE.BoxGeometry(1,.18,.18),new THREE.MeshStandardMaterial()));
 const viewer=createApparatusViewer(frame,{
  loader:{loadAsync:async()=>({scene:reference})},onRepresentation:value=>representations.push(value),
  displayFactory:()=>({renderer:{render(value,camera){scene=value;scene.updateMatrixWorld(true);camera.updateMatrixWorld();},clear(){},setSize(){}},dispose(){}}),
  controlsFactory:(camera,canvas)=>new OrbitControls(camera,canvas),
 });
 t.after(()=>{viewer.dispose();dom.window.close();globalThis.ResizeObserver=previous;});
 await viewer.load({model:'reference.glb'});
 return {viewer,frame,reference,representations,get assembly(){return scene!.getObjectByName('SI engineering assembly')!;}};
}

test('pending preserves accepted hardware and user camera, withholding stale fields until same-shape acceptance',async t=>{
 const h=await fixture(t),first=snapshot();
 h.viewer.updateSurfaceState({status:'ready',snapshot:first});
 const hardware=h.assembly.getObjectByName('engineering-rotating')!;
 const field=h.assembly.getObjectByName('Accepted numerical surfaces')!.children[0] as THREE.Mesh;
 let fieldDisposals=0,hardwareDisposals=0;
 field.geometry.addEventListener('dispose',()=>fieldDisposals++);
 hardware.traverse(node=>{if(node instanceof THREE.Mesh)node.geometry.addEventListener('dispose',()=>hardwareDisposals++);});
 h.viewer.setCamera({position:[.8,.7,.6],target:[.1,0,.02],up:[0,0,-1]});
 const pose=h.viewer.cameraPose();
 for(let i=1;i<=2;i++){
  h.viewer.setPending(true);
  assert.deepEqual(h.viewer.cameraPose(),pose,'pending must retain pan, zoom, orbit and up');
  assert.equal(h.reference.visible,false);
  assert.equal(h.assembly.getObjectByName('engineering-rotating'),hardware);
  assert.equal(h.assembly.getObjectByName('Accepted numerical surfaces'),undefined);
  assert.equal(h.assembly.getObjectByName('Selected surface sample'),undefined);
  assert.equal(h.representations.at(-1)?.status,'pending');
  assert.equal(h.representations.at(-1)?.numerical,false);
  for(const select of h.frame.querySelectorAll('select'))assert.equal(select.hidden,true);
  assert.doesNotMatch(h.frame.querySelector('.apparatus-state')!.textContent!,/V\/m/);
  h.viewer.updateSurfaceState({status:'ready',snapshot:{...first,timeS:i}});
  assert.deepEqual(h.viewer.cameraPose(),pose,'same-shape acceptance must retain the camera');
  assert.equal(h.assembly.getObjectByName('engineering-rotating'),hardware);
  assert.equal(h.representations.at(-1)?.status,'ready');
  assert.equal(h.representations.at(-1)?.numerical,true);
 }
 assert.equal(fieldDisposals,1,'old numerical geometry is disposed on pending');
 assert.equal(hardwareDisposals,0,'pending/reacceptance must not dispose reusable hardware');
 h.viewer.dispose();assert.ok(hardwareDisposals>0,'retained hardware must still be released on disposal');
 assert.equal(h.frame.children.length,0);
});

test('a true dimension change after pending replaces hardware and refits the camera',async t=>{
 const h=await fixture(t);
 h.viewer.updateSurfaceState({status:'ready',snapshot:snapshot()});
 const hardware=h.assembly.getObjectByName('engineering-rotating')!;
 h.viewer.setCamera({position:[.8,.7,.6],target:[.1,0,.02]});const pose=h.viewer.cameraPose();
 h.viewer.setPending(true);
 h.viewer.updateSurfaceState({status:'ready',snapshot:snapshot(.4,2)});
 assert.notEqual(h.assembly.getObjectByName('engineering-rotating'),hardware);
 assert.notDeepEqual(h.viewer.cameraPose(),pose);
 assert.equal(h.reference.visible,false);assert.equal(h.representations.at(-1)?.status,'ready');
});

test('initial pending, invalid and null states expose no stale accepted geometry or samples',async t=>{
 const h=await fixture(t);
 h.viewer.setPending(true);assert.equal(h.reference.visible,true);assert.equal(h.assembly.children.length,0);
 for(const packet of [{status:'invalid',reason:'Rejected inputs'} as const,null]){
  h.viewer.updateSurfaceState({status:'ready',snapshot:snapshot()});
  const hardware=h.assembly.getObjectByName('engineering-rotating');
  h.viewer.setPending(true);h.viewer.updateSurfaceState(packet);
  assert.equal(h.reference.visible,true);assert.equal(h.assembly.children.length,0);
  assert.equal(h.representations.at(-1)?.numerical,false);
  h.viewer.updateSurfaceState({status:'ready',snapshot:snapshot()});
  assert.notEqual(h.assembly.getObjectByName('engineering-rotating'),hardware);
 }
});

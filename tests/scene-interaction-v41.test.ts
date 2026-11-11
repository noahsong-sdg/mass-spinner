import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import * as THREE from 'three';
import {createApparatusViewer} from '../src/apparatus-viewer.js';
import {createSurfaceLayer} from '../src/surface-layer.js';
import {surfaceState} from '../src/surface-state.js';
import {DEFAULT_FUSION_BEAM} from '../src/fusion-reactor.js';
import {DEFAULT_COUPLED_TARGET,simulateCoupledTarget} from '../src/coupled-target.js';

const bounds={width:800,height:600,left:0,top:0,right:800,bottom:600,x:0,y:0,toJSON(){}};
const snapshot=(length=1)=>({model:'rotating',domain:{kind:'cylinder',radiusM:.2,lengthM:length},timeS:0,
 fields:[{id:'electric-radial',coordinate:'radius',positionsM:[0,.1,.2],values:[0,1,2],domain:[0,2],unit:'V/m',label:'E',scope:'Prescribed field'}],
 counts:[],scalars:[],unsupported:[],impacts:[],tracks:[{speciesIndex:0,positionsM:[[.1,.15,0],[.1,.15,length]],scope:'Interior trajectory'}]});

async function viewerFixture(t:any){
 const dom=new JSDOM('<main></main>'),frame=dom.window.document.querySelector('main')!;
 const original=(globalThis as any).ResizeObserver;(globalThis as any).ResizeObserver=class{observe(){}disconnect(){}};
 frame.getBoundingClientRect=()=>bounds;
 let camera:THREE.PerspectiveCamera,controls:any,scene:THREE.Scene;
 const selected:string[]=[],reference=new THREE.Group();reference.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial()));
 const viewer=createApparatusViewer(frame,{loader:{loadAsync:async()=>({scene:reference})},onSelect:(id:string)=>selected.push(id),
  displayFactory:()=>({renderer:{render(s:THREE.Scene){scene=s;},clear(){},setSize(){}},dispose(){}}),
  controlsFactory:(value:THREE.PerspectiveCamera)=>{camera=value;return controls={target:new THREE.Vector3(),addEventListener(){},removeEventListener(){},update(){camera.lookAt(this.target);},dispose(){}};},
 });
 t.after(()=>{viewer.dispose();dom.window.close();(globalThis as any).ResizeObserver=original;});
 await viewer.load({model:'test.glb'});viewer.canvas.getBoundingClientRect=()=>bounds;
 return {dom,frame,viewer,selected,get camera(){return camera!;},get controls(){return controls;},get scene(){return scene!;}};
}

test('hardware picking ignores non-actionable trajectories across apparatus scales',async t=>{
 const h=await viewerFixture(t);
 for(const scale of [.01,1,10]){
  const s=snapshot();s.fields=[];s.domain.radiusM*=scale;s.domain.lengthM*=scale;
  s.tracks[0].positionsM=s.tracks[0].positionsM.map(p=>p.map(v=>v*scale));
  h.viewer.updateSurfaceState({status:'ready',snapshot:s},{radius:s.domain.radiusM,length:s.domain.lengthM});
  h.camera.up.set(0,0,1);h.camera.position.set(.5*scale,2*scale,0);h.controls.target.set(.5*scale,0,0);h.controls.update();h.camera.updateMatrixWorld();
  const view=h.frame.querySelector('select[aria-label="3D result layer"]') as HTMLSelectElement;
  view.value='tracks';view.dispatchEvent(new h.dom.window.Event('change'));
  const projected=new THREE.Vector3(.5*scale,.15*scale,-.1*scale).project(h.camera);
  assert.ok(Math.hypot(projected.x*400,projected.y*300)>40);
  const before=h.selected.length;
  for(const name of ['pointerdown','pointerup'])h.viewer.canvas.dispatchEvent(new h.dom.window.MouseEvent(name,{clientX:400,clientY:300,button:0}));
  assert.equal(h.selected.length,before+1,'each scale must produce a new hardware selection');
  assert.equal(h.selected.at(-1),'vessel',`trajectory must not consume a hardware click at scale ${scale}`);
 }
});

test('actual reset camera looks through the cutaway at radial fields for each cylindrical mechanism',async t=>{
 const h=await viewerFixture(t);
 for(const model of ['rotating','icr','centrifuge','doublewell','doublewell-dynamics'])for(const length of [1,2.8]){
  const s={...snapshot(length),model};h.viewer.updateSurfaceState({status:'ready',snapshot:s},{radius:.2,length,boundary:'open'});h.viewer.reset();
  const assembly=h.scene.getObjectByName('SI engineering assembly')!;assembly.updateWorldMatrix(true,true);
  for(const local of [[-.01,0,length/2],[.01,0,length/2],[0,.01,length/2]]){
   const point=new THREE.Vector3(...local).applyMatrix4(assembly.matrixWorld),ray=new THREE.Raycaster(h.camera.position,point.clone().sub(h.camera.position).normalize());
   const hits=ray.intersectObject(assembly,true).filter(hit=>{
    if(!hit.object.isMesh)return false;
    for(let n:THREE.Object3D|null=hit.object;n;n=n.parent)if(!n.visible)return false;return true;
   });
   assert.equal(hits[0]?.object.userData.fieldId,'electric-radial',`${model}, L=${length}: central field must be visible through the cutaway`);
  }
 }
});

test('selected sample has its own precise outline without changing field colors, values or batching',()=>{
 const dom=new JSDOM('<main></main>'),frame=dom.window.document.querySelector('main')!,layer=createSurfaceLayer(frame);
 try{
  const s=snapshot();layer.update({status:'ready',snapshot:s},{radius:.2,length:1});
  const overlay=layer.group.getObjectByName('Accepted numerical surfaces')!,mesh=overlay.children[0] as THREE.Mesh;
  const colors=Array.from(mesh.geometry.getAttribute('color').array),sampleControl=frame.querySelector('select[aria-label="Inspect an exact surface sample"]') as HTMLSelectElement;
  for(const index of [1,2,0]){
   sampleControl.value=String(index);sampleControl.dispatchEvent(new dom.window.Event('change'));
   const highlights=layer.group.children.filter(n=>n.name==='Selected surface sample');assert.equal(highlights.length,1);
   const outline=highlights[0] as THREE.LineSegments;outline.geometry.computeBoundingBox();
   const outer=[.05,.15,.2][index];assert.ok(Math.abs(outline.geometry.boundingBox!.max.x-outer)<1e-7);
   assert.deepEqual(Array.from(mesh.geometry.getAttribute('color').array),colors,'selection must preserve raw colormap');
   assert.equal(overlay.children.length,1,'field remains batched');assert.match(frame.textContent!,new RegExp(`${s.fields[0].values[index]} V/m`));
  }
  layer.update({status:'pending',reason:'Updated inputs'});assert.equal(layer.group.getObjectByName('Selected surface sample'),undefined);
 }finally{layer.dispose();dom.window.close();}
});

test('target selection outlines the true-depth cell and matching microscope cell, then clears on view change',()=>{
 const dom=new JSDOM('<main></main>'),frame=dom.window.document.querySelector('main')!,layer=createSurfaceLayer(frame);
 try{
  const source={...DEFAULT_FUSION_BEAM,beamCurrentA:0,stoppingModel:'geant4-bragg' as const,materialColumnM2:1e22,exposureS:.001};
  const c={...DEFAULT_COUPLED_TARGET,depthCells:4,backingCells:2,samples:10,cooldownS:0,maxStepS:.001},result=simulateCoupledTarget(source,c);
  const packet=surfaceState({model:'beam-target',settings:c,result,acceptedModel:'beam-target',acceptedSettings:c,selectedState:result.final,source,acceptedSource:source});
  assert.equal(packet.status,'ready');layer.update(packet,c);
  const field=frame.querySelector('select[aria-label="Surface quantity"]') as HTMLSelectElement;
  for(const id of ['temperature-film','temperature-backing','tritiumFraction']){
   field.value=id;field.dispatchEvent(new dom.window.Event('change'));
   const samples=frame.querySelector('select[aria-label="Inspect an exact surface sample"]') as HTMLSelectElement;
   samples.value='1';samples.dispatchEvent(new dom.window.Event('change'));
   const outline=layer.group.getObjectByName('Selected surface sample') as THREE.LineSegments,positions=outline.geometry.getAttribute('position');
   assert.equal(positions.count,32,'four physical cell edges and twelve microscope edges');
   const state=(packet as any).snapshot,quantity=state.fields.find((f:any)=>f.id===id),expected=quantity.boundsM.slice(1,3);
   const physical=Array.from({length:8},(_,i)=>positions.getZ(i));
   assert.ok(Math.abs(Math.min(...physical)-expected[0])<1e-9);assert.ok(Math.abs(Math.max(...physical)-expected[1])<1e-9);
   const microscope=layer.group.getObjectByName(`Depth microscope: ${quantity.region}`)!,cell=microscope.children[1] as THREE.Mesh;
   cell.geometry.computeBoundingBox();const box=cell.geometry.boundingBox!.clone().translate(cell.position);
   for(let i=8;i<positions.count;i++)assert.ok(box.clone().expandByScalar(1e-8).containsPoint(new THREE.Vector3().fromBufferAttribute(positions,i)));
  }
  const view=frame.querySelector('select[aria-label="3D result layer"]') as HTMLSelectElement;
  view.value='hardware';view.dispatchEvent(new dom.window.Event('change'));
  assert.equal(layer.group.getObjectByName('Selected surface sample'),undefined);assert.equal(layer.group.getObjectByName('Depth microscope: film'),undefined);
 }finally{layer.dispose();dom.window.close();}
});

test('target reset exposes true-depth film surfaces at small and large beam areas',async t=>{
 const h=await viewerFixture(t);
 for(const beamAreaM2 of [1e-8,.01]){
  const source={...DEFAULT_FUSION_BEAM,beamAreaM2,beamCurrentA:0,stoppingModel:'geant4-bragg' as const,materialColumnM2:1e22,exposureS:.001};
  const c={...DEFAULT_COUPLED_TARGET,depthCells:4,backingCells:2,samples:10,cooldownS:0,maxStepS:.001},result=simulateCoupledTarget(source,c);
  const packet=surfaceState({model:'beam-target',settings:c,result,acceptedModel:'beam-target',acceptedSettings:c,selectedState:result.final,source,acceptedSource:source});
  assert.equal(packet.status,'ready');h.viewer.updateSurfaceState(packet,c);h.viewer.reset();
  const assembly=h.scene.getObjectByName('SI engineering assembly')!;assembly.updateWorldMatrix(true,true);
  const local=new THREE.Vector3(0,0,c.filmThicknessM*.375),point=local.applyMatrix4(assembly.matrixWorld);
  const ray=new THREE.Raycaster(h.camera.position,point.clone().sub(h.camera.position).normalize());
  const hits=ray.intersectObject(assembly,true).filter(hit=>{
   if(!hit.object.isMesh)return false;for(let n:THREE.Object3D|null=hit.object;n;n=n.parent)if(!n.visible)return false;return true;
  });
  const field=hits.find(hit=>hit.object.userData.fieldId==='temperature-film');assert.ok(field,'target depth field must intersect the sightline');
  const blockers=hits.filter(hit=>hit.object.userData.fieldId===undefined&&hit.distance<field.distance-1e-8);
  assert.equal(blockers.length,0,`area ${beamAreaM2}: target section blocked by ${blockers.map(hit=>hit.object.name).join(', ')}`);
 }
});

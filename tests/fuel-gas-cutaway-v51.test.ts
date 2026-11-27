import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {JSDOM} from 'jsdom';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.ts';
import {simulateFuelTransport,sampleFuelTransport} from '../src/fuel-transport.ts';
import {createFuelSceneTools} from '../src/fuel-scene-tools.js';
import {createFuelViewTools} from '../src/fuel-view-ui.js';

const K=1.380649e-23;
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<2e-12*Math.max(1,Math.abs(b)),`${a} ≠ ${b}`);
function fixture(){
 const result=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,durationS:.5}),scene=new THREE.Group();
 const tools=createFuelSceneTools({scene,result});
 return {result,scene,tools,field:tools.group.getObjectByName('Axially uniform gas field')!};
}

test('longitudinal gas field integrates accepted species inventories on their exact radial cells',()=>{
 const {result,tools,field}=fixture();
 const transport=simulateFuelTransport(result,{cells:24,steps:64}),state=sampleFuelTransport(transport,.5),before=JSON.stringify(state);
 tools.update(state);const cells=field.children.filter(m=>m.userData.side===1);
 assert.equal(cells.length,24);assert.equal(field.children.length,48);
 const section=tools.group.children.filter(m=>m.name==='Radial field sample');assert.equal(section.length,24);
 const x=result.config.lightFraction,number=result.config.pressurePa*Math.PI*result.config.radiusM**2*result.config.lengthM/(K*result.config.gasK);
 let light=0,heavy=0;
 for(const cell of cells){
  const s=cell.userData,i=s.cell;
  close(s.innerRadiusM,transport.radiusEdgesM[i]);close(s.outerRadiusM,transport.radiusEdgesM[i+1]);
  close(section[i].userData.innerRadiusM,s.innerRadiusM);close(section[i].userData.outerRadiusM,s.outerRadiusM);
  close(s.lightDensityM3,number*x*state.lightMass[i]/s.volumeM3);close(s.heavyDensityM3,number*(1-x)*state.heavyMass[i]/s.volumeM3);
  light+=s.lightDensityM3*s.volumeM3;heavy+=s.heavyDensityM3*s.volumeM3;
 }
 close(light,number*x);close(heavy,number*(1-x));assert.equal(JSON.stringify(state),before);tools.dispose();
});

test('changing the radial grid releases old volume and section resources exactly once',()=>{
 const {tools,field}=fixture(),old=[...field.children,...tools.group.children.filter(m=>m.name==='Radial field sample')];
 let geometries=0,materials=0;
 for(const node of old as THREE.Mesh<THREE.BufferGeometry,THREE.Material>[]){node.geometry.addEventListener('dispose',()=>geometries++);node.material.addEventListener('dispose',()=>materials++);}
 tools.update({lightMass:[.2,.8],heavyMass:[.5,.5]});
 assert.equal(geometries,old.length);assert.equal(materials,old.length);assert.equal(field.children.length,4);
 tools.dispose();tools.dispose();assert.equal(geometries,old.length);assert.equal(materials,old.length);
});

test('wall probes accept float32 surface rounding without sampling outside the exact gas domain',()=>{
 const {result,scene,tools,field}=fixture(),R=result.config.radiusM,L=result.config.lengthM;
 scene.updateMatrixWorld(true);let overshoot=false;
 for(const node of field.children as THREE.Mesh[]){
  if(node.userData.outerRadiusM!==R)continue;
  const p=node.geometry.getAttribute('position');
  for(let i=0;i<p.count;i++){
   const point=new THREE.Vector3().fromBufferAttribute(p,i);overshoot ||= Math.hypot(point.x,point.y)>R;
   const sample=tools.sampleWorld(node.localToWorld(point));assert.ok(sample);
   assert.ok(sample.radiusM<=R&&sample.axialM>=0&&sample.axialM<=L);
  }
 }
 assert.equal(overshoot,true,'exercise a rendered vertex beyond the exact radius');
 assert.equal(tools.sampleWorld(scene.localToWorld(new THREE.Vector3(R*(1+1e-5),0,L/2))),null);
 tools.dispose();
});

test('field and movable section agree while moving the section does not move the longitudinal gas field',()=>{
 const {result,scene,tools,field}=fixture(),state={lightMass:[.1,.9],heavyMass:[.6,.4],timeS:.3,neutralRadS:7};
 tools.update(state);tools.setLayer('density');tools.setSpecies('heavy');
 scene.updateMatrixWorld(true);const before=field.getWorldPosition(new THREE.Vector3());
 tools.setSlice(.2);scene.updateMatrixWorld(true);assert.deepEqual(field.getWorldPosition(new THREE.Vector3()),before);
 for(const cell of field.children){const p=tools.sampleAt(cell.userData.radiusM);close(cell.userData.value,p.heavyDensityM3);close(p.timeS,.3);}
 const point=scene.localToWorld(new THREE.Vector3(result.config.radiusM*.4,0,result.config.lengthM*.8));
 close(tools.sampleWorld(point).axialM,result.config.lengthM*.8);
 assert.equal(tools.sampleWorld(scene.localToWorld(new THREE.Vector3(0,0,result.config.lengthM*2))),null);
 close(tools.group.position.z,.2*result.config.lengthM);assert.match(tools.legend.label,/⁷Li/);tools.dispose();
});

test('change-from-start colors have fixed shared limits and zero enrichment for a uniform start',()=>{
 const {tools,field}=fixture();tools.setLayer('enrichment');
 const uniform={lightMass:[.5,.5],heavyMass:[.5,.5],timeS:0,neutralRadS:0};tools.update(uniform);
 assert.deepEqual(tools.legend.domain,[-.01,.01]);assert.match(tools.legend.label,/clipped at ±0\.01/);
 for(const cell of field.children)close(cell.userData.value,0);
 tools.update({lightMass:[.2,.8],heavyMass:[.8,.2],timeS:.5,neutralRadS:100});
 const colors=field.children.map((m:any)=>m.material.color.toArray());
 assert.ok(field.children[0].userData.value<-.01,'exact field value remains outside the clipped color range');
 assert.deepEqual(colors[0],new THREE.Color('#d29456').toArray());
 tools.setDomains({composition:[0,1],density:[0,1e24],speed:[0,1000]});
 assert.deepEqual(tools.legend.domain,[-.01,.01]);assert.deepEqual(field.children.map((m:any)=>m.material.color.toArray()),colors);
 assert.throws(()=>tools.setDomains({enrichment:[-.02,.02]}),RangeError);
 tools.update(uniform);for(const cell of field.children)close(cell.userData.value,0);tools.dispose();
});

test('small lithium-fraction changes use the fixed one-percentage-point key without per-frame normalization',()=>{
 const {tools,field}=fixture();tools.setLayer('enrichment');
 tools.update({lightMass:[.52,.48],heavyMass:[.5,.5],timeS:.5,neutralRadS:100});
 const cell=field.children[0] as THREE.Mesh<any,THREE.MeshBasicMaterial>,delta=cell.userData.value;
 assert.ok(delta>.002&&delta<.004);
 const expected=new THREE.Color('#69777a').lerp(new THREE.Color('#8db3a6'),delta/.01);
 cell.material.color.toArray().forEach((value,i)=>close(value,expected.toArray()[i]));assert.deepEqual(tools.legend.domain,[-.01,.01]);tools.dispose();
});

test('gas display opens with 3D samples and a transparent longitudinal section, without solving again',()=>{
 const {result,tools}=fixture(),dom=new JSDOM('<main></main>'),doc=dom.window.document;
 const host=doc.querySelector('main')!,before=JSON.stringify(result);tools.motion={group:new THREE.Group()};
 const view=createFuelViewTools({document:doc,host,onChange:()=>view.apply(tools)});view.apply(tools);
 assert.equal(view.state.representation,'both');assert.equal(view.state.visible,true);assert.equal(tools.group.visible,true);assert.equal(tools.motion.group.visible,true);
 const field=tools.group.getObjectByName('Axially uniform gas field')!;assert.equal(field.visible,true);
 for(const mesh of field.children as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>[]){assert.equal(mesh.geometry.getIndex()!.count,6);assert.equal(mesh.material.transparent,true);assert.equal(mesh.material.depthWrite,false);}
 assert.equal((host.querySelector('#fuel-view-visible') as HTMLInputElement).checked,true);
 assert.equal(tools.legend.layer,'density');assert.match(host.textContent!,/not visible light/);
 const representation=host.querySelector('#fuel-view-representation') as HTMLSelectElement;representation.value='field';representation.dispatchEvent(new dom.window.Event('change'));
 assert.equal(tools.motion.group.visible,false);assert.equal(tools.group.getObjectByName('Axially uniform gas field')!.visible,true);
 for(const mesh of field.children as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>[]){assert.ok(mesh.geometry.getIndex()!.count>6);assert.equal(mesh.material.transparent,false);assert.equal(mesh.material.depthWrite,true);}
 for(const mode of ['spin','flow','transport','equilibrium'] as const){view.presentMode(mode);view.apply(tools);assert.equal(tools.motion.group.visible,true);assert.equal(tools.group.visible,mode==='transport'||mode==='equilibrium');assert.equal(representation.value,view.state.representation);}
 assert.equal(JSON.stringify(result),before);tools.dispose();dom.window.close();
});

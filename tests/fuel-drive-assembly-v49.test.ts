import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {JSDOM} from 'jsdom';
import {DEFAULT_FUEL_CENTRIFUGE as defaults,simulateFuelCentrifuge} from '../src/fuel-centrifuge.ts';
import {fuelDriveAt,createFuelDrive} from '../src/fuel-drive.js';
import {attachFuelAssembly} from '../src/fuel-assembly.js';
import {buildFuelCentrifugeGeometry,FUEL_COMPONENTS} from '../src/fuel-centrifuge-geometry.js';
import {createFuelViewTools} from '../src/fuel-view-ui.js';

const close=(a:number,b:number,tol=2e-7)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1e-20,Math.abs(b)),`${a} != ${b}`);
const source=readFileSync('web-assets/models/centrifuge-assembly.glb');
const template=await new GLTFLoader().parseAsync(source.buffer.slice(source.byteOffset,source.byteOffset+source.byteLength),'');
function release(scene:THREE.Object3D){const resources=new Set<any>();scene.traverse((o:any)=>{if(o.geometry)resources.add(o.geometry);for(const m of o.material?Array.isArray(o.material)?o.material:[o.material]:[])resources.add(m);});for(const r of resources)r.dispose();}

test('prescribed electromagnetic vectors obey the actual cross product and integrate to the accepted rotor torque',()=>{
 for(const currentA of [0,.03,.2])for(const magneticT of [0,.5,2])for(const driveInnerFraction of [.01,.3,.99]){
  const c={...defaults,currentA,magneticT,driveInnerFraction},result=simulateFuelCentrifuge(c),ri=c.radiusM*driveInnerFraction,dr=(c.radiusM-ri)/100;
  let torque=0;
  for(let i=0;i<100;i++){
   const r=ri+(i+.5)*dr,s=fuelDriveAt(c,r,.73),cross=new THREE.Vector3(...s.current).cross(new THREE.Vector3(...s.field));
   for(let j=0;j<3;j++)assert.ok(Math.abs(cross.getComponent(j)-s.force[j])<1e-12);
   torque+=r*s.forceDensityNM3*2*Math.PI*r*c.lengthM*dr;
   assert.ok(s.currentDensityAM2<=0);assert.ok(s.forceDensityNM3>=0);
   if(result.mechanics.torque===0)assert.equal(s.torqueNm,0);else close(s.torqueNm,result.mechanics.torque,1e-12);
  }
  if(result.mechanics.torque===0)assert.equal(torque,0);else close(torque,result.mechanics.torque,1e-12);
 }
});

test('direction glyphs retain SI magnitudes, do not pick like hardware, and vanish at zero drive',()=>{
 for(const config of [defaults,{...defaults,currentA:0},{...defaults,magneticT:0}]){
  const drive=createFuelDrive(config);assert.equal(drive.group.userData.nonPickable,true);
  const layers=Object.fromEntries(drive.group.children.map(o=>[o.name,o]));
  assert.equal(layers.J.children.length,3);assert.equal(layers.B.children.length,config.magneticT===0?0:3);
  assert.equal(layers.J.visible,config.currentA>0);assert.equal(layers.force.visible,config.currentA>0);
  assert.equal(layers.force.children.length,config.magneticT===0?0:3);
  for(const glyph of layers.J.children)assert.equal(glyph.userData.directionOnly,true);
  drive.setLayer('J');assert.equal(layers.J.visible,config.currentA>0);assert.equal(layers.B.visible,false);
  drive.setCurrent(.04);assert.equal(layers.J.visible,true);assert.equal(drive.state.currentA,.04);for(const glyph of layers.J.children)assert.equal(glyph.userData.physicalMagnitude,Math.abs(drive.state.currentDensityAM2));
  drive.setCurrent(0);assert.equal(layers.J.visible,false);drive.setLayer('off');assert.equal(drive.group.visible,false);
  assert.throws(()=>drive.setLayer('invented'),RangeError);release(drive.group);
 }
 for(const radius of [0,defaults.radiusM*1.01])assert.throws(()=>fuelDriveAt(defaults,radius),RangeError);
});

test('real Blender GLB has nine SI modules and independently editable engineering details',()=>{
 const modules=template.scene.children;assert.equal(modules.length,9);
 let count=0;template.scene.traverse((o:any)=>{if(o.isMesh){count++;assert.ok(FUEL_COMPONENTS.some(c=>c.id===o.userData.componentId),o.name);assert.match(o.userData.materialBasis,/Assumed/);assert.match(o.userData.geometryBasis,/illustrative/);for(const a of Object.values(o.geometry.attributes) as THREE.BufferAttribute[])for(const v of a.array)assert.ok(Number.isFinite(v));}});
 assert.equal(count,261);for(const name of ['Hex flange nut','Recessed metallic seal','HV alumina feedthrough','Copper solenoid turn','Coil bus tab','Ceramic isolation pad'])assert.ok(modules.some(o=>o.getObjectByName(name.replaceAll(' ','_'))||o.getObjectByName(name)),name);
 const turns:any[]=[];template.scene.traverse(o=>{if(o.userData.renderName==='Copper solenoid turn')turns.push(o);});assert.equal(turns.length,28);
 for(const turn of turns){turn.geometry.computeBoundingBox();assert.ok(turn.geometry.boundingBox.max.z-turn.geometry.boundingBox.min.z>.008,'a turn must rise along z and join the next turn, rather than be a disconnected shorted ring');}
});

test('authored assembly follows accepted SI radius and length without stretching fastener shapes with chamber length',()=>{
 const builds:any[]=[];
 for(const radiusM of [.08,.3])for(const lengthM of [.3,1.8]){
  const c={...defaults,radiusM,lengthM},r=simulateFuelCentrifuge(c),built=buildFuelCentrifugeGeometry({config:c,result:r,assembly:template.scene,diagnostics:true});builds.push(built);
  assert.equal(built.scene.userData.authoredAssembly.modules,9);
  const wall=built.scene.getObjectByName('Vessel_pressure_wall')??built.scene.getObjectByName('Vessel pressure wall');assert.ok(wall);
  const box=new THREE.Box3().setFromObject(wall);close(box.min.x,-lengthM/2);close(box.max.x,lengthM/2);
  const modules=built.scene.getObjectByName('construction')!.children.filter(o=>o.userData.assemblyModule);
  for(const module of modules){close(module.position.z,module.userData.anchorFraction*lengthM);close(module.scale.x,radiusM/.12);close(module.scale.z,module.userData.scaleMode==='length'?lengthM/.8:module.userData.coilPack?Math.min(radiusM/.12,4*lengthM):radiusM/.12);}
  const packs=modules.filter(o=>o.userData.coilPack).sort((a,b)=>a.position.z-b.position.z);
  for(let i=1;i<packs.length;i++){const a=new THREE.Box3().setFromObject(packs[i-1]),b=new THREE.Box3().setFromObject(packs[i]);assert.ok(a.max.x<b.min.x,'adjacent coil packs must not interpenetrate');}
  assert.equal(built.scene.getObjectsByProperty('name','Vacuum flange').length,0,'old flange must be replaced rather than duplicated');
  const original=template.scene.getObjectByName('Hex_flange_nut')??template.scene.getObjectByName('Hex flange nut');
  const copy=built.scene.getObjectByName(original!.userData.renderName) as THREE.Mesh;assert.notEqual(copy.geometry,(original as THREE.Mesh).geometry);assert.notEqual(copy.material,(original as THREE.Mesh).material);
  const coil=built.scene.getObjectByName('Copper_solenoid_turn')??built.scene.getObjectByName('Copper solenoid turn');assert.ok(coil);
  const before=built.scene.worldToLocal(coil.getWorldPosition(new THREE.Vector3()));built.tools.setStaging({explode:1});
  const after=built.scene.worldToLocal(coil.getWorldPosition(new THREE.Vector3()));close(after.z-before.z,Math.sign(before.z-lengthM/2)*radiusM*.65);
  built.tools.setStaging({explode:0});close(built.scene.worldToLocal(coil.getWorldPosition(new THREE.Vector3())).z,before.z);
 }
 const ids=new Set<unknown>();for(const b of builds){b.scene.traverse((n:any)=>{if(n.isMesh){assert.ok(!ids.has(n.geometry));ids.add(n.geometry);}});b.tools.dispose();release(b.scene);}
});

test('cutaway presentation and drive controls leave accepted physics untouched and dispose overlay resources',()=>{
 const result=simulateFuelCentrifuge(defaults),before=JSON.stringify(result),built=buildFuelCentrifugeGeometry({config:result.config,result,assembly:template.scene,diagnostics:true});
 const dom=new JSDOM('<main></main>'),host=dom.window.document.querySelector('main')!;let changes=0;
 const view=createFuelViewTools({document:dom.window.document,host,onChange:()=>{changes++;view.apply(built.tools);}});view.apply(built.tools);
 assert.equal(view.state.cutaway,.62);assert.equal(view.state.drive,'all');assert.equal(view.state.ghost,true);assert.equal(built.tools.group.visible,true);
 const wall=built.scene.getObjectByName('Vessel_pressure_wall')??built.scene.getObjectByName('Vessel pressure wall');
 assert.equal((wall as THREE.Mesh).material.clippingPlanes.length,1);
 const input=host.querySelector('#fuel-view-drive') as HTMLSelectElement;input.value='force';input.dispatchEvent(new dom.window.Event('change'));assert.equal(changes,1);
 assert.match(host.querySelector('.fuel-drive-legend')!.textContent!,/prescribed B and radial current/);assert.equal(built.tools.drive.group.getObjectByName('B').visible,false);
 assert.equal(JSON.stringify(result),before);
 let disposed=0;built.tools.drive.group.traverse((o:any)=>{o.geometry?.addEventListener('dispose',()=>disposed++);});built.tools.dispose();assert.ok(disposed>0);const n=disposed;built.tools.dispose();assert.equal(disposed,n);release(built.scene);dom.window.close();
 const scene=new THREE.Group();assert.throws(()=>attachFuelAssembly(scene,new THREE.Group(),defaults),/Incomplete/);
});

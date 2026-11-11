import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildFuelCentrifugeGeometry,FUEL_COMPONENTS} from '../src/fuel-centrifuge-geometry.js';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.ts';

const config={...DEFAULT_FUEL_CENTRIFUGE,radiusM:.15,lengthM:.8,driveInnerFraction:.2,cutFraction:.65,stages:3,feedStage:1};
const profiles=(radiusM=.15)=>Array.from({length:13},(_,i)=>({radiusM:radiusM*i/12,lightFraction:.8-.5*i/12}));
function build(overrides={}){const c={...config,...overrides};return buildFuelCentrifugeGeometry({config:c,result:{...simulateFuelCentrifuge(c),profiles:profiles(c.radiusM)}}).scene;}
function members(scene:THREE.Group,id:string){const found:THREE.Mesh[]=[];scene.traverse((node:any)=>{if(node.isMesh&&node.userData.componentId===id)found.push(node);});return found;}
function named(scene:THREE.Group,name:string){const object=scene.getObjectByName(name) as THREE.Mesh;assert.ok(object,name);return object;}
function release(scene:THREE.Group){const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();scene.traverse((node:any)=>{if(node.geometry)geometries.add(node.geometry);if(node.material)for(const material of Array.isArray(node.material)?node.material:[node.material])materials.add(material);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('fuel centrifuge preserves detailed SI shell and accepted dimensions in horizontal scene coordinates',()=>{
 for(const [radiusM,lengthM]of [[.08,.3],[.3,1.8]]){
  const scene=build({radiusM,lengthM});const wall=named(scene,'Vessel pressure wall');
  const box=new THREE.Box3().setFromObject(wall);close(box.min.x,-lengthM/2);close(box.max.x,lengthM/2);
  const p=wall.geometry.getAttribute('position');let outer=0;for(let i=0;i<p.count;i++)outer=Math.max(outer,Math.hypot(p.getX(i),p.getY(i)));
  assert.ok(outer>radiusM&&outer<radiusM*1.06);assert.equal(wall.parent!.scale.x,1.12);assert.equal(scene.userData.gasRadiusM,radiusM);close(scene.userData.vacuumEnvelopeRadiusM,radiusM*1.12);assert.equal(members(scene,'coils').filter(n=>n.name==='Copper solenoid turn').length,28);
  const inlet=scene.localToWorld(new THREE.Vector3(0,0,0)),outlet=scene.localToWorld(new THREE.Vector3(0,0,lengthM));close(inlet.x,-lengthM/2);close(outlet.x,lengthM/2);
  release(scene);
 }
});

test('differential pumping has one outer outlet and one stage; isotope separation has two product outlets and returns',()=>{
 const pump=build({application:'pump',stages:7});assert.equal(pump.userData.stages,1);assert.equal(members(pump,'heavy-outlet').length,1);assert.equal(members(pump,'light-outlet').length,0);assert.equal(members(pump,'stages').length,0);release(pump);
 const enrichment=build({stages:4});assert.equal(members(enrichment,'heavy-outlet').length,1);assert.equal(enrichment.getObjectsByProperty('name','Inner light-product duct').length,1);
 assert.equal(members(enrichment,'stages').filter(n=>n.name==='Stage partition').length,3);assert.equal(members(enrichment,'stages').filter(n=>n.name==='Heavy-stream return').length,3);
 for(const pipe of members(enrichment,'stages').filter(n=>n.name==='Heavy-stream return')){
  const p=pipe.geometry.getAttribute('position');let lo=Infinity,hi=-Infinity;for(let i=0;i<p.count;i++){lo=Math.min(lo,p.getZ(i));hi=Math.max(hi,p.getZ(i));}
  assert.ok(hi>lo);assert.match(pipe.userData.purpose,/preceding/);assert.match(pipe.userData.geometryBasis,/one reference vessel/);
 }release(enrichment);
});

test('lithium hot liner follows gas radius, separated from the outer vacuum envelope and independently chosen gas temperature',()=>{
 const lithium=build({linerK:1100});const liner=named(lithium,'Lithium refractory sub-vessel');assert.equal(liner.userData.temperatureK,1100);assert.match(liner.userData.purpose,/no temperature evolution or spatial thermal field is solved/);assert.match(liner.userData.materialBasis,/tungsten/);close(liner.userData.gasBoundaryRadiusM,config.radiusM);
 const p=liner.geometry.getAttribute('position'),radii=Array.from({length:p.count},(_,i)=>Math.hypot(p.getX(i),p.getY(i)));
 close(Math.min(...radii),config.radiusM);close(Math.max(...radii),config.radiusM*1.012);
 assert.ok(Math.max(...radii)<lithium.userData.vacuumEnvelopeRadiusM,'illustrative thickness extends outward, preserving the gas bore');
 assert.ok(lithium.userData.vacuumEnvelopeRadiusM>lithium.userData.gasRadiusM);release(lithium);
 const helium=build({pair:'helium'});assert.equal(members(helium,'liner').length,0);assert.equal(named(helium,'Vessel pressure wall').parent!.scale.x,1);release(helium);
});

test('lithium liner cutaway opens toward the same inspection direction as the engineering shell',()=>{
 const scene=build(),liner=named(scene,'Lithium refractory sub-vessel'),center=scene.localToWorld(new THREE.Vector3(0,0,config.lengthM/2));
 const open=new THREE.Vector3(0,1,0).transformDirection(scene.matrixWorld),closed=open.clone().negate();
 assert.equal(new THREE.Raycaster(center,open).intersectObject(liner).length,0);assert.ok(new THREE.Raycaster(center,closed).intersectObject(liner).length>0);release(scene);
});

test('spatial thermal liner inspection distinguishes solved temperatures from illustrative shell shading',()=>{
 const result={...simulateFuelCentrifuge(config),profiles:profiles(),transport:{operation:{thermal:{enabled:true,spatial:{material:'tungsten',thicknessM:.001,cells:16}}}}};
 const {scene}=buildFuelCentrifugeGeometry({config,result});const liner=named(scene,'Lithium refractory sub-vessel');
 assert.equal(liner.userData.temperatureBasis,'Initial radial liner temperature');
 assert.match(liner.userData.purpose,/radial temperatures evolve/);assert.match(liner.userData.purpose,/shading remain illustrative/);assert.doesNotMatch(liner.userData.purpose,/evolving liner temperature is a lumped reservoir/);release(scene);
});

test('hollow cathode has actual gas openings and annular current drive follows chosen radius',()=>{
 const scene=build({driveInnerFraction:.7});const jacket=named(scene,'Perforated tungsten cathode jacket');assert.ok(jacket.geometry.getIndex()!.count<48*16*6);
 assert.ok(named(scene,'LaB₆ thermionic emitter'));assert.match(jacket.userData.purpose,/not the modeled radial-current endpoint/);
 const inner=named(scene,'Inner annular drive cathode'),outer=named(scene,'Outer wall drive anode');
 function radii(mesh:THREE.Mesh){const p=mesh.geometry.getAttribute('position');let lo=Infinity,hi=0;for(let i=0;i<p.count;i++){const radius=Math.hypot(p.getX(i),p.getY(i));lo=Math.min(lo,radius);hi=Math.max(hi,radius);}return [lo,hi];}
 close(radii(inner)[1],.7*config.radiusM);close(radii(outer)[0],config.radiusM);assert.ok(radii(inner)[1]<radii(outer)[0]);
 close(inner.userData.currentEndpointM,.7*config.radiusM);close(outer.userData.currentEndpointM,config.radiusM);
 assert.equal(scene.getObjectByName('Arc cathode'),undefined);assert.equal(scene.getObjectByName('Source discharge anode'),undefined);release(scene);
});

test('collection radius, upstream inlet conductance and downstream pump speed follow their distinct inputs',()=>{
 for(const cutFraction of [.2,.8]){
  const scene=build({cutFraction});const duct=named(scene,'Inner light-product duct'),marker=named(scene,'Prescribed collection cut');
  close(duct.userData.cutRadiusM,cutFraction*config.radiusM);close(marker.userData.cutRadiusM,cutFraction*config.radiusM);
  close((marker.geometry as THREE.TorusGeometry).parameters.radius,cutFraction*config.radiusM);
  assert.ok(members(scene,'feed').length);assert.equal(named(scene,'Downstream exhaust pump').userData.prescribedSpeedM3S,.02);
  const restrictor=named(scene,'Inlet conductance restrictor');assert.equal(restrictor.userData.prescribedConductanceM3S,.05);assert.equal(restrictor.userData.componentId,'feed');assert.ok(restrictor.position.z<0);close(restrictor.position.y,0);
  assert.equal(scene.getObjectByName('Finite-conductance throttle'),undefined);assert.ok(members(scene,'pump').every(mesh=>mesh.userData.prescribedConductanceM3S===undefined));
  const insulator=named(scene,'Source ceramic break');assert.equal(insulator.userData.componentId,'insulators');assert.match(insulator.userData.purpose,/Electrically separates/);
  assert.equal(members(scene,'liner').filter(n=>n.name==='Thermal-isolation standoff').length,3);release(scene);
 }
 const zero=build({cutFraction:0});assert.equal(members(zero,'light-outlet').length,0);release(zero);
});

test('radial colors carry the accepted equilibrium fractions and no particle-trajectory claim',()=>{
 const scene=build();const samples=members(scene,'profile');assert.equal(samples.length,12);
 samples.forEach((mesh,i)=>{const accepted=profiles()[i+1];close(mesh.userData.radiusM,accepted.radiusM);close(mesh.userData.lightFraction,accepted.lightFraction);assert.match(mesh.userData.purpose,/No finite-residence extraction prediction/);assert.match(mesh.userData.materialBasis,/no physical material/);});
 assert.notEqual((samples[0].material as THREE.MeshStandardMaterial).color.getHex(),(samples.at(-1)!.material as THREE.MeshStandardMaterial).color.getHex());release(scene);
});

test('schematic routing is an outline and numerical composition colors are independent of studio illumination',()=>{
 const scene=build();
 for(const mesh of scene.getObjectsByProperty('name','Stage partition') as THREE.Mesh[]){
  assert.equal(mesh.geometry.type,'TorusGeometry');assert.equal((mesh.material as THREE.MeshBasicMaterial).isMeshBasicMaterial,true);assert.equal((mesh.material as THREE.Material).transparent,true);
  assert.match(mesh.userData.geometryBasis,/Routing overlay only/);
 }
 for(const mesh of members(scene,'profile')){assert.equal((mesh.material as THREE.MeshBasicMaterial).isMeshBasicMaterial,true);assert.equal((mesh.material as THREE.Material).depthWrite,false);}
 release(scene);
});

test('unresolved composition remains null and visibly neutral rather than inventing a species fraction',()=>{
 const state=profiles();state[3].lightFraction=null as any;
 const scene=buildFuelCentrifugeGeometry({config,result:{...simulateFuelCentrifuge(config),profiles:state}}).scene;
 const sample=members(scene,'profile')[2];assert.equal(sample.userData.lightFraction,null);assert.match(sample.userData.purpose,/numerically unresolved/);
 assert.equal((sample.material as THREE.MeshStandardMaterial).color.getHex(),0x69777a);release(scene);
});

test('every visible construction and overlay is pickable with honest material and geometry metadata',()=>{
 const scene=build(),ids=new Set(FUEL_COMPONENTS.map(c=>c.id));let meshes=0;
 scene.traverse((node:any)=>{if(!node.isMesh)return;meshes++;assert.ok(ids.has(node.userData.componentId),node.name);assert.equal(typeof node.userData.materialBasis,'string',node.name);assert.equal(typeof node.userData.purpose,'string',node.name);assert.match(node.userData.geometryBasis,/illustrative/i,node.name);
  for(const attribute of Object.values(node.geometry.attributes) as THREE.BufferAttribute[])for(const value of attribute.array)assert.ok(Number.isFinite(value),node.name);
 });assert.ok(meshes>100);release(scene);
});

test('invalid hardware and malformed radial states fail before rendering',()=>{
 for(const overrides of [{radiusM:0},{lengthM:NaN},{driveInnerFraction:1},{driveInnerFraction:0},{cutFraction:-.1},{cutFraction:1.1},{application:'unknown'},{stages:0},{stages:1.5},{stages:13},{linerK:Infinity}])assert.throws(()=>build(overrides),RangeError);
 for(const bad of [[],[{radiusM:0,lightFraction:.5}],[{radiusM:0,lightFraction:.5},{radiusM:.2,lightFraction:.5}],[{radiusM:0,lightFraction:.5},{radiusM:.1,lightFraction:NaN}],[{radiusM:.1,lightFraction:.5},{radiusM:.05,lightFraction:.5}]])assert.throws(()=>buildFuelCentrifugeGeometry({config,result:{profiles:bad}}),RangeError);
});

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
  assert.equal(layers.J.children.length,16);assert.equal(layers.B.children.length,config.magneticT===0?0:16);
  assert.equal(layers.J.visible,config.currentA>0);assert.equal(layers.force.visible,config.currentA>0);
  assert.equal(layers.force.children.length,config.magneticT===0?0:16);
  for(const glyph of layers.J.children)assert.equal(glyph.userData.directionOnly,true);
  drive.group.traverse(node=>{
   if(!(node instanceof THREE.Mesh||node instanceof THREE.Line))return;
   assert.equal(node.renderOrder,3,'direction arrows must draw above hardware');
   for(const material of Array.isArray(node.material)?node.material:[node.material]){
    assert.equal(material.depthTest,false);assert.equal(material.depthWrite,false);assert.equal(material.transparent,true);
   }
  });
  drive.setLayer('J');assert.equal(layers.J.visible,config.currentA>0);assert.equal(layers.B.visible,false);
  drive.setCurrent(.04);assert.equal(layers.J.visible,true);assert.equal(drive.state.currentA,.04);for(const glyph of layers.J.children)assert.equal(glyph.userData.physicalMagnitude,Math.abs(drive.state.currentDensityAM2));
  drive.setCurrent(0);assert.equal(layers.J.visible,false);drive.setLayer('off');assert.equal(drive.group.visible,false);
  assert.throws(()=>drive.setLayer('invented'),RangeError);release(drive.group);
 }
 for(const radius of [0,defaults.radiusM*1.01])assert.throws(()=>fuelDriveAt(defaults,radius),RangeError);
});

test('each drive layer covers the circumference and more than one axial station',()=>{
 const drive=createFuelDrive(defaults);
 try{
  for(const layer of drive.group.children){
   assert.equal(layer.children.length,16,layer.name);
   const stations=new Set(layer.children.map(g=>g.position.z));assert.equal(stations.size,2);
   const angles=layer.children.map(g=>(Math.atan2(g.position.y,g.position.x)+2*Math.PI)%(2*Math.PI)).sort((a,b)=>a-b);
   for(let i=0;i<angles.length;i++)assert.ok((angles[(i+1)%angles.length]-angles[i]+2*Math.PI)%(2*Math.PI)<=Math.PI/4+1e-12);
   for(const glyph of layer.children){
    const angle=Math.atan2(glyph.position.y,glyph.position.x),sample=fuelDriveAt(defaults,Math.hypot(glyph.position.x,glyph.position.y),angle);
    const vector=layer.name==='B'?sample.field:layer.name==='J'?sample.current:sample.force;
    const direction=new THREE.Vector3(0,1,0).applyQuaternion(glyph.quaternion);
    assert.ok(direction.dot(new THREE.Vector3(...vector).normalize())>1-1e-12);
    assert.ok(glyph.position.z>=0&&glyph.position.z<=defaults.lengthM);
   }
  }
 }finally{release(drive.group);}
});

test('real Blender GLB has nine SI modules and independently editable engineering details',()=>{
 const modules=template.scene.children.filter(o=>o.userData.assemblyModule);assert.equal(modules.length,9);
 assert.equal(template.scene.children.length,9,'Export hardware modules only.');
 template.scene.traverse(node=>assert.equal(node.userData.viewContext,undefined));
 template.scene.traverse((o:any)=>{if(o.isMesh){assert.ok(FUEL_COMPONENTS.some(c=>c.id===o.userData.componentId),o.name);assert.match(o.userData.materialBasis,/Assumed/);assert.match(o.userData.geometryBasis,/illustrative/i);for(const a of Object.values(o.geometry.attributes) as THREE.BufferAttribute[])for(const v of a.array)assert.ok(Number.isFinite(v));}});
 for(const name of ['Hex flange nut','Recessed metallic seal','HV alumina feedthrough','Copper solenoid turn','Coil bus tab','Ceramic isolation pad'])assert.ok(modules.some(o=>o.getObjectByName(name.replaceAll(' ','_'))||o.getObjectByName(name)),name);
 const turns:any[]=[];template.scene.traverse(o=>{if(o.userData.renderName==='Copper solenoid turn')turns.push(o);});assert.equal(turns.length,28);
 for(const turn of turns){turn.geometry.computeBoundingBox();assert.ok(turn.geometry.boundingBox.max.z-turn.geometry.boundingBox.min.z>.008,'a turn must rise along z and join the next turn, rather than be a disconnected shorted ring');}
 for(const turn of turns)assert.deepEqual(turn.geometry.getAttribute('position').array,turns[0].geometry.getAttribute('position').array,'identical turns use object transforms so lossless mesh sharing preserves their detail');
});

test('small authored parts retain engineering detail within the measured triangle budget',()=>{
 let triangles=0,washers=0,turns=0;
 template.scene.traverse(node=>{
  if(!(node instanceof THREE.Mesh))return;
  const count=(node.geometry.index?.count??node.geometry.getAttribute('position').count)/3;triangles+=count;
  if(node.userData.renderName==='Captive washer'){washers++;assert.ok(count<=600,'tiny washers do not need thousands of triangles');}
  if(node.userData.renderName==='Copper solenoid turn'){turns++;assert.ok(count<=2400,'retain the helical turn without the old excess tessellation');}
 });
 assert.equal(washers,64);assert.equal(turns,28);assert.ok(triangles<450_000,`${triangles} instantiated triangles exceed the assembly budget`);
});

test('the authored pressure shell closes the full circumference and feedthroughs have real cover bores',()=>{
 template.scene.updateMatrixWorld(true);
 const wall=template.scene.getObjectByName('Vessel_pressure_wall')!;
 for(let i=0;i<72;i++){
  const angle=i*Math.PI/36,ray=new THREE.Raycaster(new THREE.Vector3(0,0,.4),new THREE.Vector3(Math.cos(angle),Math.sin(angle),0));
  const hit=ray.intersectObject(wall)[0];assert.ok(hit,`Missing wall at angle ${angle}`);
  const radius=Math.hypot(hit.point.x,hit.point.y);assert.ok(radius>=.12*Math.cos(Math.PI/96)-1e-8&&radius<=.12+1e-8,'the 96-sided shell bounds the gas radius');
 }
 const covers:THREE.Object3D[]=[];template.scene.traverse(node=>{if(node.userData.renderName==='End retaining plate')covers.push(node);});
 assert.equal(covers.length,2);
 for(const cover of covers)for(const x of [-.12*.62,.12*.62]){
  const z=cover.getWorldPosition(new THREE.Vector3()).z;
  const ray=new THREE.Raycaster(new THREE.Vector3(x,-.12*.64,z-.1),new THREE.Vector3(0,0,1));
  assert.equal(ray.intersectObject(cover).length,0,'the ceramic feedthrough passes through a bore');
  ray.ray.origin.x+=.02;assert.ok(ray.intersectObject(cover).length>0,'metal surrounds the bore');
 }
});

test('the live assembly contains hardware only, including when an older asset contains room context',()=>{
 const older=template.scene.clone(true),context=new THREE.Group();
 context.userData={viewContext:true,nonPickable:true};
 for(const name of ['Workbench_top','Laboratory_floor']){const mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());mesh.name=name;context.add(mesh);}
 older.add(context);
 for(const radiusM of [.08,.3])for(const lengthM of [.3,1.8]){
  const c={...defaults,radiusM,lengthM},r=simulateFuelCentrifuge(c),built=buildFuelCentrifugeGeometry({config:c,result:r,assembly:older,diagnostics:true});
  built.scene.traverse(node=>{
   assert.equal(node.userData.viewContext,undefined,'Do not attach laboratory context to the live scene.');
   assert.doesNotMatch(node.name,/Workbench|Bench leg|Bench rail|Lower shelf|Leveling foot|Laboratory floor/i);
  });
  assert.equal(built.scene.userData.authoredAssembly.modules,9);
  assert.ok(built.scene.getObjectByName('Support bed'),'Keep the apparatus support bed.');
  assert.ok(built.scene.getObjectByName('Vessel pressure wall'));
  built.tools.dispose();release(built.scene);
 }
 assert.equal(context.parent,older,'Keep the cached template intact.');
 assert.equal(context.children.length,2);release(context);
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
 const ids=new Set<unknown>();for(const b of builds){
  const owned=new Set<THREE.BufferGeometry>();b.scene.traverse((n:any)=>{if(n.isMesh)owned.add(n.geometry);});
  for(const geometry of owned){assert.ok(!ids.has(geometry),'separate apparatus instances own separate geometry');ids.add(geometry);}
  b.tools.dispose();release(b.scene);
 }
});

test('authored repeated shapes share owned geometry without sharing the template or another apparatus',()=>{
 const result=simulateFuelCentrifuge(defaults),a=buildFuelCentrifugeGeometry({config:defaults,result,assembly:template.scene,diagnostics:true}),b=buildFuelCentrifugeGeometry({config:defaults,result,assembly:template.scene,diagnostics:true});
 const turns=(root:THREE.Object3D)=>{const values:THREE.Mesh[]=[];root.traverse(node=>{if(node instanceof THREE.Mesh&&node.userData.renderName==='Copper solenoid turn')values.push(node);});return values;};
 const source=turns(template.scene),first=turns(a.scene),second=turns(b.scene);
 assert.equal(first.length,28);assert.equal(second.length,28);
 for(const part of first)assert.equal(part.geometry,first[0].geometry);
 assert.notEqual(first[0].geometry,source[0].geometry);assert.notEqual(first[0].geometry,second[0].geometry);
 assert.notEqual(first[0].material,source[0].material);assert.notEqual(first[0].material,second[0].material,'each apparatus owns its finish and clipping materials');
 let disposed=0,templateDisposed=0,comparisonDisposed=0;
 first[0].geometry.addEventListener('dispose',()=>disposed++);source[0].geometry.addEventListener('dispose',()=>templateDisposed++);second[0].geometry.addEventListener('dispose',()=>comparisonDisposed++);
 a.tools.dispose();release(a.scene);assert.equal(disposed,1);assert.equal(templateDisposed,0);assert.equal(comparisonDisposed,0);
 b.tools.dispose();release(b.scene);assert.equal(comparisonDisposed,1);assert.equal(templateDisposed,0);
});

test('cutaway presentation and drive controls leave accepted physics untouched and dispose overlay resources',()=>{
 const result=simulateFuelCentrifuge(defaults),before=JSON.stringify(result),built=buildFuelCentrifugeGeometry({config:result.config,result,assembly:template.scene,diagnostics:true});
 const dom=new JSDOM('<main></main>'),host=dom.window.document.querySelector('main')!;let changes=0;
 const view=createFuelViewTools({document:dom.window.document,host,onChange:()=>{changes++;view.apply(built.tools);}});view.apply(built.tools);
 assert.equal(view.state.cutaway,.62);assert.equal(view.state.drive,'all');assert.equal(view.state.ghost,true);assert.equal(built.tools.group.visible,true);
 const wall=built.scene.getObjectByName('Vessel_pressure_wall')??built.scene.getObjectByName('Vessel pressure wall');
 assert.equal((wall as THREE.Mesh).material.clippingPlanes.length,1);
 const input=host.querySelector('#fuel-view-drive') as HTMLSelectElement;input.value='force';input.dispatchEvent(new dom.window.Event('change'));assert.equal(changes,1);
 assert.match(host.querySelector('.fuel-drive-legend')!.textContent!,/B and radial current are specified inputs/);assert.equal(built.tools.drive.group.getObjectByName('B').visible,false);
 assert.equal(JSON.stringify(result),before);
 let disposed=0;built.tools.drive.group.traverse((o:any)=>{o.geometry?.addEventListener('dispose',()=>disposed++);});built.tools.dispose();assert.ok(disposed>0);const n=disposed;built.tools.dispose();assert.equal(disposed,n);release(built.scene);dom.window.close();
 const scene=new THREE.Group();assert.throws(()=>attachFuelAssembly(scene,new THREE.Group(),defaults),/Incomplete/);
});

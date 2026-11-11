import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

async function apparatus(mode:string){
 const bytes=readFileSync(new URL(`../web-assets/models/${mode}.glb`,import.meta.url));
 const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 scene.updateWorldMatrix(true,true);
 return scene;
}
function meshBounds(scene:THREE.Object3D,name:RegExp){
 const nodes:THREE.Object3D[]=[];
 scene.traverse(node=>{if((node as THREE.Mesh).isMesh&&name.test(node.name))nodes.push(node);});
 assert.equal(nodes.length,1,`expected one ${name} mesh`);
 return new THREE.Box3().setFromObject(nodes[0]);
}
function meshNodes(scene:THREE.Object3D,name:RegExp){
 const nodes:THREE.Mesh[]=[];
 scene.traverse(node=>{if((node as THREE.Mesh).isMesh&&name.test(node.name))nodes.push(node as THREE.Mesh);});
 assert.ok(nodes.length>0,`expected ${name} meshes`);return nodes;
}
function dispose(scene:THREE.Object3D){
 scene.traverse(node=>{
  const mesh=node as THREE.Mesh;if(!mesh.isMesh)return;
  mesh.geometry.dispose();for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])material.dispose();
 });
}
const tolerance=1e-5;
test('LiT layer contacts its cooled backing and fits on the exposed backing face',async t=>{
 const scene=await apparatus('beam-target');t.after(()=>dispose(scene));
 const target=meshBounds(scene,/^LiT_layer/),backing=meshBounds(scene,/^Cooled_substrate$/);
 assert.ok(Math.abs(target.max.x-backing.min.x)<tolerance,'target rear face must contact backing front face');
 assert.ok(target.min.x<backing.min.x,'target must face the incident beam');
 for(const axis of ['y','z'] as const){
  assert.ok(target.min[axis]>=backing.min[axis]-tolerance);
  assert.ok(target.max[axis]<=backing.max[axis]+tolerance);
 }
});

test('curved-guide source outlet meets the entrance plane on its tangent centreline',async t=>{
 const scene=await apparatus('curved');t.after(()=>dispose(scene));
 const source=meshBounds(scene,/^Source_inlet$/),guide=meshBounds(scene,/^Bent_cutaway_channel$/);
 // Y-up export: the bend entrance is (-1.3,0,1), tangent to the X axis.
 assert.ok(Math.abs(source.max.x-guide.min.x)<tolerance,'source outlet must meet guide entrance');
 const center=source.getCenter(new THREE.Vector3());
 assert.ok(Math.abs(center.y)<tolerance);
 assert.ok(Math.abs(center.z-1)<tolerance);
});

test('beam-target cooling connections contact the backing and both pipe ends meet their connectors',async t=>{
 const scene=await apparatus('beam-target');t.after(()=>dispose(scene));
 const backing=meshBounds(scene,/^Cooled_substrate$/),connections=meshNodes(scene,/^Cooling_connection/);
 assert.equal(connections.length,4);
 const connectionBounds=connections.map(node=>new THREE.Box3().setFromObject(node));
 for(const bounds of connectionBounds)assert.ok(bounds.intersectsBox(backing),'cooling connector must contact backing');
 for(const [name,targetY] of [[/^Cooling_supply$/,-.39],[/^Cooling_return$/,.39]] as const){
  const connection=connectionBounds.find(bounds=>Math.abs(bounds.getCenter(new THREE.Vector3()).y-targetY)<tolerance);
  assert.ok(connection);const center=connection.getCenter(new THREE.Vector3());
  const pipe=meshNodes(scene,name)[0],position=pipe.geometry.getAttribute('position'),end=new THREE.Box3();
  for(let i=0;i<position.count;i++){
   const point=new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(pipe.matrixWorld);
   if(Math.abs(point.z-connection.max.z)<tolerance)end.expandByPoint(point);
  }
  assert.ok(!end.isEmpty(),'pipe must have an end ring on the connector outlet plane');
  const pipeCenter=end.getCenter(new THREE.Vector3());
  assert.ok(Math.abs(pipeCenter.x-center.x)<tolerance);
  assert.ok(Math.abs(pipeCenter.y-center.y)<tolerance);
 }
});

test('beam-target flange, mounting supports, standoffs and fasteners meet their mating surfaces',async t=>{
 const scene=await apparatus('beam-target');t.after(()=>dispose(scene));
 const base=meshBounds(scene,/^Vacuum_beamline_base$/),chamber=meshBounds(scene,/^Cutaway_source_chamber$/);
 const flange=meshBounds(scene,/^Source_flange$/),backing=meshBounds(scene,/^Cooled_substrate$/);
 assert.ok(Math.abs(flange.min.x-chamber.max.x)<tolerance,'source flange must seat on chamber end');
 for(const [name,supported] of [[/^Mounting_support_-_source$/,chamber],[/^Mounting_support_-_substrate$/,backing]] as const){
  const pad=meshBounds(scene,name);
  assert.ok(Math.abs(pad.min.y-base.max.y)<tolerance,'support must seat on base');
  assert.ok(Math.abs(pad.max.y-supported.min.y)<tolerance,'support must reach supported component');
 }
 for(const name of [/^Ceramic_high_voltage_standoff/,/^Base_fastener/]){
  for(const mesh of meshNodes(scene,name)){
   const bounds=new THREE.Box3().setFromObject(mesh);
   assert.ok(Math.abs(bounds.min.y-base.max.y)<tolerance,'mounting part must seat on base');
  }
 }
 // The upper wall is intentionally removed in the cutaway; the gas feed must
 // still occupy its chamber's axial span and cross the uncut wall radius.
 const feed=meshBounds(scene,/^Deuterium_gas_feed$/);
 assert.ok(feed.min.x>=chamber.min.x&&feed.max.x<=chamber.max.x);
 assert.ok(feed.min.y<Math.abs(chamber.min.y)&&feed.max.y>Math.abs(chamber.min.y));
});

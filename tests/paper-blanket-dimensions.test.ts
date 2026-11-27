import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const manifest=JSON.parse(readFileSync('web-assets/renders/manifest.json','utf8'));
test('Blender blanket has the published midplane build in actual SI vertex coordinates',async()=>{
 const bytes=readFileSync('web-assets/models/blanket.glb');
 assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.assets.blanket.modelSHA256);
 assert.equal(createHash('sha256').update(readFileSync(manifest.assets.blanket.geometryBuilder)).digest('hex'),manifest.assets.blanket.geometryBuilderSHA256);
 const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 scene.updateMatrixWorld(true);
 // Independent cardinal radii: R=4.2, a=1.2, W=.005, V=.010/.030,
 // channel=.210, derived FLiBe=.545/.795, tank=.030 (paper pp.12–14).
 const expected=[
  ['Tungsten armor',[2.995,3,5.4,5.405]],
  ['Inner V alloy',[2.985,2.995,5.405,5.415]],
  ['Hg–Li channel',[2.775,2.985,5.415,5.625]],
  ['Outer V alloy',[2.745,2.775,5.625,5.655]],
  ['FLiBe',[2.2,2.745,5.655,6.45]],
  ['Eurofer97 tank',[2.17,2.2,6.45,6.48]],
 ] as const;
 let checked=0;
 scene.traverse(node=>{
  if(!(node instanceof THREE.Mesh))return;
  const entry=expected.find(([name])=>node.name.startsWith(name.replaceAll(' ','_'))||node.name.startsWith(name));
  if(!entry){
   assert.ok(['plasma','tf-coils','pf-coils','cryostat','plant-supports','plant-services'].includes(node.userData.componentId),node.name);
   assert.match(node.userData.geometryBasis,/conceptual.*not as-built/i);
   node.geometry.dispose();for(const material of Array.isArray(node.material)?node.material:[node.material])material.dispose();
   return;
  }
  const position=node.geometry.getAttribute('position'),radii:number[]=[];
  for(let i=0;i<position.count;i++){
   const v=new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(node.matrixWorld);
   if(Math.abs(v.y)<1e-6){const radius=Math.hypot(v.x,v.z);if(!radii.some(r=>Math.abs(r-radius)<3e-6))radii.push(radius);}
  }
  radii.sort((a,b)=>a-b);assert.equal(radii.length,4,`${node.name} four midplane surfaces`);
  for(let i=0;i<4;i++)assert.ok(Math.abs(radii[i]-entry[1][i])<3e-6,`${node.name}: ${radii[i]} vs ${entry[1][i]}`);
  assert.match(node.userData.geometryBasis,/not as-built/i);assert.match(node.userData.geometryBasis,/assumptions/i);checked++;
  node.geometry.dispose();for(const material of Array.isArray(node.material)?node.material:[node.material])material.dispose();
 });
 assert.equal(checked,6,'all published layers are physically present, without exaggerated wall thickness');
});

test('dimension disclosures distinguish published models, inferred sizes and unknown hardware',()=>{
 const d=JSON.parse(readFileSync('web-assets/marathon-blanket-dimensions.json','utf8'));
 assert.deepEqual([d.majorRadiusM,d.minorRadiusM,d.elongation,d.triangularity],[4.2,1.2,1.6,.25]);
 assert.ok(Math.abs(d.inboardBreederM-(.750-(d.channelM-.005)))<1e-12);
 assert.ok(Math.abs(d.outboardBreederM-(1-(d.channelM-.005)))<1e-12);
 assert.equal(manifest.assets.blanket.geometryLabel,'Paper core · assumed hardware');
 assert.equal(manifest.assets.blanket.renderSettings.samples,24);assert.equal(manifest.assets.blanket.renderSettings.denoising,true);
 assert.ok(manifest.assets.blanket.renderSettings.viewTransform);
 assert.match(manifest.assets.blanket.caption,/unknown.*omitted/i);assert.match(manifest.assets.blanket.caption,/not built Marathon hardware/i);
 assert.match(manifest.assets['beam-target'].caption,/does not publish.*hardware dimensions/i);
 for(const [mode,asset]of Object.entries<any>(manifest.assets))assert.ok(asset.scaleLabel,`${mode} must identify scale provenance`);
});

// These are display counts, not an assertion about Marathon's magnet design.
test('reactor context has inspectable plasma, magnets, cryostat, supports and service interfaces',async()=>{
 const bytes=readFileSync('web-assets/models/blanket.glb');
 const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const counts=new Map<string,number>(),ids=new Set<string>();
 scene.traverse(node=>{
  if(!(node instanceof THREE.Mesh))return;
  ids.add(node.userData.componentId);
  const prefix=node.name.replace(/ /g,'_').replace(/_\d.*$/,'');counts.set(prefix,(counts.get(prefix)??0)+1);
  node.geometry.dispose();for(const material of Array.isArray(node.material)?node.material:[node.material])material.dispose();
 });
 for(const id of ['plasma','tf-coils','pf-coils','cryostat','plant-supports','plant-services'])assert.ok(ids.has(id),id);
 assert.equal(counts.get('TF_winding'),12);assert.equal(counts.get('Central_solenoid_module'),9);
 assert.deepEqual(manifest.assets.blanket.modelRegionComponentIds,[],'plasma now has actual pickable geometry');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {finishFuelHardware} from '../src/fuel-finishes.js';

function release(scene:THREE.Object3D){
 const resources=new Set<THREE.BufferGeometry|THREE.Material|THREE.Texture>();
 scene.traverse(node=>{if(!(node instanceof THREE.Mesh))return;resources.add(node.geometry);
  for(const material of [node.material].flat()){resources.add(material);for(const value of Object.values(material))if(value instanceof THREE.Texture)resources.add(value);}
 });
 for(const resource of resources)resource.dispose();
}
function collapsedPlateFaces(geometry:THREE.BufferGeometry){
 const index=geometry.getIndex()!,position=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');let count=0;
 for(let i=0;i<index.count;i+=3){
  const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);
  const triangle=new THREE.Triangle(new THREE.Vector3().fromBufferAttribute(position,a),new THREE.Vector3().fromBufferAttribute(position,b),new THREE.Vector3().fromBufferAttribute(position,c));
  if(triangle.getArea()===0)continue;
  const area=(uv.getX(b)-uv.getX(a))*(uv.getY(c)-uv.getY(a))-(uv.getY(b)-uv.getY(a))*(uv.getX(c)-uv.getX(a));
  if(area===0)count++;
 }
 return count;
}

test('generated finish repairs collapsed UVs on the actual retaining plates without changing their shape',async()=>{
 const bytes=readFileSync('web-assets/models/centrifuge-assembly.glb');
 const {scene}=await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer,'');
 const plates:THREE.Mesh[]=[];
 scene.traverse(node=>{if(node instanceof THREE.Mesh&&node.userData.renderName==='End retaining plate')plates.push(node);});
 assert.equal(plates.length,2);
 const before=plates.map(({geometry})=>({position:geometry.getAttribute('position'),normal:geometry.getAttribute('normal'),index:geometry.getIndex(),uv:geometry.getAttribute('uv'),collapsed:collapsedPlateFaces(geometry)}));
 try{
  finishFuelHardware(scene);
  for(const [i,plate]of plates.entries()){
   const geometry=plate.geometry,material=plate.material as THREE.MeshPhysicalMaterial;
   assert.equal(collapsedPlateFaces(geometry),0,'plate faces need a usable tangent frame for the added finish');
   assert.equal(geometry.getAttribute('position'),before[i].position);
   assert.equal(geometry.getAttribute('normal'),before[i].normal);assert.equal(geometry.getIndex(),before[i].index);
   if(before[i].collapsed)assert.notEqual(geometry.getAttribute('uv'),before[i].uv);
   else assert.equal(geometry.getAttribute('uv'),before[i].uv,'keep valid authored mappings');
   assert.ok(material.normalMap&&material.roughnessMap&&material.anisotropy>0,'retain the generated finish');
  }
 }finally{release(scene);}
});

test('generated finish preserves valid shared UVs and accepts nonindexed geometry',()=>{
 const scene=new THREE.Group(),geometry=new THREE.PlaneGeometry(2,1).toNonIndexed(),uv=geometry.getAttribute('uv');
 const material=new THREE.MeshStandardMaterial();material.name='Stainless steel';
 scene.add(new THREE.Mesh(geometry,material),new THREE.Mesh(geometry,material));
 try{finishFuelHardware(scene);assert.equal(geometry.getAttribute('uv'),uv);}
 finally{release(scene);}
});

test('zero-area spatial triangles do not require a texture tangent frame',()=>{
 const scene=new THREE.Group(),geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,2,0,0],3));
 geometry.setAttribute('normal',new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1],3));
 const uv=new THREE.Float32BufferAttribute([0,0,0,0,0,0],2);geometry.setAttribute('uv',uv);
 const material=new THREE.MeshStandardMaterial();material.name='Stainless steel';scene.add(new THREE.Mesh(geometry,material));
 try{finishFuelHardware(scene);assert.equal(geometry.getAttribute('uv'),uv);}
 finally{release(scene);}
});

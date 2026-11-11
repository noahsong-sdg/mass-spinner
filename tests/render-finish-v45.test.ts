import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildEngineeringGeometry,machinedMetal} from '../src/engineering-geometry.js';

test('machined optics use UV-compatible physical metal and deterministic non-color roughness',()=>{
 const a=machinedMetal(0x8b969b),b=machinedMetal(0x8b969b);
 assert.equal(a.isMeshPhysicalMaterial,true);assert.equal(a.metalness,1);assert.ok(a.anisotropy>0);
 assert.equal(a.roughnessMap!.colorSpace,THREE.NoColorSpace);assert.deepEqual(a.roughnessMap!.image.data,b.roughnessMap!.image.data);
 assert.ok(new Set(a.roughnessMap!.image.data).size>2);
 for(const material of [a,b]){material.roughnessMap!.dispose();material.dispose();}
});

test('machined shell has hard axial normals, cylindrical normals, chamfers and continuous UVs without rescaling',()=>{
 const built=buildEngineeringGeometry({mode:'centrifuge',radiusM:.12,lengthM:.8});
 const wall=built.group.getObjectByName('Vessel pressure wall') as THREE.Mesh;
 const g=wall.geometry,p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv');
 assert.equal(uv.count,p.count);const bounds=new THREE.Box3().setFromObject(wall);
 assert.ok(Math.abs(bounds.min.z)<1e-7);assert.ok(Math.abs(bounds.max.z-.8)<1e-7);
 let planar=0,curved=0,chamfer=0;
 for(let i=0;i<n.count;i++){
  const z=Math.abs(n.getZ(i));assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<1e-6);
  if(z>.999)planar++;else if(z<.001)curved++;else chamfer++;
  assert.ok(Number.isFinite(uv.getX(i))&&Number.isFinite(uv.getY(i)));
 }
 assert.ok(planar&&curved&&chamfer);
 let released=0;const maps=new Set<THREE.Texture>();built.group.traverse((node:any)=>{if(node.material?.roughnessMap)maps.add(node.material.roughnessMap);});
 for(const map of maps)map.addEventListener('dispose',()=>released++);
 built.dispose();assert.equal(released,maps.size,'disposing the assembly releases its finish textures once');
});

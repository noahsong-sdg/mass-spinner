import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {fuelGasCell} from '../src/fuel-gas-cell.js';
import cell from '../web-assets/models/gas-cell.json' with {type:'json'};

test('Blender cutaway cells retain SI boundaries, outward winding and annular volume under remapping',()=>{
 for(const side of [-1,1])for(const [inner,outer,length] of [[0,.12,.8],[.119,.12,.2],[.03,.07,1.7]]){
  const geometry=fuelGasCell(inner,outer,length,side),p=geometry.getAttribute('position'),index=geometry.getIndex()!;
  let volume=0;
  for(let i=0;i<p.count;i++){
   const r=Math.hypot(p.getX(i),p.getY(i));
   assert.ok(Math.min(Math.abs(r-inner),Math.abs(r-outer))<2e-8);
   assert.ok(side*p.getX(i)>=-1e-8&&p.getY(i)<=1e-8);
   assert.ok(Math.min(Math.abs(p.getZ(i)),Math.abs(p.getZ(i)-length))<1e-7);
  }
  for(const value of geometry.getAttribute('normal').array)assert.ok(Number.isFinite(value));
  for(let i=0;i<index.count;i+=3){
   const a=new THREE.Vector3().fromBufferAttribute(p,index.getX(i));
   const b=new THREE.Vector3().fromBufferAttribute(p,index.getX(i+1));
   const c=new THREE.Vector3().fromBufferAttribute(p,index.getX(i+2));
   volume+=a.dot(b.cross(c))/6;
  }
  const analytic=Math.PI*(outer**2-inner**2)*length/4;
  assert.ok(volume>0,'both mirrored halves have outward normals');
  assert.ok(Math.abs(volume/analytic-1)<.0005,'bounded chord error, even in a thin wall cell');
  geometry.dispose();
 }
});

test('live topology is the exported Blender mesh, not an unrelated procedural approximation',async()=>{
 const buffer=readFileSync('web-assets/models/gas-cell.glb');
 const model=await new GLTFLoader().parseAsync(Uint8Array.from(buffer).buffer,'');
 let triangles=0;const actual=new Set<string>();
 const key=(x:number,y:number,z:number)=>[x,y,z].map(v=>v.toFixed(6)).join(',');
 model.scene.traverse(node=>{
  if(!(node instanceof THREE.Mesh))return;
  const p=node.geometry.getAttribute('position');triangles+=(node.geometry.getIndex()?.count??p.count)/3;
  for(let i=0;i<p.count;i++)actual.add(key(p.getX(i),p.getY(i),p.getZ(i)));
  node.geometry.dispose();
  for(const material of Array.isArray(node.material)?node.material:[node.material])material.dispose();
 });
 const expected=new Set<string>();
 for(let i=0;i<cell.positions.length;i+=3)expected.add(key(cell.positions[i],cell.positions[i+1],cell.positions[i+2]));
 assert.equal(cell.generator,'blender/build_gas_domain.py');assert.deepEqual(actual,expected);
 assert.equal(triangles,cell.indices.length/3);
});

test('particle cutaway retains only the Blender longitudinal face at exact radial cell edges',()=>{
 for(const side of [-1,1])for(const [inner,outer,length] of [[0,.12,.8],[.119,.12,.2],[.03,.07,1.7]]){
  const geometry=fuelGasCell(inner,outer,length,side,true),p=geometry.getAttribute('position'),index=geometry.getIndex()!;
  assert.equal(index.count,6);let area=0;
  for(let i=0;i<index.count;i+=3){
   const vertices=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,index.getX(i+j)));
   for(const v of vertices){assert.ok(Math.abs(v.y)<1e-12);assert.ok(Math.min(Math.abs(Math.abs(v.x)-inner),Math.abs(Math.abs(v.x)-outer))<2e-8);}
   area+=vertices[1].sub(vertices[0]).cross(vertices[2].sub(vertices[0])).length()/2;
  }
  assert.ok(Math.abs(area-(outer-inner)*length)<2e-8);geometry.dispose();
 }
});

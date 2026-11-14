import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fitLaurelinCamera} from '../src/laurelin-camera.js';
import {buildLaurelinAssembly} from '../src/laurelin-scene.js';
import {simulateLaurelin} from '../src/laurelin-physics.js';

test('bounds fit inside tools/timeline clearance on desktop, narrow and portrait viewports',()=>{
 const model=buildLaurelinAssembly(),r=simulateLaurelin();model.update(r.samples[0],r.config);
 const bounds=new THREE.Box3().setFromObject(model.assembly);
 for(const [width,height]of [[1440,840],[756,774],[390,790],[390,460]]){
  const view=fitLaurelinCamera(bounds,width,height),camera=new THREE.PerspectiveCamera(38,width/height,.05,100);
  camera.up.copy(view.up);camera.position.copy(view.position);camera.lookAt(view.target);
  camera.setViewOffset(width,height,0,view.offsetY,width,height);camera.updateMatrixWorld();
  const xs:number[]=[],ys:number[]=[];
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
   const p=new THREE.Vector3(x,y,z).project(camera),px=(p.x+1)*width/2,py=(1-p.y)*height/2;
   assert.ok(px>=view.padding.side&&px<=width-view.padding.side,`${width}x${height}: horizontal clip ${px}`);
   assert.ok(py>=view.padding.top&&py<=height-view.padding.bottom,`${width}x${height}: vertical clip ${py}`);
   assert.ok(p.z>-1&&p.z<1);xs.push(px);ys.push(py);
  }
  const fraction=Math.max((Math.max(...xs)-Math.min(...xs))/(width-2*view.padding.side),
   (Math.max(...ys)-Math.min(...ys))/(height-view.padding.top-view.padding.bottom));
  assert.ok(fraction>.7,`assembly needlessly small at ${width}x${height}`);
  assert.ok(view.target.distanceTo(bounds.getCenter(new THREE.Vector3()))<1e-12);
 }
});
test('fitting preserves a supplied OrbitControls up basis across aspect changes',()=>{
 const bounds=new THREE.Box3(new THREE.Vector3(-4,-2,-1),new THREE.Vector3(5,1,2)),up=new THREE.Vector3(1,0,0);
 assert.deepEqual(fitLaurelinCamera(bounds,1400,800,38,up).up.toArray(),up.toArray());
 assert.throws(()=>fitLaurelinCamera(bounds,390,0),RangeError);
 assert.throws(()=>fitLaurelinCamera(bounds,0,800),RangeError);
 assert.throws(()=>fitLaurelinCamera(new THREE.Box3(),390,800),RangeError);
});
test('the open vessel sector faces the initial viewing direction',()=>{
 const model=buildLaurelinAssembly();model.assembly.updateMatrixWorld(true);
 const shell=model.picks.find(p=>p.geometry.type==='CylinderGeometry');assert.ok(shell);
 const ray=new THREE.Raycaster(new THREE.Vector3(7,4.2,8).normalize().multiplyScalar(15),new THREE.Vector3(-7,-4.2,-8).normalize());
 // A center ray through the cutaway must not encounter the near-side shell.
 const hits=ray.intersectObject(shell,false);assert.ok(hits.every(hit=>hit.point.dot(ray.ray.origin)<0));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import asset from '../web-assets/models/gas-markers.json' with {type:'json'};
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {simulateFuelTransport,sampleFuelTransport} from '../src/fuel-transport.js';
import {createFuelMotion} from '../src/fuel-motion.js';

test('runtime marker topology is the Blender export, including closed sphere and hollow ion shape',async()=>{
 const bytes=readFileSync('web-assets/models/gas-markers.glb');
 const model=await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer,'');
 assert.equal(model.animations.length,0,'fixed animation must not supersede live physics');
 const key=(p:THREE.BufferAttribute|THREE.InterleavedBufferAttribute,i:number)=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(6)).join(',');
 let meshes=0;
 model.scene.traverse(node=>{
  if(!(node instanceof THREE.Mesh))return;meshes++;
  const source=asset.markers[node.name==='Ion_sample'?'ion':'neutral'];
  const expected=new THREE.Float32BufferAttribute(source.positions,3),actual=node.geometry.getAttribute('position');
  assert.deepEqual(new Set(Array.from({length:actual.count},(_,i)=>key(actual,i))),new Set(Array.from({length:expected.count},(_,i)=>key(expected,i))));
  assert.equal(node.geometry.getIndex()!.count,source.indices.length);
  node.geometry.dispose();for(const material of [node.material].flat())material.dispose();
 });
 assert.equal(meshes,2);assert.match(asset.blender,/^5\.2\.4/);
 const ion=asset.markers.ion.positions,neutral=asset.markers.neutral.positions;
 const minRadius=(p:number[])=>Math.min(...Array.from({length:p.length/3},(_,i)=>Math.hypot(p[3*i],p[3*i+1])));
 assert.ok(minRadius(ion)>.5,'ion torus retains a visible bore');assert.ok(minRadius(neutral)<1e-6,'neutral sphere has poles');
});

test('rendered instance centres follow accepted shell inventories and angular phases through seek and rewind',()=>{
 const rotor=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA:.06,lightFraction:.5});
 const result={...rotor,transport:simulateFuelTransport(rotor,{cells:32,steps:128})},motion=createFuelMotion(result),R=result.config.radiusM;
 const before=JSON.stringify(result),matrix=new THREE.Matrix4();
 try{
  for(const time of [.1,.7,0,.3])for(const mode of ['spin','transport'] as const){
   motion.update(time,mode);motion.group.updateMatrixWorld(true);const sample=sampleFuelTransport(result.transport,time);
   for(const cloud of motion.group.children.filter(node=>node.userData.tracers)){
    const mesh=cloud.children[0] as THREE.InstancedMesh;
    const positions=mesh.geometry.getAttribute('samplePosition');
    assert.equal(mesh.count,positions.count);
    for(let i=0;i<mesh.count;i+=17){
     mesh.getMatrixAt(i,matrix);const local=new THREE.Vector3().setFromMatrixPosition(matrix);
     assert.ok(local.distanceTo(new THREE.Vector3().fromBufferAttribute(positions,i))<1e-7);
     if(!cloud.userData.ion){
      const mass=cloud.userData.species?sample.heavyMass:sample.lightMass,y=(local.x**2+local.y**2)/R**2;
      const probability=mass.reduce((sum,m,j)=>sum+m*Math.max(0,Math.min(1,y*mass.length-j)),0);
      assert.ok(Math.abs(probability-(i+.5)/mesh.count)<3e-6,'rendered centres, not just CPU arrays, invert accepted inventories');
     }
     assert.ok(local.z>=0&&local.z<=result.config.lengthM,'no invented axial flow');
    }
    const phase=cloud.userData.ion?sample.ionPhaseRad:sample.neutralPhaseRad;
    assert.equal(cloud.rotation.z,mode==='spin'?phase%(2*Math.PI):0);
    const trail=cloud.children[1] as THREE.LineSegments;
    assert.equal(trail.visible,mode==='spin'&&time>0);
    if(trail.visible){
     const p=trail.geometry.getAttribute('position'),past=sampleFuelTransport(result.transport,time-(trail.userData.exposureS as number));
     const pastPhase=cloud.userData.ion?past.ionPhaseRad:past.neutralPhaseRad;
     const angle=Math.atan2(positions.getY(0),positions.getX(0))+pastPhase-phase;
     const expectedDirection=new THREE.Vector2(Math.cos(angle),Math.sin(angle));
     assert.ok(new THREE.Vector2(p.getX(0),p.getY(0)).normalize().distanceTo(expectedDirection)<3e-6,'trail integrates accepted phase, rather than endpoint speed × exposure');
     assert.ok(new THREE.Vector3(p.getX(15),p.getY(15),p.getZ(15)).distanceTo(new THREE.Vector3().fromBufferAttribute(positions,0))<1e-7,'curved trace ends at its rendered marker');
     if(!cloud.userData.ion){
      const mass=cloud.userData.species?past.heavyMass:past.lightMass,y=(p.getX(0)**2+p.getY(0)**2)/R**2;
      const probability=mass.reduce((sum,m,j)=>sum+m*Math.max(0,Math.min(1,y*mass.length-j)),0);
      assert.ok(Math.abs(probability-.5/mesh.count)<3e-6,'trace uses historical radial inventory as well as historical phase');
     }
    }
   }
  }
  assert.equal(JSON.stringify(result),before);
 }finally{motion.group.traverse(node=>{
  if(node instanceof THREE.InstancedMesh)node.dispose();
  if(node instanceof THREE.Mesh||node instanceof THREE.Points||node instanceof THREE.Line){node.geometry.dispose();for(const material of [node.material].flat())material.dispose();}
 });}
});

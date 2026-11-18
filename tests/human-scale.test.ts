import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHumanScale,HUMAN_HEIGHT_M,placeHumanScale} from '../src/human-scale.js';

test('scale person is exactly 69 inches tall in metres, with feet at zero',()=>{
 const person=createHumanScale(),box=new THREE.Box3().setFromObject(person);
 assert.equal(HUMAN_HEIGHT_M,1.7526);assert.equal(box.min.y,0);assert.ok(Math.abs(box.max.y-HUMAN_HEIGHT_M)<1e-12);
 assert.equal(person.userData.nonPickable,true);assert.equal(person.userData.heightM,HUMAN_HEIGHT_M);
 assert.ok(box.getSize(new THREE.Vector3()).x<.8);
});

for(const dimension of [.00001,.24,20])for(const accepted of [false,true])test(`person stays human-sized beside ${dimension} m ${accepted?'Z-up':'Y-up'} geometry`,()=>{
 const person=createHumanScale(),bounds=new THREE.Box3(new THREE.Vector3(-dimension,-dimension,-dimension),new THREE.Vector3(dimension,dimension,dimension));
 const up=accepted?new THREE.Vector3(0,0,-1):new THREE.Vector3(0,1,0),direction=accepted?new THREE.Vector3(0,1,-.2):new THREE.Vector3(0,1,.65);
 placeHumanScale(person,bounds,up,direction);
 const actual=new THREE.Box3().setFromObject(person),size=actual.getSize(new THREE.Vector3());
 assert.ok(Math.abs((accepted?size.z:size.y)-HUMAN_HEIGHT_M)<1e-10);
 assert.ok(actual.max.x<bounds.min.x,'person stands alongside, not intersecting apparatus');
 assert.ok(Math.abs((accepted?-actual.max.z:actual.min.y)+dimension)<1e-10,'same floor plane');
 assert.deepEqual(person.scale.toArray(),[1,1,1],'apparatus dimensions never scale the person');
});

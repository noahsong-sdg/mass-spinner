import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {createFuelSceneTools,visibleFuelHit} from '../src/fuel-scene-tools.js';

test('chamber cutaway opens the coil covers without changing electrodes, shared originals or physics',()=>{
 const result=simulateFuelCentrifuge(DEFAULT_FUEL_CENTRIFUGE),before=JSON.stringify(result),scene=new THREE.Group();
 scene.rotation.y=Math.PI/2;scene.position.x=-result.config.lengthM/2;
 const original=new THREE.MeshStandardMaterial({color:0xb87742});
 const make=(id:string)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1),original);mesh.userData.componentId=id;scene.add(mesh);return mesh;};
 const a=make('coils'),b=make('coils'),electrode=make('electrodes');
 const tools=createFuelSceneTools({scene,result}),cover=a.material;
 assert.notEqual(cover,original);assert.equal(a.material,b.material,'shared source material needs only one owned clipping clone');
 assert.equal(electrode.material,original);
 let released=0;cover.addEventListener('dispose',()=>released++);
 const point=()=>scene.localToWorld(new THREE.Vector3(0,result.config.radiusM,.4));
 tools.setStaging({cutaway:.62,ghost:true});
 assert.equal(cover.clippingPlanes!.length,1);assert.equal(cover.opacity,1,'coils retain their physical material shading');
 assert.equal(visibleFuelHit({object:a,point:point()}),false);assert.equal(visibleFuelHit({object:electrode,point:point()}),true);
 assert.equal(original.clippingPlanes,null);assert.equal(original.opacity,1);
 tools.setStaging({cutaway:0});assert.equal(cover.clippingPlanes,null);assert.equal(visibleFuelHit({object:a,point:point()}),true);
 assert.equal(JSON.stringify(result),before);tools.dispose();tools.dispose();
 assert.equal(a.material,original);assert.equal(b.material,original);assert.equal(released,1);
 for(const mesh of [a,b,electrode])mesh.geometry.dispose();original.dispose();
});

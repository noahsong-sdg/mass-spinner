import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {simulateFuelTransport} from '../src/fuel-transport.js';
import {sampleFuelField} from '../src/fuel-field.js';
import {createFuelBurst} from '../src/fuel-burst.js';
import {DEFAULT_FUEL_FAILURE,firstFuelFailure,fuelFailureLoad} from '../src/fuel-failure.js';

const reference=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,durationS:.05});
const result={...reference,transport:simulateFuelTransport(reference,{cells:32,steps:32})};

test('load assessment matches the existing field diagnostic and uses the first retained state',()=>{
 const first=fuelFailureLoad(result,result.transport.snapshots[0]).pressurePa,last=fuelFailureLoad(result,result.transport.snapshots.at(-1)!).pressurePa;
 const threshold=(first+last)/2,limits={...DEFAULT_FUEL_FAILURE,pressurePa:threshold};
 for(const state of result.transport.snapshots){
  const load=fuelFailureLoad(result,state),field=sampleFuelField(result,result.config.radiusM,state);
  assert.ok(Math.abs(load.pressurePa-field.pressurePa)<1e-10);
 }
 const expected=result.transport.snapshots.find(s=>fuelFailureLoad(result,s).pressurePa>limits.pressurePa);
 const event=firstFuelFailure(result,limits);
 assert.ok(expected);assert.equal(event?.timeS,expected.timeS);
 assert.equal(event?.linerK,result.config.linerK);assert.deepEqual(event?.causes,['pressure']);
 limits.pressurePa=100;assert.equal(event?.limits.pressurePa,threshold,'Keep the event assumptions independent of later edits.');
 assert.equal(firstFuelFailure(result,{...DEFAULT_FUEL_FAILURE,pressurePa:1e6}),null);
 assert.equal(firstFuelFailure(reference,DEFAULT_FUEL_FAILURE),null,'No trajectory means no equipment failure assessment.');
});

test('outside pressure does not cause an outward burst; equality does not exceed a limit',()=>{
 const load=fuelFailureLoad(result,result.transport.snapshots[0]);
 const initial={...result,transport:{...result.transport,snapshots:[result.transport.snapshots[0]]}};
 assert.equal(firstFuelFailure(initial,{...DEFAULT_FUEL_FAILURE,pressurePa:load.pressurePa}),null);
 assert.equal(firstFuelFailure(result,{...DEFAULT_FUEL_FAILURE,externalPa:1e6,pressurePa:1}),null);
});

test('thermal failure uses the hottest liner cell, never the gas temperature or tungsten melting',()=>{
 const state=structuredClone(result.transport.snapshots[0]);
 state.thermal={gasK:5000,linerK:900,spatial:{maxK:1200},gas:{pressurePa:[10,20]}} as typeof state.thermal;
 state.lightMass=[.5,.5];state.heavyMass=[.5,.5];
 const hot={...result,transport:{...result.transport,snapshots:[state]}};
 assert.equal(fuelFailureLoad(hot,state).pressurePa,20);
 assert.equal(firstFuelFailure(hot,{...DEFAULT_FUEL_FAILURE,linerK:1200}),null);
 const event=firstFuelFailure(hot,{...DEFAULT_FUEL_FAILURE,linerK:1100});
 assert.deepEqual(event?.causes,['temperature']);assert.equal(event?.linerK,1200);
 delete state.thermal;
 const other={...hot,config:{...hot.config,pair:'dt' as const,gasK:5000}};
 assert.equal(fuelFailureLoad(other,state).linerK,null);
 assert.equal(firstFuelFailure(other,{...DEFAULT_FUEL_FAILURE,linerK:300}),null);
});

test('invalid limits and nonfinite accepted loads are errors, not explosion events',()=>{
 for(const limits of [{pressurePa:0},{externalPa:-1},{linerK:299},{linerK:1901},{pressurePa:NaN},{externalPa:Infinity}])
  assert.throws(()=>firstFuelFailure(result,{...DEFAULT_FUEL_FAILURE,...limits}),RangeError);
 const broken=structuredClone(result);
 broken.transport.snapshots[0].lightMass[31]=NaN;
 assert.throws(()=>firstFuelFailure(broken,DEFAULT_FUEL_FAILURE),/finite accepted/);
});

test('burst keeps authored orientations, shares geometry, removes diagnostic clipping and restores prior visibility',()=>{
 const scene=new THREE.Group(),construction=new THREE.Group(),part=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());
 construction.name='construction';part.rotation.set(.2,.4,.6);part.position.set(.1,.2,.3);construction.add(part);scene.add(construction);
 const hidden=new THREE.Group();hidden.visible=false;scene.add(hidden);
 const material=part.material as THREE.Material;material.clippingPlanes=[new THREE.Plane(new THREE.Vector3(1,0,0),0)];
 let originalDisposed=false,copyDisposed=false;material.addEventListener('dispose',()=>{originalDisposed=true;});
 const burst=createFuelBurst(scene,{radiusM:.12,lengthM:.8});
 assert.equal(burst.group.children.length,1,'Do not duplicate the assembly before a failure.');
 burst.update(0);const copy=burst.group.children[1].children[0] as THREE.Mesh;
 assert.deepEqual(copy.quaternion.toArray(),part.quaternion.toArray());assert.equal(copy.geometry,part.geometry);assert.notEqual(copy.material,part.material);
 assert.equal((copy.material as THREE.Material).clippingPlanes,null);assert.equal(material.clippingPlanes.length,1);
 (copy.material as THREE.Material).addEventListener('dispose',()=>{copyDisposed=true;});
 assert.equal(construction.visible,false);assert.equal(burst.group.visible,true);
 burst.update(1.6);assert.ok(copy.position.distanceTo(part.position)>.05);assert.ok(copy.position.distanceTo(part.position)<.15,'Keep display motion close to the assembly.');
 burst.update(null);assert.equal(construction.visible,true);assert.equal(hidden.visible,false);assert.equal(burst.group.visible,false);
 assert.deepEqual(copy.position.toArray(),part.position.toArray(),'Hidden burst parts must not enlarge the camera bounds after rewind.');
 burst.update(0);assert.deepEqual(copy.position.toArray(),part.position.toArray());assert.deepEqual(copy.quaternion.toArray(),part.quaternion.toArray());
 burst.dispose();assert.equal(construction.visible,true);assert.equal(scene.children.includes(burst.group),false);
 assert.equal(copyDisposed,true);assert.equal(originalDisposed,false,'Burst disposal must keep the intact materials usable.');
 part.geometry.dispose();(part.material as THREE.Material).dispose();
});

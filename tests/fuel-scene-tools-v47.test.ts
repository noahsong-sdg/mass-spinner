import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {DEFAULT_FUEL_CENTRIFUGE as defaults,simulateFuelCentrifuge} from '../src/fuel-centrifuge.ts';
import {createFuelSceneTools,sampleFuelField,visibleFuelHit,FUEL_COMPONENT_CONTROLS} from '../src/fuel-scene-tools.js';

const close=(a:number,b:number,tol=1e-10)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} ≠ ${b}`);
function fixture(){
 const result=simulateFuelCentrifuge({...defaults,currentA:0}),scene=new THREE.Group();scene.rotation.y=Math.PI/2;scene.position.x=-result.config.lengthM/2;
 const material=new THREE.MeshStandardMaterial({color:0x777777});
 const shell=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material);shell.name='Vessel pressure wall';scene.add(shell);
 const coil=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material);coil.name='Copper solenoid turn';coil.userData.componentId='coils';coil.position.z=.1;scene.add(coil);
 const controls:any[]=[];const tools=createFuelSceneTools({scene,result,onControl:(...args:any[])=>controls.push(args)});
 return {result,scene,shell,coil,material,controls,tools};
}

test('diagnostic samples conserve the meaning of accepted densities and bulk velocity',()=>{
 const {tools,result}=fixture(),c=result.config,n=c.pressurePa/(1.380649e-23*c.gasK);
 const profiles=[{radiusM:0,lightDensityRatio:.5,heavyDensityRatio:1.5},{radiusM:c.radiusM,lightDensityRatio:1.5,heavyDensityRatio:.5}];
 tools.update({profiles,neutralRadS:20,timeS:3,scope:'Transient transport'});
 const s=tools.sampleAt(c.radiusM/4),weighted=c.lightFraction*.75+(1-c.lightFraction)*1.25;
 close(s.densityM3,n*weighted);close(s.lightFraction!,c.lightFraction*.75/weighted);close(s.speedMS,20*c.radiusM/4);assert.equal(s.scope,'Transient transport');assert.equal(s.timeS,3);assert.equal(s.axialUniform,true);
 tools.setLayer('density');assert.equal(tools.legend.unit,'m⁻³');tools.setDomains({density:[0,2*n]});tools.update({profiles,neutralRadS:0,timeS:0});assert.deepEqual(tools.legend.domain,[0,2*n]);tools.dispose();
});

test('slice follows accepted SI transform without changing physical profiles or gas radius',()=>{
 const {tools,result,scene}=fixture(),before=JSON.stringify(result);tools.setSlice(.25);scene.updateMatrixWorld(true);
 const radius=result.config.radiusM*.4,world=scene.localToWorld(new THREE.Vector3(radius,0,result.config.lengthM*.25)),sample=tools.sampleWorld(world)!;
 close(sample.radiusM,radius);close(sample.axialM,result.config.lengthM*.25);close(tools.group.position.z,result.config.lengthM*.25);assert.equal(JSON.stringify(result),before);
 assert.equal(tools.sampleWorld(scene.localToWorld(new THREE.Vector3(result.config.radiusM*2,0,0))),null);tools.dispose();
});

test('transient probes preserve the conservative cellwise reconstruction rather than smoothing sampled profiles',()=>{
 const {tools,result}=fixture(),R=result.config.radiusM,x=result.config.lightFraction,n=result.config.pressurePa/(1.380649e-23*result.config.gasK);
 tools.update({lightMass:[.25,.75],heavyMass:[.75,.25],timeS:1,neutralRadS:0});
 const inner=tools.sampleAt(R*.6),outer=tools.sampleAt(R*.8);
 close(inner.densityM3,n*(x*.5+(1-x)*1.5));close(outer.densityM3,n*(x*1.5+(1-x)*.5));assert.equal(inner.reconstruction,'Cellwise constant volume density');assert.match(inner.scope,/reflecting wall/);
 assert.throws(()=>tools.update({lightMass:[1],heavyMass:[1]}),RangeError);assert.deepEqual(tools.sampleAt(R*.6),inner);tools.dispose();
});

test('zero-speed shared domains retain a true zero key and finite native material colors',()=>{
 const {tools}=fixture();tools.setLayer('speed');tools.setDomains({speed:[0,0]});tools.update({neutralRadS:0});assert.deepEqual(tools.legend.domain,[0,0]);
 for(const ring of tools.group.children.filter(o=>o.name==='Radial field sample'))assert.ok(Number.isFinite((ring as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>).material.color.r));tools.dispose();
});

test('clipping and ghost staging affect only shell clones and keep quantitative surfaces fixed',()=>{
 const {tools,scene,shell,coil,material,result}=fixture(),slice=tools.group.position.clone(),base=coil.position.clone();
 assert.notEqual(shell.material,material);assert.equal(coil.material,material);
 tools.setStaging({cutaway:.5,ghost:true,explode:1});
 assert.equal((shell.material as THREE.Material).opacity,.14);assert.equal(material.opacity,1);assert.ok(coil.position.z<base.z);assert.deepEqual(tools.group.position,slice);
 const hidden=scene.localToWorld(new THREE.Vector3(0,result.config.radiusM*.5,.2)),kept=scene.localToWorld(new THREE.Vector3(0,-result.config.radiusM*.5,.2));
 assert.equal(tools.visibleHit({object:shell,point:hidden}),false);assert.equal(tools.visibleHit({object:shell,point:kept}),true);
 tools.dispose();tools.dispose();assert.equal(shell.material,material);assert.deepEqual(coil.position,base);assert.equal(tools.group.parent,null);
});

test('intersection clipping matches native material semantics and indexed material hits',()=>{
 const a=new THREE.MeshBasicMaterial(),b=new THREE.MeshBasicMaterial();b.clippingPlanes=[new THREE.Plane(new THREE.Vector3(1,0,0),0),new THREE.Plane(new THREE.Vector3(0,1,0),0)];
 const object=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),[a,b]),hit={object,face:{materialIndex:1},point:new THREE.Vector3(-1,1,0)};
 assert.equal(visibleFuelHit(hit),false);b.clipIntersection=true;assert.equal(visibleFuelHit(hit),true);hit.point.y=-1;assert.equal(visibleFuelHit(hit),false);hit.face.materialIndex=0;assert.equal(visibleFuelHit(hit),true);
});

test('collection handle changes prescribed control only on commit, not accepted physics',()=>{
 const {tools,result,controls}=fixture(),original=result.config.cutFraction;tools.setCut(.3);assert.equal(controls.length,0);tools.setCut(.4,{commit:true});assert.deepEqual(controls,[['cutFraction',.4]]);assert.equal(result.config.cutFraction,original);
 assert.deepEqual(tools.handlePick('coils'),['magneticT']);assert.deepEqual(FUEL_COMPONENT_CONTROLS.electrodes,['currentA','driveInnerFraction']);assert.deepEqual(tools.handlePick('cooling'),[]);tools.dispose();
});

test('pointer ray projects the collection radius in the accepted SI slice plane',()=>{
 const {tools,scene,result}=fixture(),R=result.config.radiusM;tools.setSlice(.4);scene.updateMatrixWorld(true);
 const target=scene.localToWorld(new THREE.Vector3(R*.3,R*.4,result.config.lengthM*.4)),normal=new THREE.Vector3(0,0,1).transformDirection(scene.matrixWorld);
 close(tools.projectCut(new THREE.Ray(target.clone().add(normal),normal.clone().negate()))!, .5);
 const outside=scene.localToWorld(new THREE.Vector3(2*R,0,result.config.lengthM*.4));close(tools.projectCut(new THREE.Ray(outside.clone().add(normal),normal.clone().negate()))!,1);
 assert.equal(tools.projectCut(new THREE.Ray(target.clone().add(normal),new THREE.Vector3(0,1,0))),null);tools.dispose();
});

test('undefined composition, no rotation and invalid physical boundaries are handled explicitly',()=>{
 const {tools,result}=fixture(),R=result.config.radiusM,zero=[{radiusM:0,lightDensityRatio:0,heavyDensityRatio:0},{radiusM:R,lightDensityRatio:0,heavyDensityRatio:0}];
 assert.equal(sampleFuelField(result,R,{profiles:zero}).lightFraction,null);tools.update({profiles:zero,neutralRadS:0});tools.setLayer('composition');assert.ok(tools.group.children.every((o:any)=>!o.material||Number.isFinite(o.material.color.r)));
 for(const value of [-.01,1.01,NaN]){assert.throws(()=>tools.setSlice(value),RangeError);assert.throws(()=>tools.setStaging({cutaway:value}),RangeError);assert.throws(()=>tools.setCut(value),RangeError);}
 assert.throws(()=>tools.sampleAt(R*1.1),RangeError);assert.throws(()=>tools.setLayer('not-a-field'),RangeError);assert.throws(()=>tools.setDomains({density:[2,1]}),RangeError);assert.throws(()=>tools.setDomains({composition:[0,.5]}),RangeError);assert.throws(()=>tools.update({profiles:zero.slice(1)}),RangeError);tools.dispose();
});

test('spatial gas temperature and pressure probes preserve the accepted cell state and temperature color domain',()=>{
 const {tools,result}=fixture(),R=result.config.radiusM;
 const state={lightMass:[.25,.75],heavyMass:[.75,.25],timeS:1,neutralRadS:0,thermal:{gasK:600,gas:{temperatureK:[500,700],pressurePa:[10,30]}}};
 tools.update(state);const inner=tools.sampleAt(R*.6),outer=tools.sampleAt(R*.8);
 assert.equal(inner.temperatureK,500);assert.equal(inner.pressurePa,10);assert.equal(outer.temperatureK,700);assert.equal(outer.pressurePa,30);
 tools.setLayer('temperature');tools.setDomains({temperature:[450,750]});assert.equal(tools.legend.unit,'K');assert.deepEqual(tools.legend.domain,[450,750]);
 for(const ring of tools.group.children.filter((o:any)=>o.name==='Radial field sample')){const data=ring.userData;assert.equal(data.value,data.temperatureK);assert.equal(data.unit,'K');}
 for(const gas of [{temperatureK:[500],pressurePa:[10,30]},{temperatureK:[500,NaN],pressurePa:[10,30]},{temperatureK:[500,700],pressurePa:[10,-1]}]){
  assert.throws(()=>tools.update({...state,thermal:{gasK:600,gas}}),/Spatial gas diagnostics/);assert.deepEqual(tools.sampleAt(R*.6),inner);
 }
 tools.update({lightMass:state.lightMass,heavyMass:state.heavyMass,thermal:{gasK:600}});const lumped=tools.sampleAt(R*.6);assert.equal(lumped.temperatureK,600);close(lumped.pressurePa,lumped.densityM3*1.380649e-23*600);tools.dispose();
});

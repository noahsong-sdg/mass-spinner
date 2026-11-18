import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {simulateFuelTransport,sampleFuelTransport} from '../src/fuel-transport.js';
import {createFuelMotion} from '../src/fuel-motion.js';

function fixture(overrides={}){
 const r=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,...overrides});
 return {...r,transport:simulateFuelTransport(r,{cells:32,steps:128})};
}
function close(a:number,b:number){assert.ok(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),`${a} != ${b}`);}
function release(group:THREE.Group){group.traverse(node=>{
 if('geometry' in node)(node.geometry as THREE.BufferGeometry).dispose();
 if('material' in node){const m=node.material as THREE.Material|THREE.Material[];for(const material of Array.isArray(m)?m:[m])material.dispose();}
});}

test('all four modes expose different, correctly scoped diagnostic geometry',()=>{
 const result=fixture(),motion=createFuelMotion(result),before=JSON.stringify(result);
 try{
  const rotation=motion.group.getObjectByName('Resolved bulk rotation')!,migration=motion.group.getObjectByName('Population-shell displacement')!,flow=motion.group.getObjectByName('Reference throughput routes')!;
  for(const mode of ['equilibrium','transport','spin','flow'] as const){
   motion.update(.2,mode);
   assert.equal(rotation.visible,mode==='equilibrium'||mode==='spin');assert.equal(migration.visible,mode==='transport');assert.equal(flow.visible,mode==='flow');
   for(const packet of motion.group.children.filter(n=>n.name==='Schematic throughput packets'))assert.equal(packet.visible,mode==='flow');
  }
  motion.update(.2,'equilibrium');assert.equal(motion.group.getObjectByName('Ion rotation arrow')!.visible,false);
  motion.group.getObjectByName('Gas mode diagnostics')!.traverse(node=>{
   if(node instanceof THREE.Mesh||node instanceof THREE.Line){assert.equal(node.renderOrder,3);for(const material of [node.material].flat()){assert.equal(material.depthTest,false);assert.equal(material.depthWrite,false);assert.equal(material.transparent,true);}}
  });
  motion.group.traverse(node=>{if(node instanceof THREE.Points&&node.name!=='Schematic throughput packets')for(const material of [node.material].flat())assert.equal(material.depthTest,true,'particle depth still conveys the chamber volume');});
  assert.equal(JSON.stringify(result),before,'graphics never alter accepted physics');
 }finally{release(motion.group);}
});

test('rotation arrows use accepted phases and a shared physical exposure, including rewind and rest',()=>{
 const result=fixture(),motion=createFuelMotion(result);
 try{
  for(const t of [1e-6,.01,.13,0,.2]){
   const sampled=sampleFuelTransport(result.transport,t),state=motion.update(t,'spin'),exposure=Math.min(t,.5*state.secondsPerScreenSecond),before=sampleFuelTransport(result.transport,t-exposure);
   for(const [name,speed,phase]of [['Ion',sampled.ionRadS,sampled.ionPhaseRad],['Neutral',sampled.neutralRadS,sampled.neutralPhaseRad]] as const){
    const rotor=motion.group.getObjectByName(`${name} rotation arrow`)!;
    close(rotor.userData.angularSpeedRadS,speed);close(rotor.rotation.z,phase%(2*Math.PI));close(rotor.userData.exposureS,exposure);
    assert.equal(rotor.visible,speed!==0);
    const arc=rotor.children[0] as THREE.Mesh<THREE.BufferGeometry>,a=arc.geometry.getAttribute('position');
    const last=a.count-2,angle=Math.atan2(a.getY(last),a.getX(last)),displacement=phase-(name==='Ion'?before.ionPhaseRad:before.neutralPhaseRad);
    assert.ok(Math.abs(angle+displacement)<2e-7,'float32 arc matches integrated physical angular exposure');
   }
  }
 }finally{release(motion.group);}
});

test('radial arrows end at independently integrated finite-volume population quantiles, without displacement exaggeration',()=>{
 const result=fixture(),motion=createFuelMotion(result),R=result.config.radiusM;
 try{
  for(const time of [0,.25,.8]){
   motion.update(time,'transport');const snapshot=sampleFuelTransport(result.transport,time);
   for(const arrow of motion.group.getObjectByName('Population-shell displacement')!.children){
    const {species,probability,startRadiusM,endRadiusM,displacementM}=arrow.userData as {species:number;probability:number;startRadiusM:number;endRadiusM:number;displacementM:number};
    const masses=species?snapshot.heavyMass:snapshot.lightMass;
    const integral=(y:number)=>masses.reduce((sum,m,i)=>sum+m*Math.max(0,Math.min(1,y*masses.length-i)),0);
    let lo=0,hi=1;for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(integral(mid)<probability)lo=mid;else hi=mid;}
    close(startRadiusM,R*Math.sqrt(probability));close(endRadiusM,R*Math.sqrt((lo+hi)/2));close(displacementM,endRadiusM-startRadiusM);
    if(time===0)assert.equal(arrow.visible,false);
   }
  }
 }finally{release(motion.group);}
});

test('zero drive and pure species leave finite geometry and no fabricated rotational or absent-species arrows',()=>{
 for(const lightFraction of [0,1]){
  const result=fixture({currentA:0,lightFraction}),motion=createFuelMotion(result);
  try{
   for(const mode of ['spin','transport','flow','equilibrium'] as const){
    motion.update(.3,mode);
    for(const child of motion.group.getObjectByName('Resolved bulk rotation')!.children)assert.equal(child.visible,false);
    motion.group.traverse(node=>{if('geometry' in node)for(const v of (node.geometry as THREE.BufferGeometry).getAttribute('position').array)assert.ok(Number.isFinite(v));});
   }
   motion.update(.3,'transport');for(const arrow of motion.group.getObjectByName('Population-shell displacement')!.children)assert.equal(arrow.visible,false);
  }finally{release(motion.group);}
 }
});

test('species focus dims the corresponding shell arrows and survives mode changes',()=>{
 const motion=createFuelMotion(fixture());
 try{
  for(const species of ['light','heavy','all'] as const){
   motion.setSpecies(species);motion.update(.3,'transport');motion.update(.3,'flow');motion.update(.3,'transport');
   for(const arrow of motion.group.getObjectByName('Population-shell displacement')!.children as THREE.ArrowHelper[]){
    const selected=species==='all'||arrow.userData.species===(species==='light'?0:1);
    for(const material of [arrow.line.material,arrow.cone.material].flat())close(material.opacity,selected?1:.08);
   }
  }
 }finally{release(motion.group);}
});

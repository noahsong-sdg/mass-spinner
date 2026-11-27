import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {createFuelMotion,type FuelMotionMode} from '../src/fuel-motion.js';

test('bulk samples fill azimuth and axial position without an artificial helical sheet',()=>{
 const result=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,lightFraction:.5}),motion=createFuelMotion(result);
 try{
  for(const mode of ['equilibrium','spin','transport','flow'] as FuelMotionMode[]){
   motion.update(.1,mode);
   for(const cloud of motion.group.children.filter(o=>o.userData.tracers)){
    const p=(cloud.children[0] as THREE.InstancedMesh).geometry.getAttribute('samplePosition');
    let cosine=0,sine=0;const bins=new Set<string>();
    for(let i=0;i<p.count;i++){
     const theta=Math.atan2(p.getY(i),p.getX(i)),z=p.getZ(i)/result.config.lengthM;
     const phase=theta+2*Math.PI*z;cosine+=Math.cos(phase);sine+=Math.sin(phase);
     bins.add(`${Math.floor((theta+Math.PI)/(2*Math.PI)*8)%8}:${Math.floor(z*8)}`);
    }
    // The old coordinates gave modulus 1 and occupied only 8–16 of 64 bins.
    assert.ok(Math.hypot(cosine,sine)/p.count<.05,'no azimuth/axial phase lock');
    assert.ok(bins.size>=50,'samples occupy the cylinder rather than a helix');
   }
  }
  const neutrals=motion.group.children.filter(o=>o.userData.tracers&&!o.userData.ion);
  const positions=neutrals.map(o=>(o.children[0] as THREE.InstancedMesh).geometry.getAttribute('samplePosition'));
  for(let i=0;i<positions[0].count;i++){
   assert.ok(Math.hypot(positions[0].getX(i)-positions[1].getX(i),positions[0].getY(i)-positions[1].getY(i))>1e-5,
    'equal species inventories must not draw coincident samples that conceal one color');
  }
 }finally{motion.group.traverse(node=>{
  if(node instanceof THREE.Points||node instanceof THREE.LineSegments){node.geometry.dispose();for(const material of Array.isArray(node.material)?node.material:[node.material])material.dispose();}
 });}
});

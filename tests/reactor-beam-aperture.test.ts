import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildEngineeringGeometry} from '../src/engineering-geometry.js';

for(const area of [1e-5,.01,.1])test(`SI extraction electrodes clear the prescribed ${area} m² beam`,t=>{
 const built=buildEngineeringGeometry({mode:'beam-target',beamAreaM2:area,filmThicknessM:1e-6,backingThicknessM:.001});
 t.after(()=>built.dispose());built.group.updateMatrixWorld(true);
 const radius=Math.sqrt(area/Math.PI),vesselRadius=Math.max(2.5*radius,.025),electrodes:THREE.Mesh[]=[];
 built.group.traverse(node=>{if(node instanceof THREE.Mesh&&node.name==='Extraction electrode')electrodes.push(node);});
 assert.equal(electrodes.length,3);
 for(const electrode of electrodes){
  const positions=electrode.geometry.getAttribute('position');let inner=Infinity,outer=0;
  for(let i=0;i<positions.count;i++){
   const r=Math.hypot(positions.getX(i),positions.getY(i));inner=Math.min(inner,r);outer=Math.max(outer,r);
  }
  assert.ok(inner>radius,'the complete prescribed footprint fits through the actual bore');
  assert.ok(Math.abs(inner-Math.max(1.1*radius,.21*vesselRadius))<vesselRadius*1e-6);
  assert.ok(Math.abs(outer-.68*vesselRadius)<vesselRadius*1e-6,'outer construction radius is unchanged');
  assert.ok(outer>inner,'a finite annular electrode wall remains');
 }
 const upstream=new THREE.Box3().setFromObject(built.group).min.z-1;
 for(const fraction of [0,.5,.999])for(let i=0;i<8;i++){
  const angle=i*Math.PI/4,ray=new THREE.Raycaster(new THREE.Vector3(radius*fraction*Math.cos(angle),radius*fraction*Math.sin(angle),upstream),new THREE.Vector3(0,0,1));
  assert.equal(ray.intersectObjects(electrodes,false).length,0,'straight prescribed rays must not intersect an extraction electrode');
 }
 assert.equal(built.domain.beamAreaM2,area);assert.equal(built.domain.radiusM,radius);
 assert.equal(built.domain.filmThicknessM,1e-6);assert.equal(built.domain.backingThicknessM,.001);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {simulateFuelTransport} from '../src/fuel-transport.js';
import {createFuelMotion,fuelMotionState} from '../src/fuel-motion.js';
import {comparisonDomain} from '../src/fuel-experiments.js';

function fixture(overrides={}){
 const rotor=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA:.06,lightFraction:.5,...overrides});
 return {...rotor,transport:simulateFuelTransport(rotor,{cells:64,steps:256})};
}
const clouds=(motion:any)=>motion.group.children.filter((o:any)=>o.userData.tracers);
const positions=(cloud:any)=>cloud.children[0].geometry.attributes.position as THREE.BufferAttribute;
function close(a:number,b:number,tolerance=3e-7){assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=tolerance,`${a} != ${b}`);}
function dispose(motion:any){motion.group.traverse((o:any)=>{o.geometry?.dispose();o.material?.dispose();});}

// Independent integral and bisection, deliberately not production quantile/CDF code.
function probability(mass:number[],y:number){
 const width=1/mass.length;
 return mass.reduce((total,p,i)=>total+p*Math.max(0,Math.min(width,y-i*width))/width,0);
}
function invertByBisection(mass:number[],p:number){
 let lo=0,hi=1;
 for(let j=0;j<60;j++){const mid=(lo+hi)/2;if(probability(mass,mid)<p)lo=mid;else hi=mid;}
 return (lo+hi)/2;
}
function massesAt(result:ReturnType<typeof fixture>,time:number,species:number){
 const snapshots=result.transport.snapshots,key=species?'heavyMass':'lightMass';
 if(time<=0)return snapshots[0][key];
 if(time>=result.config.durationS)return snapshots.at(-1)![key];
 const upper=snapshots.findIndex(p=>p.timeS>=time),a=snapshots[upper-1],b=snapshots[upper],f=(time-a.timeS)/(b.timeS-a.timeS);
 return a[key].map((v,i)=>v*(1-f)+b[key][i]*f);
}
function ringRadiiMatchPoints(cloud:any){
 const a=positions(cloud),b=cloud.children[2].geometry.attributes.position as THREE.BufferAttribute;
 assert.equal(b.count,a.count*96);
 for(let i=0;i<a.count;i++)close(Math.hypot(b.getX(i*96),b.getY(i*96)),Math.hypot(a.getX(i),a.getY(i)),3e-8);
}

test('transport tracer radii invert the solved cell inventories and reproduce physical-radius cuts',()=>{
 const result=fixture(),motion=createFuelMotion(result),R=result.config.radiusM;
 try{
  for(const time of [0,.137,.5,result.config.durationS]){
   motion.update(time,'transport');
   for(const cloud of clouds(motion).filter((o:any)=>!o.userData.ion)){
    const a=positions(cloud),mass=massesAt(result,time,cloud.userData.species);
    for(let i=0;i<a.count;i+=17){
     const y=(a.getX(i)**2+a.getY(i)**2)/R**2;
     close(y,invertByBisection(mass,(i+.5)/a.count));
    }
    for(const cut of [0,.2,.65,.9,1]){
     let inside=0;for(let i=0;i<a.count;i++)if(Math.hypot(a.getX(i),a.getY(i))<=cut*R)inside++;
     close(inside/a.count,probability(mass,cut**2),1/a.count+2e-7);
    }
   }
  }
 }finally{dispose(motion);}
});

test('closed-wall Transport never presents equilibrium pumping packets as solved outlet flow',()=>{
 const result=fixture(),motion=createFuelMotion(result);
 try{
  assert.ok(result.pumping.gasLoadPaM3S>0,'the reference pump is deliberately active');
  for(const time of [0,.2,result.config.durationS]){
   motion.update(time,'transport');
   const packets=motion.group.children.filter((o:any)=>o.name==='Schematic throughput packets');
   assert.equal(packets.length,4);assert.ok(packets.every((o:any)=>!o.visible));
  }
  motion.update(.2,'flow');
  assert.ok(motion.group.children.filter((o:any)=>o.name==='Schematic throughput packets').every((o:any)=>o.visible));
 }finally{dispose(motion);}
});

test('averaged ring geometry follows Transport→Flow and Transport→Equilibrium→Flow transitions',()=>{
 const result=fixture(),motion=createFuelMotion(result),R=result.config.radiusM;
 try{
  for(const intermediate of [false,true]){
   motion.update(.137,'transport');
   if(intermediate)motion.update(.137,'equilibrium');
   motion.update(.137,'flow');
   for(const cloud of clouds(motion)){
    ringRadiiMatchPoints(cloud);
    assert.equal(cloud.children[2].visible,true);
    if(!cloud.userData.ion){
     const beta=fuelMotionState(result,0,'equilibrium').beta[cloud.userData.species],a=positions(cloud);
     for(let i=0;i<a.count;i+=29){
      const y=(a.getX(i)**2+a.getY(i)**2)/R**2;
      const cdf=beta===0?y:Math.exp(-beta*(1-y))*(-Math.expm1(-beta*y))/(-Math.expm1(-beta));
      close(cdf,(i+.5)/a.count,8e-7);
     }
    }
   }
  }
 }finally{dispose(motion);}
});

test('zero-drive Transport has finite stationary geometry and a genuinely constant speed color domain',()=>{
 const result=fixture({currentA:0}),motion=createFuelMotion(result);
 try{
  assert.deepEqual(comparisonDomain([result],'speed'),[0,0]);
  for(const mode of ['transport','flow','equilibrium']){
   const state=motion.update(.5,mode);
   assert.deepEqual(state.speeds,{ion:0,neutral:0});
   assert.ok(Number.isFinite(state.secondsPerScreenSecond)&&state.secondsPerScreenSecond>0);
   for(const cloud of clouds(motion)){
    assert.equal(cloud.children[0].visible,true);
    assert.equal(cloud.children.length,2,'stationary gas has no fabricated rotational smear');
    for(const value of positions(cloud).array)assert.ok(Number.isFinite(value));
   }
  }
 }finally{dispose(motion);}
});

test('species focus persists when averaged rings are created and restores both species on All',()=>{
 const result=fixture(),motion=createFuelMotion(result);
 try{
  // Focus before rings exist: lazy geometry creation must retain the selection.
  motion.setSpecies('light');motion.update(.5,'transport');
  for(const ion of [false,true]){
   const pair=clouds(motion).filter((o:any)=>o.userData.ion===ion);
   assert.ok(pair[0].children[2].material.opacity>pair[1].children[2].material.opacity*3);
  }
  for(const focus of ['heavy','light','all']){
   motion.setSpecies(focus);motion.update(.5,'flow');
   for(const cloud of clouds(motion)){
    const selected=focus==='all'||cloud.userData.species===(focus==='light'?0:1);
    close(cloud.children[0].material.opacity,selected?(cloud.userData.ion?1:.85):.08);
    assert.ok(selected?cloud.children[2].material.opacity>.01:cloud.children[2].material.opacity<.01);
   }
  }
 }finally{dispose(motion);}
});

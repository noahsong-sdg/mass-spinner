import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {DEFAULT_FUEL_CENTRIFUGE as defaults,simulateFuelCentrifuge,rotorResponse,rotorPhase,radialCDF} from '../src/fuel-centrifuge.ts';
import {createFuelMotion,fuelMotionState,radialQuantile} from '../src/fuel-motion.js';

const result=(overrides={})=>simulateFuelCentrifuge({...defaults,...overrides});
const close=(a:number,b:number,tol=1e-9)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} ≠ ${b}`);
function dispose(group:THREE.Group){group.traverse((o:any)=>{o.geometry?.dispose();o.material?.dispose();});}

test('phase integral independently agrees with RK4 on the coupled angular momentum ODE',()=>{
 const ii=2,nn=5,gamma=3,drag=4,torque=7,t=1.3,n=13000,h=t/n;
 const derivative=([i,g]:number[])=>[(torque-gamma*(i-g))/ii,(gamma*(i-g)-drag*g)/nn,i,g];
 let y=[0,0,0,0];
 for(let j=0;j<n;j++){
  const a=derivative(y),b=derivative(y.map((v,i)=>v+h*a[i]/2)),c=derivative(y.map((v,i)=>v+h*b[i]/2)),d=derivative(y.map((v,i)=>v+h*c[i]));
  y=y.map((v,i)=>v+h*(a[i]+2*b[i]+2*c[i]+d[i])/6);
 }
 const speed=rotorResponse(ii,nn,gamma,drag,torque,t),phase=rotorPhase(ii,nn,gamma,drag,torque,t);
 close(speed.ion,y[0]);close(speed.neutral,y[1]);close(phase.ion,y[2]);close(phase.neutral,y[3]);
 assert.ok(Math.abs(phase.ion-speed.ion*t)>.1,'final speed × elapsed time is wrong during acceleration');
});

test('phase handles ballistic, uncoupled, torque-free, signed torque and stiff initial spin-up limits',()=>{
 assert.deepEqual(rotorPhase(2,5,0,0,7,2),{ion:7,neutral:0});
 assert.deepEqual(rotorPhase(2,5,0,3,0,1),{ion:0,neutral:0});
 close(rotorPhase(2,5,0,3,7,2).ion,7);
 for(const t of [1e-10,1e-7,1e-4,.1,1]){
  const r=result(),m=r.mechanics,args=[m.ii,m.nn,m.gamma,m.drag,m.torque] as const,h=t*1e-4;
  const a=rotorPhase(...args,t-h),b=rotorPhase(...args,t+h),speed=rotorResponse(...args,t);
  close((b.ion-a.ion)/(2*h),speed.ion,2e-7);close((b.neutral-a.neutral)/(2*h),speed.neutral,2e-7);
  const negative=rotorPhase(m.ii,m.nn,m.gamma,m.drag,-m.torque,t);close(negative.ion,-rotorPhase(...args,t).ion);
 }
 assert.throws(()=>rotorPhase(0,5,3,4,7,1),RangeError);
});

test('neutral radii invert the exact accepted CDF from uniform gas to thin centrifugal wall layers',()=>{
 for(const beta of [0,1e-12,1e-8,.1,10,50,1000,1e6])for(const p of [0,1e-6,.01,.3,.9,1]){
  const y=radialQuantile(beta,p);assert.ok(y>=0&&y<=1);close(radialCDF(beta,y),p,5e-10);
 }
});

test('both angular velocities and phases share one scale and stay independent of frame partition',()=>{
 const r=result(),end=r.samples.at(-1)!,state=fuelMotionState(r,.005);
 close(state.phases.ion,end.ionRadS*.005);close(state.phases.neutral,end.neutralRadS*.005);
 close(state.speeds.ion/state.speeds.neutral,end.ionRadS/end.neutralRadS);
 assert.ok(state.secondsPerScreenSecond*Math.max(end.ionRadS,end.neutralRadS)<=1.800000000001);
 const motion=createFuelMotion(r);const time=state.secondsPerScreenSecond*2;
 motion.update(time/2);motion.update(time);
 const once=createFuelMotion(r);once.update(time);
 assert.deepEqual(motion.group.children.map(o=>o.rotation.z),once.group.children.map(o=>o.rotation.z));
 const spin=fuelMotionState(r,.01,'spin'),m=r.mechanics,expected=rotorPhase(m.ii,m.nn,m.gamma,m.drag,m.torque,.01);
 close(spin.phases.ion,expected.ion);close(spin.phases.neutral,expected.neutral);dispose(motion.group);dispose(once.group);
});

test('weighted neutral cloud reproduces inventory cuts, ion fraction and species inventory without fake transit',()=>{
 const r=result(),motion=createFuelMotion(r),n=fuelMotionState(r,0).neutralNumber;
 for(const child of motion.group.children.filter(o=>o.userData.tracers)){
  const {ion,species,tracers,representedNumber}=child.userData;
  close(representedNumber,n*[r.config.lightFraction,1-r.config.lightFraction][species]*(ion?r.config.ionFraction/(1-r.config.ionFraction):1));
  const p=(child.children[0] as THREE.Points).geometry.getAttribute('position');assert.equal(p.count,tracers);
  if(!ion){let inside=0;for(let i=0;i<p.count;i++)if(Math.hypot(p.getX(i),p.getY(i))<=r.config.cutFraction*r.config.radiusM)inside++;
   const beta=fuelMotionState(r,0).beta[species];close(inside/tracers,radialCDF(beta,r.config.cutFraction**2),1/tracers);
   const before=p.array.slice();motion.update(.02);assert.deepEqual(p.array,before,'rotation does not invent radial transport');
  }
 }
 motion.update(.1,'spin');
 for(const child of motion.group.children.filter(o=>o.userData.tracers)){
  const p=(child.children[0] as THREE.Points).geometry.getAttribute('position');let mean=0;
  for(let i=0;i<p.count;i++)mean+=(p.getX(i)**2+p.getY(i)**2)/p.count;
  close(mean,r.config.radiusM**2/2,1e-8);
 }
 assert.equal(motion.group.children.filter(o=>o.name==='Schematic throughput packets').every(o=>!o.visible),true);
 motion.update(.1,'equilibrium');assert.equal(motion.group.children.filter(o=>o.name==='Schematic throughput packets').every(o=>o.visible),true);
 dispose(motion.group);
});

test('packet weight × boundary crossing rate equals species Q/kT; conductance does not falsely change fixed-pressure Q',()=>{
 const r=result(),motion=createFuelMotion(r),state=fuelMotionState(r,0),K=1.380649e-23;
 for(const child of motion.group.children.filter(o=>o.name==='Schematic throughput packets')){
  const {packetNumber,species}=child.userData;close(packetNumber*12*state.turnoverHz,r.pumping.species[species].gasLoadPaM3S/(K*r.config.gasK));
 }
 const morePump=fuelMotionState(result({pumpSpeedM3S:.04}),0);close(morePump.turnoverHz,state.turnoverHz*2);
 close(fuelMotionState(result({conductanceM3S:.1}),0).turnoverHz,state.turnoverHz);
 const points=motion.group.children.find(o=>o.name==='Schematic throughput packets') as THREE.Points,before=points.geometry.attributes.position.array.slice();
 motion.update(.01);assert.notDeepEqual(points.geometry.attributes.position.array,before);dispose(motion.group);
});

test('zero current removes rotation and separation while retaining pressure-driven pumping; pure species stays pure',()=>{
 for(const x of [0,1]){
  const r=result({currentA:0,lightFraction:x}),state=fuelMotionState(r,3),motion=createFuelMotion(r);
  assert.deepEqual(state.phases,{ion:0,neutral:0});assert.deepEqual(state.beta,[0,0]);assert.ok(state.turnoverHz>0);
  motion.update(1,'flow');
  for(const child of motion.group.children.filter(o=>o.userData.tracers)){assert.equal(child.children[0].visible,true);assert.equal(child.children.length,2,'stationary gas must not acquire a rotational smear');}
  for(const child of motion.group.children.filter(o=>o.userData.tracers))assert.equal(child.visible,child.userData.species===(x===1?0:1));
  motion.group.traverse((o:any)=>{if(o.geometry)for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));});dispose(motion.group);
 }
});

test('flow view keeps true rates, averages azimuth instead of aliasing fast rotation, and restores discrete tracers',()=>{
 const r=result(),motion=createFuelMotion(r),state=fuelMotionState(r,0,'flow');
 assert.ok(state.secondsPerScreenSecond>fuelMotionState(r,0).secondsPerScreenSecond);
 close(state.speeds.ion,r.samples.at(-1)!.ionRadS);
 motion.update(0,'flow');const packets=motion.group.children.find(o=>o.name==='Schematic throughput packets') as THREE.Points,before=packets.geometry.attributes.position.array.slice();
 motion.update(state.secondsPerScreenSecond,'flow');assert.notDeepEqual(packets.geometry.attributes.position.array,before);
 for(const cloud of motion.group.children.filter(o=>o.userData.tracers)){
  assert.equal(cloud.rotation.z,0);assert.equal(cloud.children[0].visible,false);assert.equal(cloud.children[1].visible,false);assert.equal(cloud.children[2].visible,true);
  const rings=(cloud.children[2] as THREE.LineSegments).geometry.attributes.position;
  for(let i=0;i<96;i++)close(rings.getZ(i),rings.getZ(0));
 }
 motion.update(.01,'equilibrium');for(const cloud of motion.group.children.filter(o=>o.userData.tracers)){assert.equal(cloud.children[0].visible,true);assert.equal(cloud.children[2].visible,false);}
 dispose(motion.group);
});

test('drive and collisions affect the same rotation/separation state; diffusivity does not invent unsolved radial migration',()=>{
 const baseline=fuelMotionState(result(),.1),drive=fuelMotionState(result({currentA:.06}),.1);
 close(drive.speeds.ion,2*baseline.speeds.ion);close(drive.speeds.neutral,2*baseline.speeds.neutral);close(drive.beta[0],4*baseline.beta[0]);
 const noCoupling=fuelMotionState(result({collisionHz:0}),.1);assert.equal(noCoupling.speeds.neutral,0);assert.deepEqual(noCoupling.beta,[0,0]);assert.ok(noCoupling.speeds.ion>0);
 const slowMixing=fuelMotionState(result({radialDiffusivityM2S:.0001}),.1);assert.deepEqual(slowMixing.beta,baseline.beta);
});

test('gas sprites use native logarithmic-depth capable materials with distinct neutral and ion masks',()=>{
 const motion=createFuelMotion(result()),clouds=motion.group.children.filter(o=>o.userData.tracers);
 for(const cloud of clouds){
  const m=(cloud.children[0] as THREE.Points).material as THREE.PointsMaterial;
  assert.equal(m.isPointsMaterial,true,'custom shaders must not silently bypass the viewer depth convention');assert.equal(m.depthTest,true);assert.equal(m.depthWrite,false);assert.equal(m.sizeAttenuation,false);
  const data=m.map!.image.data as Uint8Array;assert.equal(data[(16*32+16)*4+3]>0,!cloud.userData.ion,'neutrals are solid, ions are rings');
 }
 assert.equal((clouds[0].children[0] as THREE.Points).material.map,(clouds[1].children[0] as THREE.Points).material.map,'one shared native sprite per charge class');dispose(motion.group);
});

import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {JSDOM} from 'jsdom';
import {DEFAULT_FUSION_BEAM,simulateFusionBeam} from '../src/fusion-reactor.js';
import {sourceMotionState,type BeamMotionState} from '../src/reactor-motion.js';
import {createReactorMotionLayer} from '../src/reactor-motion-layer.js';

const CHARGE=1.602176634e-19,ATOMIC_MASS=1.66053906660e-27;
const close=(actual:number,expected:number,tolerance=5e-6)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} ≠ ${expected}`);

/** Real animation buffers on a known SI beam axis; no WebGL mock decides their positions. */
function fixture(t:TestContext,span=10){
 const dom=new JSDOM('<div id="frame"></div>'),frame=dom.window.document.querySelector<HTMLDivElement>('#frame')!;
 Object.defineProperty(dom.window,'matchMedia',{value:()=>({matches:false,addEventListener(){},removeEventListener(){}})});
 const root=new THREE.Group();root.name='SI engineering assembly';
 for(const [id,x,depth]of [['target',.0000005,.000001],['accelerator',-span-.01,.02]] as const){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(depth,.12,.12),new THREE.MeshBasicMaterial());
  mesh.userData.componentId=id;mesh.position.x=x;root.add(mesh);
 }
 const layer=createReactorMotionLayer(frame,()=>{}),state=sourceMotionState(simulateFusionBeam(DEFAULT_FUSION_BEAM))!;
 layer.update(state,root);
 t.after(()=>{layer.dispose();root.traverse(node=>{if(node instanceof THREE.Mesh){node.geometry.dispose();for(const material of Array.isArray(node.material)?node.material:[node.material])material.dispose();}});dom.window.close();});
 const object=(index:number)=>layer.group.children[index] as THREE.Points;
 const point=(index:number,sample=0)=>new THREE.Vector3().fromBufferAttribute(object(index).geometry.getAttribute('position'),sample);
 const count=(index:number)=>object(index).geometry.drawRange.count;
 const coordinates=(index:number)=>Array.from(object(index).geometry.getAttribute('position').array);
 return {layer,state,root,frame,point,count,coordinates};
}

test('SI particle displacement follows kinetic speed, not the length of the display geometry',t=>{
 const short=fixture(t,10),long=fixture(t,20),dt=.01;
 const positions=[short,long].map(f=>[f.point(0),f.point(1)]);
 for(const f of [short,long])f.layer.tick(dt);
 const beamSpeed=Math.sqrt(2*DEFAULT_FUSION_BEAM.beamEnergyKeV*1000*CHARGE/(2*ATOMIC_MASS));
 const neutronSpeed=Math.sqrt(2*short.state.neutronEnergyMeV!*1e6*CHARGE/ATOMIC_MASS);
 for(const [i,f]of [short,long].entries()){
  const beamDelta=f.point(0).sub(positions[i][0]),neutronDelta=f.point(1).sub(positions[i][1]);
  close(beamDelta.x,beamSpeed*2e-7*dt);close(beamDelta.y,0);close(beamDelta.z,0);
  close(neutronDelta.length(),neutronSpeed*1e-8*dt);
 }
});

test('energy edits change subsequent speed without teleporting the current particle positions',t=>{
 const f=fixture(t),dt=.01;f.layer.tick(.03);
 const beforeBeam=f.coordinates(0),beforeNeutrons=f.coordinates(1),start=f.point(0),neutronStart=f.point(1);
 const faster:BeamMotionState={...f.state,energyKeV:400,neutronEnergyMeV:f.state.neutronEnergyMeV!*4};
 f.layer.update(faster,f.root);
 assert.deepEqual(f.coordinates(0),beforeBeam);assert.deepEqual(f.coordinates(1),beforeNeutrons);
 f.layer.tick(dt);
 const originalBeamSpeed=Math.sqrt(2*100000*CHARGE/(2*ATOMIC_MASS));
 const originalNeutronSpeed=Math.sqrt(2*f.state.neutronEnergyMeV!*1e6*CHARGE/ATOMIC_MASS);
 close(f.point(0).x-start.x,2*originalBeamSpeed*2e-7*dt);
 close(f.point(1).distanceTo(neutronStart),2*originalNeutronSpeed*1e-8*dt);
});

test('equal elapsed time produces the same positions at high and low frame rates',t=>{
 const fine=fixture(t),coarse=fixture(t);
 for(let i=0;i<20;i++)fine.layer.tick(.01);
 for(let i=0;i<2;i++)coarse.layer.tick(.1);
 for(const index of [0,1,2,4]){
  const a=fine.coordinates(index),b=coarse.coordinates(index);
  assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)close(a[i],b[i]);
 }
});

test('reaction-site coverage spans the beam disk independently of neutron production',t=>{
 const f=fixture(t),radius=Math.sqrt(f.state.areaM2/Math.PI);let reference:number[]|null=null;
 for(const rate of [1,1e11,1e30]){
  f.layer.update({...f.state,neutronRateS:rate},f.root);assert.equal(f.count(4),12);
  const positions=f.coordinates(4);if(reference)assert.deepEqual(positions,reference);else reference=positions;
  const radii=Array.from({length:f.count(4)},(_,i)=>{const p=f.point(4,i);close(p.x,0);return Math.hypot(p.y,p.z)/radius;});
  assert.ok(Math.min(...radii)<.25,'reaction sites retain central coverage');
  assert.ok(Math.max(...radii)>.95&&Math.max(...radii)<=1,'reaction sites retain edge coverage');
 }
 f.layer.update({...f.state,neutronRateS:0,neutronEnergyMeV:null},f.root);assert.equal(f.count(4),0);
});

/** Recover flight direction and birth position from the actual paired point buffer. */
function neutronPairs(f:ReturnType<typeof fixture>){
 const result:{birth:THREE.Vector3;direction:THREE.Vector3}[]=[];
 for(let i=0;i<f.count(1);i+=2){
  const a=f.point(1,i),b=f.point(1,i+1);
  const direction=f.point(2,2*i+1).sub(f.point(2,2*i)).normalize();
  const opposite=f.point(2,2*(i+1)+1).sub(f.point(2,2*(i+1))).normalize();
  close(direction.length(),1,1e-6);close(opposite.length(),1,1e-6);close(opposite.dot(direction),-1,1e-5);
  let birth=a.clone().add(b).multiplyScalar(.5);
  if(Math.abs(direction.x)>1e-6){
   const originA=a.clone().addScaledVector(direction,-a.x/direction.x),originB=b.clone().addScaledVector(opposite,-b.x/opposite.x);
   close(originA.distanceTo(originB),0,1e-5);birth=originA.add(originB).multiplyScalar(.5);
  }
  close(a.distanceTo(birth),b.distanceTo(birth),1e-5);
  result.push({birth:birth.clone(),direction},{birth:birth.clone(),direction:opposite});
 }
 return result;
}

test('runtime neutron source has no radial or transverse emission bias and resolves solid angle',t=>{
 const f=fixture(t);f.layer.update({...f.state,neutronRateS:1e30},f.root);assert.equal(f.count(1),64);
 const samples=neutronPairs(f),radius=Math.sqrt(f.state.areaM2/Math.PI),n=samples.length;
 const average=(fn:(sample:typeof samples[number])=>number)=>samples.reduce((sum,s)=>sum+fn(s),0)/n;
 close(average(s=>s.birth.x),0,1e-7);
 close(average(s=>(s.birth.y**2+s.birth.z**2)/radius**2),.5,.025);
 for(let axis=0;axis<3;axis++){
  close(average(s=>s.direction.getComponent(axis)),0,1e-5);
  close(average(s=>s.direction.getComponent(axis)**2),1/3,.015);
  close(average(s=>(s.birth.y**2+s.birth.z**2)/radius**2*s.direction.getComponent(axis)),0,1e-5);
  for(let other=0;other<3;other++){
   close(average(s=>s.birth.getComponent(other)/radius*s.direction.getComponent(axis)),0,1e-5);
   if(axis!==other)close(average(s=>s.direction.getComponent(axis)*s.direction.getComponent(other)),0,.015);
  }
 }
 // Mean radial emission detects outward-only rays; the squared moment also rejects ±radial-only rays.
 close(average(s=>(s.birth.y*s.direction.y+s.birth.z*s.direction.z)/Math.hypot(s.birth.y,s.birth.z)),0,1e-5);
 close(average(s=>((s.birth.y*s.direction.y+s.birth.z*s.direction.z)/Math.hypot(s.birth.y,s.birth.z))**2),1/3,.04);
 for(const outer of [false,true]){
  const bin=samples.filter(s=>(s.birth.y**2+s.birth.z**2>radius**2*.5)===outer);
  assert.ok(bin.length>=24);
  for(let axis=0;axis<3;axis++)close(bin.reduce((sum,s)=>sum+s.direction.getComponent(axis),0)/bin.length,0,1e-5);
 }
});

test('small and odd requested neutron populations remain balanced, bounded and vanish at zero source',t=>{
 const f=fixture(t);
 for(const rate of [1,4e9,5e10,1e30]){
  f.layer.update({...f.state,neutronRateS:rate},f.root);
  const count=f.count(1);assert.ok(count>=2&&count<=64);assert.equal(count%2,0);
  const pairs=neutronPairs(f);for(let axis=0;axis<3;axis++)close(pairs.reduce((sum,s)=>sum+s.direction.getComponent(axis),0)/pairs.length,0,1e-5);
 }
 f.layer.update({...f.state,particleRateS:0,neutronRateS:0,neutronEnergyMeV:null,depositedPowerW:0},f.root);
 for(const index of [0,1,2,4])assert.equal(f.count(index),0);
});

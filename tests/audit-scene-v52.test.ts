import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {setupFuelCentrifuge} from '../src/fuel-centrifuge-ui.js';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {DEFAULT_FUEL_THERMAL,simulateFuelOperation} from '../src/fuel-operation.js';
import {simulateFuelTransport} from '../src/fuel-transport.js';
import {createFuelMotion,fuelMotionState} from '../src/fuel-motion.js';
import {sampleFuelField} from '../src/fuel-scene-tools.js';
import {comparisonDomain} from '../src/fuel-experiments.js';
import {createApparatusViewer} from '../src/apparatus-viewer.js';
import * as geometry from '../src/fuel-centrifuge-geometry.js';

const flush=async()=>{for(let i=0;i<60;i++)await Promise.resolve();};
const direction=(pose:any)=>new THREE.Vector3(...pose.position).sub(new THREE.Vector3(...pose.target)).normalize();
function closeDirection(actual:THREE.Vector3,expected:THREE.Vector3){assert.ok(actual.distanceTo(expected)<1e-9,`${actual.toArray()} != ${expected.toArray()}`);}
function closePose(actual:any,expected:any){for(const key of ['position','target','up'])assert.ok(new THREE.Vector3(...actual[key]).distanceTo(new THREE.Vector3(...expected[key]))<1e-12,`${key}: ${actual[key]} != ${expected[key]}`);}

/** Production UI + operation solver + geometry + native OrbitControls. Only GPU
 * display is injected: these tests establish state plumbing, not GPU fidelity. */
async function fixture(t:any){
 const dom=new JSDOM('<main></main>',{url:'https://example.org/?level=2'}),doc=dom.window.document;
 Object.defineProperty(dom.window,'matchMedia',{value:()=>({matches:true,addEventListener(){},removeEventListener(){}})});
 const oldDocument=Object.getOwnPropertyDescriptor(globalThis,'document'),oldObserver=Object.getOwnPropertyDescriptor(globalThis,'ResizeObserver');
 Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
 Object.defineProperty(globalThis,'ResizeObserver',{value:class{observe(){}disconnect(){}},configurable:true});
 let size={width:1000,height:600};const viewers:any[]=[],built:any[]=[];
 const graphics=[{createApparatusViewer:(frame:any,options:any)=>{
  frame.getBoundingClientRect=()=>({...size,left:0,top:0,right:size.width,bottom:size.height,x:0,y:0,toJSON(){}});
  const viewer=createApparatusViewer(frame,{...options,
   displayFactory:()=>({renderer:{render(scene:THREE.Scene,camera:THREE.Camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld();},clear(){},setSize(){}},dispose(){}}),
   controlsFactory:(camera:THREE.Camera,canvas:HTMLCanvasElement)=>new OrbitControls(camera,canvas)});
  viewers.push(viewer);return viewer;
 }},{...geometry,buildFuelCentrifugeGeometry:(value:any)=>{const next=geometry.buildFuelCentrifugeGeometry(value);built.push(next);return next;}}];
 const ui=setupFuelCentrifuge({document:doc,loadGraphics:async()=>graphics,request:async(r:any)=>{
  const result=simulateFuelCentrifuge(r.config,r.operation?.events);return {result:{...result,transport:simulateFuelOperation(result,r.operation,{},r.resume)}};
 }});
 const change=(id:string,value:string|number,type='input')=>{const n=doc.getElementById(id) as any;n.value=String(value);n.dispatchEvent(new dom.window.Event(type,{bubbles:true}));};
 t.after(()=>{ui.dispose();dom.window.close();if(oldDocument)Object.defineProperty(globalThis,'document',oldDocument);else Reflect.deleteProperty(globalThis,'document');if(oldObserver)Object.defineProperty(globalThis,'ResizeObserver',oldObserver);else Reflect.deleteProperty(globalThis,'ResizeObserver');});
 ui.setActive(true);await flush();assert.ok(ui.latest);assert.equal(viewers.length,1);
 return {ui,doc,viewers,built,change,resize(width:number,height:number){size={width,height};for(const viewer of viewers)viewer.resize();}};
}

test('accepted physics refresh without an orbit preserves automatic portrait composition',async t=>{
 const f=await fixture(t);closeDirection(direction(f.viewers[0].cameraPose()),new THREE.Vector3(0,1,.65).normalize());
 f.change('fuel-magneticT',.6);await f.ui.run();await flush();
 f.resize(320,740);
 closeDirection(direction(f.viewers[0].cameraPose()),new THREE.Vector3(1,.65,.45).normalize());
});

test('accepted physics refresh preserves an explicitly owned camera through reload and resize',async t=>{
 const f=await fixture(t),pose={position:[.4,.8,.6],target:[.1,0,0],up:[0,1,0]};
 f.viewers[0].setCamera(pose);const before=f.viewers[0].cameraPose();
 f.change('fuel-magneticT',.6);await f.ui.run();await flush();
 closePose(f.viewers[0].cameraPose(),before);
 f.resize(320,740);closeDirection(direction(f.viewers[0].cameraPose()),direction(before));
 f.resize(1000,600);
 const after=f.viewers[0].cameraPose();
 assert.ok(new THREE.Vector3(...after.position).distanceTo(new THREE.Vector3(...before.position))<1e-9);
 assert.ok(new THREE.Vector3(...after.target).distanceTo(new THREE.Vector3(...before.target))<1e-12);
});

test('reference drive glyphs use the final scheduled current after leaving a cut-power transient',async t=>{
 const f=await fixture(t);f.change('fuel-motion-time',.4);(f.doc.getElementById('fuel-power') as HTMLButtonElement).click();await f.ui.run();await flush();
 assert.equal(f.built.at(-1).tools.drive.state.currentA,0);
 for(const mode of ['equilibrium','flow']){
  f.change('fuel-motion-mode',mode,'change');
  assert.equal(f.ui.latest.result.samples.at(-1).currentA,0);
  assert.equal(f.built.at(-1).tools.drive.state.currentA,0,`${mode} reference current must agree with the final scheduled reference state.`);
  assert.equal(f.built.at(-1).tools.drive.group.getObjectByName('J').visible,false);
  f.change('fuel-motion-mode','transport','change');f.change('fuel-motion-time',.8);
  assert.equal(f.built.at(-1).tools.drive.state.currentA,0);
 }
});

test('pinned comparisons retain a shared SI camera after portrait resize with different geometry',async t=>{
 const f=await fixture(t);(f.doc.querySelector('[aria-label="Pin accepted experiment as comparison A"]') as HTMLButtonElement).click();await flush();
 assert.equal(f.viewers.length,2);
 f.change('fuel-radiusM',.2);await f.ui.run();await flush();
 f.resize(320,740);
 const current=f.viewers[0].cameraPose(),pinned=f.viewers[1].cameraPose();
 closePose(pinned,current);
});

test('hidden tracers retain accepted clocks without geometry writes and refresh on reveal',()=>{
 const rotor=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA:.06});
 const result={...rotor,transport:simulateFuelTransport(rotor,{cells:64,steps:256})};
 const motion=createFuelMotion(result),reference=createFuelMotion(result);
 const attributes=(value:any)=>{const found:THREE.BufferAttribute[]=[];value.group.traverse((o:any)=>{if(o.geometry)found.push(o.geometry.attributes.position);});return found;};
 try{
  motion.update(.1,'transport');
  for(const [mode,time] of [['transport',.7],['equilibrium',.8]] as const){
   const before=attributes(motion).map(a=>({attribute:a,version:a.version,array:a.array.slice()}));
   motion.group.visible=false;
   const state=motion.update(time,mode,.0123),expected=fuelMotionState(result,time,mode);
   assert.deepEqual(state,{...expected,secondsPerScreenSecond:.0123});
   assert.notEqual(state.phases.neutral,fuelMotionState(result,.1,'transport').phases.neutral);
   for(const item of before){assert.equal(item.attribute.version,item.version);assert.deepEqual(item.attribute.array,item.array);}
   motion.group.visible=true;motion.update(time,mode,.0123);reference.update(time,mode,.0123);
   const actual=attributes(motion),wanted=attributes(reference);assert.equal(actual.length,wanted.length);
   for(let i=0;i<actual.length;i++)assert.deepEqual(actual[i].array,wanted[i].array);
  }
 }finally{
  for(const value of [motion,reference])value.group.traverse((o:any)=>{o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose();});
 }
});

test('hardware descriptions distinguish evolving lumped temperatures from prescribed references',()=>{
 const rotor=simulateFuelCentrifuge(DEFAULT_FUEL_CENTRIFUGE);
 for(const enabled of [false,true]){
  const result={...rotor,transport:simulateFuelOperation(rotor,{schemaVersion:1,events:[],thermal:{...DEFAULT_FUEL_THERMAL,enabled}},{cells:8,steps:16})};
  const built=geometry.buildFuelCentrifugeGeometry({config:result.config,result});
  try{
   const liner=built.scene.getObjectByName('Lithium refractory sub-vessel')!;
   assert.equal(liner.userData.temperatureK,result.config.linerK);
   assert.match(liner.userData.purpose,enabled?/Initial liner .*evolving liner temperature is a lumped reservoir/:/Prescribed reference liner .*no temperature evolution/);
   assert.match(liner.userData.purpose,/spatial thermal field/);
   const s=result.transport.snapshots.at(-1)!;
   assert.equal(sampleFuelField(result,0,s).scope,'Coupled rotor and radial transport · reflecting wall');
  }finally{built.scene.traverse((o:any)=>{o.geometry?.dispose();for(const material of o.material?Array.isArray(o.material)?o.material:[o.material]:[])material.dispose();});}
 }
 assert.doesNotMatch(geometry.FUEL_COMPONENTS.find(c=>c.id==='motion')!.purpose,/together at fixed temperature/);
 assert.match(geometry.FUEL_COMPONENTS.find(c=>c.id==='cooling')!.purpose,/wall-to-coolant conductance/);
});

test('resolved rotation clock includes accepted checkpoint-only current-pulse speed peaks',()=>{
 const rotor=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA:0});
 const transport=simulateFuelOperation(rotor,{schemaVersion:1,events:[{timeS:0,currentA:.06},{timeS:.2,currentA:0}]},{cells:16,steps:64});
 const endpoints=[transport.snapshots[0],transport.snapshots.at(-1)!];
 const full={...rotor,transport:{...transport,snapshots:endpoints}},state=fuelMotionState(full,0,'transport');
 const peak=Math.max(...transport.checkpoints!.flatMap(s=>[Math.abs(s.ionRadS),Math.abs(s.neutralRadS)]));
 const endpointPeak=Math.max(...endpoints.flatMap(s=>[Math.abs(s.ionRadS),Math.abs(s.neutralRadS)]));
 assert.ok(peak>endpointPeak*1.1,'pulse peak is absent from the compact plotting snapshots');
 assert.ok(peak*state.secondsPerScreenSecond<=1.8*(1+1e-12));
 const neutralPeak=Math.max(...transport.checkpoints!.map(s=>Math.abs(s.neutralRadS)))*rotor.config.radiusM;
 assert.ok(neutralPeak>Math.max(...endpoints.map(s=>Math.abs(s.neutralRadS)))*rotor.config.radiusM*1.1);
 assert.equal(comparisonDomain([full],'speed')[1],neutralPeak,'the fixed color range must include a pulse peak omitted from plotting snapshots');
 const legacy={...rotor,transport:{...transport,checkpoints:undefined}};
 assert.equal(fuelMotionState(legacy,0,'transport').secondsPerScreenSecond,fuelMotionState({...rotor,transport},0,'transport').secondsPerScreenSecond);
 for(const layer of ['speed','density'] as const)assert.deepEqual(comparisonDomain([legacy],layer),comparisonDomain([{...rotor,transport}],layer));
});

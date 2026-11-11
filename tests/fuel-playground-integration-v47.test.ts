import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import * as THREE from 'three';
import {setupFuelCentrifuge} from '../src/fuel-centrifuge-ui.js';
import * as geometry from '../src/fuel-centrifuge-geometry.js';
import {simulateFuelCentrifuge} from '../src/fuel-centrifuge.ts';
import {simulateFuelTransport,sampleFuelTransport,fuelTransportCDF} from '../src/fuel-transport.ts';
import {comparisonDomain,computeFuelOperatingMap} from '../src/fuel-experiments.ts';

const identity={schemaVersion:1,algorithm:'sha256',sourceHash:'a'.repeat(64),sourceFiles:{'src/fuel-centrifuge.ts':'b'.repeat(64)}};
const clone=<T>(value:T):T=>structuredClone(value);
const close=(a:number,b:number,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} ≠ ${b}`);
const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};

/** Only browser display I/O is fake. Geometry, tracers, diagnostic adapters and worker calculations are real. */
function fixture(t:any){
 const dom=new JSDOM('<!doctype html><main></main>',{url:'https://example.org/?level=2'}),{window}=dom;
 Object.defineProperty(window,'matchMedia',{value:()=>({matches:true,addEventListener(){},removeEventListener(){}})});
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:window.document,configurable:true});
 const requests:any[]=[],viewers:any[]=[],builds:any[]=[];let failNext=false;
 function release(scene:THREE.Group|undefined){
  if(!scene)return;const resources=new Set<any>();scene.traverse((object:any)=>{if(object.geometry)resources.add(object.geometry);for(const material of object.material?Array.isArray(object.material)?object.material:[object.material]:[]){resources.add(material);for(const value of Object.values(material) as any[])if(value?.isTexture)resources.add(value);}});for(const resource of resources)resource.dispose();
 }
 const graphics=[{createApparatusViewer:(frame:any,options:any)=>{
  const record:any={frame,options,asset:null,built:null,pose:{position:[0,0,0],target:[0,0,0],up:[0,1,0]},cameraSets:[],loads:[],animation:null,disposed:false,selection:null};
  record.api={async load(asset:any){
   record.animation=null;release(record.built?.scene);record.asset=asset;record.loads.push(asset);
   record.built=await options.loader.loadAsync(asset.model);
   // Model the viewer's post-load fit rather than pretending its uninitialized origin is a usable pose.
   const c=asset.model.config;record.pose={position:[c.lengthM*1.5,c.radiusM*6,c.lengthM],target:[0,0,0],up:[0,1,0]};
  },cameraPose:()=>clone(record.pose),setCamera:(pose:any)=>{if(pose){record.cameraSets.push(clone(pose));record.pose=clone(pose);}},
   setAnimation:(fn:any)=>{record.animation=fn;},refresh(){},resize(){},select:(id:any)=>{record.selection=id;},reset(){},
   dispose(){if(record.disposed)return;record.disposed=true;release(record.built?.scene);}};
  record.userCamera=(pose:any)=>{record.pose=clone(pose);options.onCamera?.(clone(pose));};viewers.push(record);return record.api;
 }},{...geometry,buildFuelCentrifugeGeometry:(value:any)=>{const built=geometry.buildFuelCentrifugeGeometry(value);builds.push({value,...built});return built;}}];
 const request=async(record:any,signal:any)=>{
  requests.push({record:clone(record),signal});
  if(failNext){failNext=false;throw new Error('Explicit worker failure');}
  if(record.kind==='fuel-operating-map')return {result:computeFuelOperatingMap(record.config,record.options),producingCode:identity};
  assert.equal(record.kind,'fuel-centrifuge');const result=simulateFuelCentrifuge(record.config);
  return {result:{...result,...(record.includeTransport?{transport:simulateFuelTransport(result,{cells:64,steps:128})}:{})},producingCode:identity};
 };
 const ui=setupFuelCentrifuge({document:window.document,request,loadGraphics:async()=>graphics});
 const node=(id:string)=>{const n=window.document.getElementById(id);assert.ok(n,id);return n as any;};
 const change=(id:string,value:string|number,type='input')=>{node(id).value=String(value);node(id).dispatchEvent(new window.Event(type,{bubbles:true}));};
 const check=(id:string,value:boolean)=>{node(id).checked=value;node(id).dispatchEvent(new window.Event('change',{bubbles:true}));};
 const start=async()=>{ui.setActive(true);await flush();assert.ok(ui.latest,ui.nodes.render.textContent);assert.equal(viewers.length,1);assert.ok(viewers[0].built.tools);};
 t.after(()=>{ui.dispose();window.close();if(old)Object.defineProperty(globalThis,'document',old);else Reflect.deleteProperty(globalThis,'document');});
 return {ui,window,requests,viewers,builds,node,change,check,start,failOnce(){failNext=true;}};
}

test('real apparatus initially keeps the viewer fit and preserves the user SI pose after a physical change',async t=>{
 const f=fixture(t);await f.start();const v=f.viewers[0];
 assert.equal(f.node('fuel-motion-mode').value,'transport');assert.equal(f.node('fuel-motion-time').hidden,false);
 assert.deepEqual(v.asset.modelCamera.position,[0,1,.65]);assert.equal(v.built.tools.group.userData.staging.cutaway,.62);
 assert.equal(v.cameraSets.length,0,'first load must not restore the pre-fit origin');assert.ok(Math.hypot(...v.pose.position)>0);
 const pose={position:[.8,.5,-.7],target:[.03,.01,0],up:[0,1,0]};v.userCamera(pose);
 const first=v.built.scene;f.change('fuel-currentA',.05);await f.ui.run();
 assert.notEqual(v.built.scene,first);assert.equal(f.ui.latest.result.config.currentA,.05);assert.deepEqual(v.pose,pose);assert.deepEqual(v.cameraSets.at(-1),pose);
 assert.equal(v.built.scene.userData.gasRadiusM,f.ui.latest.result.config.radiusM);
});

test('picked pump exposes physical numeric units and preserves the same focused contextual control across recompute',async t=>{
 const f=fixture(t);await f.start();const v=f.viewers[0],pump=v.built.scene.getObjectByName('Downstream exhaust pump');assert.ok(pump);
 v.options.onSelect('pump',pump.userData,pump.name);
 const number=f.ui.nodes.inspect.querySelector('input[type=number][data-key=pumpSpeedM3S]') as HTMLInputElement;
 assert.ok(number);close(Number(number.value),f.ui.latest.result.config.pumpSpeedM3S);assert.match(number.getAttribute('aria-label')!,/m³\/s/);
 assert.equal(Number(number.min),.001);assert.equal(Number(number.max),1);
 number.focus();number.value='.04';number.dispatchEvent(new f.window.Event('change',{bubbles:true}));await f.ui.run();
 close(f.requests.at(-1).record.config.pumpSpeedM3S,.04);close(f.ui.latest.result.config.pumpSpeedM3S,.04);
 assert.equal(f.ui.nodes.inspect.querySelector('input[type=number][data-key=pumpSpeedM3S]'),number);assert.equal(f.window.document.activeElement,number);
 close(Number(f.node('fuel-pumpSpeedM3S').value),Math.log10(.04));
 close(v.built.scene.getObjectByName('Downstream exhaust pump').userData.prescribedSpeedM3S,.04);
});

test('plot location reveals accepted SI fields without recomputing or changing shared physical time',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-motion-time',.6);const count=f.requests.length,tools=f.viewers[0].built.tools;
 f.change('fuel-plot','inertia','change');f.node('fuel-locate-plot').click();assert.equal(f.requests.length,count);assert.equal(Number(f.node('fuel-motion-time').value),.6);
 assert.equal(tools.group.visible,true);assert.equal(tools.legend.layer,'density');assert.equal(tools.sampleAt(.06).timeS,.6);
 assert.equal(f.viewers[0].selection,'slice');assert.equal(f.node('fuel-view-representation').value,'both');
});

test('keyboard time-plot endpoints synchronize physical seek time, gas mode and real diagnostic fields',async t=>{
 const f=fixture(t);await f.start();const r=f.ui.latest.result,v=f.viewers[0],count=f.requests.length;
 const endpoint=(topic:string,key='End')=>{f.change('fuel-plot',topic,'change');f.ui.nodes.plots.querySelector('svg')!.dispatchEvent(new f.window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));};
 for(const topic of ['spin','heat']){
  endpoint(topic);assert.equal(f.node('fuel-motion-mode').value,topic==='spin'?'spin':'transport');close(Number(f.node('fuel-motion-time').value),r.config.durationS);
  const expected=r.transport.snapshots.at(-1).neutralRadS;
  close(v.built.tools.sampleAt(r.config.radiusM*.5).speedMS,expected*r.config.radiusM*.5);
 }
 endpoint('separation','Home');assert.equal(f.node('fuel-motion-mode').value,'transport');assert.equal(Number(f.node('fuel-motion-time').value),0);assert.equal(v.built.tools.sampleAt(0).timeS,0);
 endpoint('separation');assert.equal(f.node('fuel-motion-mode').value,'transport');close(Number(f.node('fuel-motion-time').value),r.config.durationS);assert.match(v.built.tools.legend.scope,/Coupled rotor and radial transport/);
 assert.equal(f.requests.length,count,'plot inspection is display-only');
});

test('pinned real apparatus stays immutable while both viewers share camera, physical time and color domains',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-motion-mode','transport','change');f.change('fuel-motion-time',.4);
 const pin=f.ui.nodes.view.querySelector('button[aria-label="Pin accepted experiment as comparison A"]') as HTMLButtonElement;assert.equal(pin.disabled,false);pin.click();await flush();assert.equal(f.viewers.length,2);
 const a=f.viewers[1],b=f.viewers[0],original=a.asset.model.result,config=clone(original.config);
 assert.ok(Object.isFrozen(original));assert.ok(Object.isFrozen(original.config));
 f.change('fuel-currentA',.06);await f.ui.run();await flush();
 assert.deepEqual(a.asset.model.config,config);assert.equal(a.asset.model.config.currentA,.03);assert.equal(b.asset.model.config.currentA,.06);
 f.change('fuel-motion-time',.7);close(a.built.tools.sampleAt(0).timeS,.7);close(b.built.tools.sampleAt(0).timeS,.7);
 const pose={position:[.7,1.1,.8],target:[0,.02,0],up:[0,1,0]};b.userCamera(pose);assert.deepEqual(a.pose,pose);
 const reverse={position:[.9,.8,.5],target:[0,0,0],up:[0,1,0]};a.userCamera(reverse);assert.deepEqual(b.pose,reverse);
 const axial=[...f.ui.nodes.view.querySelectorAll('button')].find(button=>button.textContent==='Axial')!;axial.click();assert.deepEqual(a.pose,b.pose);assert.equal(a.pose.position[1],a.pose.target[1]);assert.equal(a.pose.position[2],a.pose.target[2]);
 for(const layer of ['composition','density','speed']){
  f.change('fuel-view-layer',layer,'change');f.change('fuel-motion-time',.7);
  const expected=comparisonDomain([a.asset.model.result,b.asset.model.result],layer as any);
  assert.deepEqual(a.built.tools.legend.domain,expected);assert.deepEqual(b.built.tools.legend.domain,expected);
 }
 assert.match(f.ui.nodes.render.querySelector('.fuel-comparison-label')!.textContent!,/shared SI camera\/colors/);
 assert.deepEqual(original.config,config);
});

test('presentation controls move only diagnostic/display geometry and never dispatch a solver calculation',async t=>{
 const f=fixture(t);await f.start();const v=f.viewers[0],r=f.ui.latest.result,before=JSON.stringify(r),count=f.requests.length;
 const cloud=v.built.motion.group.children.find((o:any)=>o.userData.tracers&&!o.userData.ion) as THREE.Group;
 const positions=(cloud.children[0] as THREE.Points).geometry.attributes.position.array.slice();
 f.check('fuel-view-visible',true);f.change('fuel-view-slice',.2);f.change('fuel-view-cutaway',.8);f.change('fuel-view-explode',.7);f.check('fuel-view-ghost',true);f.change('fuel-view-layer','density','change');f.change('fuel-view-species','heavy','change');
 assert.equal(f.requests.length,count);assert.equal(JSON.stringify(f.ui.latest.result),before);assert.deepEqual((cloud.children[0] as THREE.Points).geometry.attributes.position.array,positions);
 assert.equal(v.built.tools.group.visible,true);close(v.built.tools.group.position.z,r.config.lengthM*.2);
 const wall=v.built.scene.getObjectByName('Vessel pressure wall') as THREE.Mesh<any,THREE.Material>;assert.equal(wall.material.opacity,.14);assert.equal(wall.material.clippingPlanes!.length,1);
 const numericalRadius=v.built.tools.sampleAt(r.config.radiusM).radiusM;assert.equal(numericalRadius,r.config.radiusM);assert.ok(v.built.tools.legend.axialUniform);
});

test('transport seek updates the plotted profiles, cellwise probes and actual neutral cloud radii from the same snapshot',async t=>{
 const f=fixture(t);await f.start();const v=f.viewers[0],r=f.ui.latest.result,R=r.config.radiusM;
 f.change('fuel-view-representation','both','change');assert.equal(v.built.motion.group.visible,true);
 f.change('fuel-motion-mode','transport','change');f.change('fuel-plot','profile','change');f.change('fuel-motion-time',0);
 const curve=()=>f.ui.nodes.plots.querySelector('svg path[stroke-width="2"]')!.getAttribute('d'),initialCurve=curve();
 const clouds=v.built.motion.group.children.filter((o:any)=>o.userData.tracers&&!o.userData.ion) as THREE.Group[];
 const first=(clouds[0].children[0] as THREE.Points).geometry.attributes.position,initialRadius=Math.hypot(first.getX(0),first.getY(0));
 f.change('fuel-motion-time',r.config.durationS);const sample=sampleFuelTransport(r.transport,r.config.durationS);
 assert.notEqual(curve(),initialCurve);assert.notEqual(Math.hypot(first.getX(0),first.getY(0)),initialRadius);
 for(const cloud of clouds){
  const species=cloud.userData.species,mass=species?sample.heavyMass:sample.lightMass,points=(cloud.children[0] as THREE.Points).geometry.attributes.position,n=cloud.userData.tracers;
  for(let i=0;i<n;i+=Math.max(1,Math.floor(n/11))){const radius=Math.hypot(points.getX(i),points.getY(i));close(fuelTransportCDF(mass,Math.min(1,radius/R)),(i+.5)/n,2e-6);}
  assert.equal(cloud.children[2].visible,true,'rotation-averaged gas rings must use the transported radii');
 }
 const radius=R*.8,cell=Math.min(sample.lightMass.length-1,Math.floor((radius/R)**2*sample.lightMass.length)),x=r.config.lightFraction;
 const light=sample.lightMass[cell]*sample.lightMass.length,heavy=sample.heavyMass[cell]*sample.heavyMass.length,total=x*light+(1-x)*heavy,probe=v.built.tools.sampleAt(radius);
 close(probe.densityM3,r.config.pressurePa/(1.380649e-23*r.config.gasK)*total);close(probe.lightFraction,x*light/total);close(probe.timeS,sample.timeS);close(probe.speedMS,sample.neutralRadS*radius);
 assert.equal(v.built.motion.group.children.filter((o:any)=>o.name==='Schematic throughput packets').every(o=>!o.visible),true);
 assert.match(f.ui.nodes.plots.querySelector('.fuel-explanation')!.textContent!,/no local fluid momentum or extraction solution/);
});

test('operating-map cells apply real accepted physical configurations and recompute meshes deliberately',async t=>{
 const f=fixture(t);await f.start();const generate=[...f.ui.nodes.view.querySelectorAll('button')].find(button=>button.textContent==='Generate')!;generate.click();await flush();
 const request=f.requests.at(-1).record;assert.equal(request.kind,'fuel-operating-map');assert.equal(request.config.currentA,.03);
 const cells=[...f.ui.nodes.view.querySelectorAll('.fuel-map-cell')] as HTMLButtonElement[];assert.equal(cells.length,49);assert.equal(f.ui.latest.result.config.currentA,.03);
 const point=cells.find(button=>button.dataset.status==='valid'&&Number(button.dataset.ix)>0&&Number(button.dataset.iy)>0)!;assert.ok(point);assert.match(point.getAttribute('aria-label')!,/Magnetic field.*T.*Discharge current.*A/);
 point.click();await f.ui.run();const result=f.ui.latest.result;assert.equal(request.options.xKey,'magneticT');close(result.config.magneticT,.05+(2-.05)*Number(point.dataset.ix)/6);
 assert.equal(f.node('fuel-magneticT').step,'any','exact map axes must not be quantized by a native range step');
 close(result.config.currentA,.2*Number(point.dataset.iy)/6);assert.equal(f.viewers[0].asset.model.result,result);
 for(const path of f.ui.nodes.plots.querySelectorAll('path'))assert.doesNotMatch(path.getAttribute('d')??'',/NaN|Infinity/);
});
test('exact contextual physical entry preserves decimal text and bypasses native range-step rounding',async t=>{
 const f=fixture(t);await f.start();f.viewers[0].options.onSelect('coils');
 const input=f.ui.nodes.inspect.querySelector('input[type=number]') as HTMLInputElement;input.focus();input.value='0.5300';input.dispatchEvent(new f.window.Event('input',{bubbles:true}));
 assert.equal(input.value,'0.5300');assert.equal(f.node('fuel-magneticT').step,'any');await f.ui.run();assert.equal(f.ui.latest.result.config.magneticT,.53);
});
test('Clear remains safe after a failed current computation with a pinned accepted baseline',async t=>{
 const f=fixture(t);await f.start();const errors:any[]=[];f.window.addEventListener('error',event=>errors.push(event.error));
 (f.ui.nodes.view.querySelector('button[aria-label="Pin accepted experiment as comparison A"]') as HTMLButtonElement).click();await flush();
 f.failOnce();f.change('fuel-currentA',.05);await f.ui.run();assert.equal(f.ui.latest,null);
 [...f.ui.nodes.view.querySelectorAll('button')].find(button=>button.textContent==='Clear')!.click();assert.deepEqual(errors,[]);assert.equal(f.ui.nodes.render.querySelector('.fuel-baseline')!.hasAttribute('hidden'),true);
});
test('Transport cut plots show the current inventory rather than the final equilibrium cut',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-motion-mode','transport','change');f.change('fuel-plot','cut','change');f.change('fuel-motion-time',0);
 const metric=()=>Number(f.ui.nodes.plots.querySelector('.fuel-metrics strong')!.textContent);close(metric(),f.ui.latest.result.config.lightFraction,.001);
 f.change('fuel-motion-time',1);close(metric(),sampleFuelTransport(f.ui.latest.result.transport,1).collection.innerLightPurity!,.001);
 assert.match(f.ui.nodes.plots.querySelector('.fuel-explanation')!.textContent!,/Current closed-wall inventory/);
});

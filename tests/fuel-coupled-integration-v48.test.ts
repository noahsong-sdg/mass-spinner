import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import * as THREE from 'three';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge,rotorResponse,rotorPhase} from '../src/fuel-centrifuge.js';
import {simulateFuelTransport,sampleFuelTransport} from '../src/fuel-transport.js';
import {fuelMotionState,createFuelMotion} from '../src/fuel-motion.js';
import {sampleFuelField} from '../src/fuel-scene-tools.js';
import {comparisonDomain,pinFuelExperiment} from '../src/fuel-experiments.js';
import {setupFuelCentrifuge} from '../src/fuel-centrifuge-ui.js';
import * as geometry from '../src/fuel-centrifuge-geometry.js';

const close=(a:number,b:number,tol=2e-10)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} != ${b}`);
function result(){
 const reference=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA:.06,lightFraction:.5});
 return {...reference,transport:simulateFuelTransport(reference,{cells:48,steps:256})};
}
function release(scene:THREE.Object3D){
 const resources=new Set<any>();scene.traverse((o:any)=>{if(o.geometry)resources.add(o.geometry);for(const m of o.material?Array.isArray(o.material)?o.material:[o.material]:[]){resources.add(m);for(const v of Object.values(m) as any[])if(v?.isTexture)resources.add(v);}});
 for(const resource of resources)resource.dispose();
}

test('live transient adapters consume coupled moments and phases instead of the old fixed-inertia rotor',()=>{
 const r=result(),m=r.mechanics,old=rotorResponse(m.ii,m.nn,m.gamma,m.drag,m.torque,r.config.durationS);
 assert.ok(Math.abs(r.transport.snapshots.at(-1)!.neutralRadS/old.neutral-1)>1e-4,'the case must actually discriminate the old fixed-inertia path');
 for(const mode of ['spin','transport'])for(const time of [0,.137,.5,1]){
  const sample=sampleFuelTransport(r.transport,time),state=fuelMotionState(r,time,mode);
  close(state.speeds.ion,sample.ionRadS);close(state.speeds.neutral,sample.neutralRadS);
  close(state.phases.ion,sample.ionPhaseRad);close(state.phases.neutral,sample.neutralPhaseRad);
  const probe=sampleFuelField(r,r.config.radiusM*.7,sample);
  close(probe.speedMS,sample.neutralAngularMomentumKgM2S/sample.neutralInertiaKgM2*r.config.radiusM*.7);
  close(probe.timeS,time);
 }
});

test('spin and averaged transport retain identical evolving neutral radii and no solved external extraction',()=>{
 const r=result(),motion=createFuelMotion(r);
 try{
  const neutrals=motion.group.children.filter((o:any)=>o.userData.tracers&&!o.userData.ion);
  for(const time of [.137,.7,1]){
   motion.update(time,'transport');
   const radii=neutrals.map((cloud:any)=>{const a=cloud.children[0].geometry.attributes.position;return Array.from({length:a.count},(_,i)=>Math.hypot(a.getX(i),a.getY(i)));});
   motion.update(time,'spin');
   neutrals.forEach((cloud:any,species)=>{const a=cloud.children[0].geometry.attributes.position;for(let i=0;i<a.count;i++)close(Math.hypot(a.getX(i),a.getY(i)),radii[species][i],2e-7);});
   assert.ok(motion.group.children.filter(o=>o.name==='Schematic throughput packets').every(o=>!o.visible));
  }
 }finally{release(motion.group);}
});

test('reference-only accepted results keep their explicitly analytic motion path',()=>{
 const r=simulateFuelCentrifuge(DEFAULT_FUEL_CENTRIFUGE),m=r.mechanics,args=[m.ii,m.nn,m.gamma,m.drag,m.torque,.137] as const;
 const expected=rotorResponse(...args),phase=rotorPhase(...args),actual=fuelMotionState(r,.137,'spin');
 close(actual.speeds.ion,expected.ion);close(actual.speeds.neutral,expected.neutral);
 close(actual.phases.ion,phase.ion);close(actual.phases.neutral,phase.neutral);
});

test('shared quantitative color scales bound accepted transient samples as well as equilibrium references',()=>{
 const r=result(),sample=r.transport.snapshots.at(-1)!;
 // Deliberately distinguish the accepted-data display contract from a presumed
 // ordering between this closure and its separately computed reference model.
 sample.neutralRadS=3*Math.max(...r.samples.map(p=>p.neutralRadS));
 sample.lightMass=sample.lightMass.map((_,i)=>i===0?1:0);
 sample.heavyMass=sample.heavyMass.map((_,i)=>i===0?1:0);
 const expectedDensity=r.config.pressurePa/(1.380649e-23*r.config.gasK)*r.transport.cells;
 assert.ok(comparisonDomain([r],'speed')[1]>=sample.neutralRadS*r.config.radiusM);
 assert.ok(comparisonDomain([r],'density')[1]>=expectedDensity);
});

test('pinned accepted data owns the coupled conservation history independently of later mutation',()=>{
 const r=result(),pin=pinFuelExperiment({result:r},{timeS:.137,mode:'transport'}),before=structuredClone((pin.result as typeof r).transport);
 r.transport.snapshots.at(-1)!.neutralAngularMomentumKgM2S=0;
 r.transport.snapshots.at(-1)!.lightMass[0]=123;
 assert.deepEqual((pin.result as typeof r).transport,before);
 assert.ok(Object.isFrozen((pin.result as typeof r).transport.snapshots.at(-1)!.angularMomentum));
});

test('accepted UI momentum and inertia plots expose coupled budgets, and playback does not recalculate physics',async t=>{
 const dom=new JSDOM('<!doctype html><main></main>',{url:'https://example.org/?level=2'}),{window}=dom;
 Object.defineProperty(window,'matchMedia',{value:()=>({matches:true,addEventListener(){},removeEventListener(){}})});
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:window.document,configurable:true});
 const accepted=result(),builds:any[]=[],requests:any[]=[];
 const graphics=[{createApparatusViewer:(_frame:any,options:any)=>({
  async load(asset:any){const built=await options.loader.loadAsync(asset.model);builds.push(built);},
  setAnimation(){},refresh(){},resize(){},select(){},reset(){},cameraPose:()=>({position:[1,1,1],target:[0,0,0]}),setCamera(){},dispose(){},
 })},geometry];
 const ui=setupFuelCentrifuge({document:window.document,request:async(record:any)=>{requests.push(record);return {result:accepted};},loadGraphics:async()=>graphics});
 t.after(()=>{ui.dispose();builds.forEach(b=>release(b.scene));window.close();if(old)Object.defineProperty(globalThis,'document',old);else Reflect.deleteProperty(globalThis,'document');});
 ui.setActive(true);for(let i=0;i<30;i++)await Promise.resolve();
 assert.ok(ui.latest);assert.equal(requests.length,1);assert.equal(requests[0].includeTransport,true);
 const select=window.document.getElementById('fuel-plot') as HTMLSelectElement;
 for(const key of ['momentum','inertia']){
  assert.ok([...select.options].some(option=>option.value===key),`missing ${key} plot`);
  select.value=key;select.dispatchEvent(new window.Event('change',{bubbles:true}));
  assert.ok(ui.nodes.plots.querySelector('svg'));assert.doesNotMatch(ui.nodes.plots.textContent!,/NaN|Infinity|Omitted inertia feedback/);
  for(const path of ui.nodes.plots.querySelectorAll('path'))assert.doesNotMatch(path.getAttribute('d')??'',/NaN|Infinity/);
 }
 const mode=window.document.getElementById('fuel-motion-mode') as HTMLSelectElement;mode.value='transport';mode.dispatchEvent(new window.Event('change',{bubbles:true}));
 const seek=window.document.getElementById('fuel-motion-time') as HTMLInputElement;seek.value='.137';seek.dispatchEvent(new window.Event('input',{bubbles:true}));
 assert.equal(requests.length,1,'time inspection must consume accepted coupled output');
 assert.doesNotMatch(ui.nodes.render.textContent!,/imposed rotation|prescribed rotation|no mixture momentum feedback/);
 const component=window.document.getElementById('fuel-component') as HTMLSelectElement;
 component.value='motion';component.dispatchEvent(new window.Event('change',{bubbles:true}));
 assert.doesNotMatch(ui.nodes.inspect.textContent!,/Spin-up keeps density uniform|prescribed rotation|without mixture momentum feedback/);
 assert.match(ui.nodes.inspect.textContent!,/coupled|angular momentum/i);
 const probe=builds.at(-1).tools.sampleAt(accepted.config.radiusM*.5),sample=sampleFuelTransport(accepted.transport,.137);
 close(probe.speedMS,sample.neutralRadS*accepted.config.radiusM*.5);close(probe.timeS,.137);
});

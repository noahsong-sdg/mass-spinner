import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge,type FuelConfig} from '../src/fuel-centrifuge.js';
import {comparisonDomain,comparisonFrame,computeFuelOperatingMap,FUEL_MAP_METRICS,pinFuelExperiment} from '../src/fuel-experiments.js';

const identity={schemaVersion:1 as const,algorithm:'sha256' as const,sourceHash:'a'.repeat(64),sourceFiles:{'src/fuel-centrifuge.ts':'b'.repeat(64)}};
const accepted=(changes:Partial<FuelConfig>={})=>({result:simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,...changes}),producingCode:structuredClone(identity)});
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<=1e-12*Math.max(1,Math.abs(b)),`${a} != ${b}`);

test('pinning captures only accepted state with immutable nested config, result, camera and source identity',()=>{
 const original=accepted(),camera={position:[1,2,3],target:[0,0,0],up:[0,1,0]};
 const pin=pinFuelExperiment(original,{camera,timeS:.5,mode:'spin'});
 original.result.config.currentA=.19;original.result.profiles[0].lightDensityRatio=900;
 original.producingCode.sourceFiles['src/fuel-centrifuge.ts']='c'.repeat(64);camera.position[0]=9;
 assert.equal(pin.config.currentA,DEFAULT_FUEL_CENTRIFUGE.currentA);
 assert.notEqual(pin.result.profiles[0].lightDensityRatio,900);
 assert.equal(pin.producingCode!.sourceFiles['src/fuel-centrifuge.ts'],'b'.repeat(64));
 assert.equal(pin.camera!.position[0],1);assert.equal(pin.timeS,.5);assert.equal(pin.mode,'spin');
 assert.equal(pin.config,pin.result.config);
 for(const value of [pin,pin.result,pin.config,pin.result.profiles,pin.result.profiles[0],pin.camera,pin.camera!.position,pin.producingCode!.sourceFiles])
  assert.ok(Object.isFrozen(value));
 assert.throws(()=>{pin.config.currentA=2;},TypeError);
});

test('old accepted results retain missing provenance and pin rejects absent or out-of-range state',()=>{
 const result=accepted().result;
 assert.equal(pinFuelExperiment({result}).producingCode,null);
 assert.equal(pinFuelExperiment({result,producingCode:null}).producingCode,null);
 assert.throws(()=>pinFuelExperiment({result:null as never}),RangeError);
 for(const timeS of [-1,Infinity,result.config.durationS+.01])assert.throws(()=>pinFuelExperiment({result},{timeS}),RangeError);
 assert.throws(()=>pinFuelExperiment({result},{camera:{position:[NaN,0,0],target:[0,0,0]}}),RangeError);
});

test('both cases share physical color scales rather than normalizing each separately',()=>{
 const a=accepted().result,b=structuredClone(a);
 b.config.pressurePa*=3;
 assert.deepEqual(comparisonDomain([a,b],'composition'),[0,1]);
 const densityA=comparisonDomain([a],'density'),densityB=comparisonDomain([b],'density');
 close(densityB[1],3*densityA[1]);assert.deepEqual(comparisonDomain([a,b],'density'),densityB);
 const p=a.profiles.at(-1)!,x=a.config.lightFraction;
 close(densityA[1],a.config.pressurePa/(1.380649e-23*a.config.gasK)*(x*p.lightDensityRatio+(1-x)*p.heavyDensityRatio));
 b.samples.at(-1)!.neutralMS*=2;
 assert.deepEqual(comparisonDomain([a,b],'speed'),[0,b.samples.at(-1)!.neutralMS]);
 const stopped=accepted({currentA:0}).result;
 assert.deepEqual(comparisonDomain([stopped],'speed'),[0,0]);
});

test('comparison keeps the same seconds and world camera while identifying geometry and code changes',()=>{
 const first=accepted({durationS:2}),next=accepted({durationS:.5,radiusM:.2});
 const pin=pinFuelExperiment(first,{camera:{position:[1,0,1],target:[0,0,0]}}),frame=comparisonFrame(pin,next,1.5);
 assert.equal(frame.timeS,.5);assert.equal(frame.timeLimitS,.5);assert.equal(frame.camera,pin.camera);
 assert.equal(frame.lengthUnit,'m');assert.deepEqual(frame.geometryBounds,{radiusM:.2,lengthM:.8});
 assert.equal(frame.sameGeometry,false);assert.deepEqual(frame.changedGeometry,['radiusM']);assert.equal(frame.sameProducingCode,true);
 next.producingCode.sourceHash='d'.repeat(64);assert.equal(comparisonFrame(pin,next,0).sameProducingCode,false);
 assert.equal(comparisonFrame(pin,{result:next.result},0).sameProducingCode,false);
 assert.equal(comparisonFrame(pin,first,0).sameGeometry,true);
 assert.throws(()=>comparisonFrame(pin,next,NaN),RangeError);
});

test('default 9 by 9 study owns full per-cell configurations with exact axes and physical metric units',()=>{
 const config={...DEFAULT_FUEL_CENTRIFUGE},before=structuredClone(config),map=computeFuelOperatingMap(config);
 assert.equal(map.points.length,81);assert.equal(map.x.key,'magneticT');assert.equal(map.y.key,'currentA');
 assert.equal(map.x.values[0],.05);assert.equal(map.x.values[8],2);assert.equal(map.y.values[0],0);assert.equal(map.y.values[8],.2);
 assert.deepEqual(map.domain,[0,1]);assert.deepEqual(config,before);
 for(const point of map.points){
  assert.equal(point.config.magneticT,map.x.values[point.ix]);assert.equal(point.config.currentA,map.y.values[point.iy]);
  if(point.status==='valid'){
   const reference=simulateFuelCentrifuge(point.config);assert.equal(point.value,reference.collection.innerLightPurity);
  }
 }
 const first=map.points[0],last=map.points.at(-1)!;
 first.config.pressurePa=77;assert.equal(config.pressurePa,before.pressurePa);assert.equal(last.config.pressurePa,before.pressurePa);
 assert.match(map.scope,/inventory/i);assert.equal(map.unit,'fraction');
 assert.equal(FUEL_MAP_METRICS.throughput.unit,'Pa·m³/s');
});

test('map values match all conditional solver metrics and scale zero consistently',()=>{
 for(const metric of ['recovery','power','throughput'] as const){
  const map=computeFuelOperatingMap(DEFAULT_FUEL_CENTRIFUGE,{metric,size:2});
  for(const point of map.points){
   assert.equal(point.status,'valid');const r=simulateFuelCentrifuge(point.config);
   const reference=metric==='recovery'?r.collection.lightRecovery:metric==='power'?r.samples.at(-1)!.totalInputW:r.pumping.gasLoadPaM3S;
   close(point.value!,reference);
  }
  assert.equal(map.domain[0],0);
  assert.equal(map.domain[1],metric==='recovery'?1:Math.max(...map.points.map(p=>p.value!)));
 }
});

test('undefined cut purity, invalid solver inputs, and contextual diagnostics remain distinct',()=>{
 const empty=computeFuelOperatingMap({...DEFAULT_FUEL_CENTRIFUGE,cutFraction:0},{size:2});
 assert.ok(empty.points.every(p=>p.status==='valid'&&p.value===null&&p.error===null));
 const partial=computeFuelOperatingMap(DEFAULT_FUEL_CENTRIFUGE,{size:3,xDomain:[-.1,.1]});
 assert.equal(partial.points.filter(p=>p.status==='invalid').length,3);
 assert.ok(partial.points.filter(p=>p.status==='invalid').every(p=>p.value===null&&p.error?.includes('magneticT')));
 const warned=computeFuelOperatingMap({...DEFAULT_FUEL_CENTRIFUGE,durationS:.001},{size:2});
 assert.ok(warned.points.every(p=>p.status==='valid'&&p.diagnostics.includes('radial-relaxation-unresolved')));
 const contextual=(c:FuelConfig)=>{const r=simulateFuelCentrifuge(c);r.mechanics.slipCIV=2;return r;};
 const civ=computeFuelOperatingMap(DEFAULT_FUEL_CENTRIFUGE,{size:2},contextual);
 assert.ok(civ.points.every(p=>p.status==='valid'&&p.diagnostics.includes('civ-reference-exceeded')));
 assert.match(civ.interpretation,/not validated physical failure thresholds/);
 assert.throws(()=>computeFuelOperatingMap(DEFAULT_FUEL_CENTRIFUGE,{size:2},()=>{throw new TypeError('regression');}),/regression/);
});

test('map budget and logarithmic pressure axes obey explicit input boundaries',()=>{
 for(const size of [1,2.1,16,Infinity])assert.throws(()=>computeFuelOperatingMap(DEFAULT_FUEL_CENTRIFUGE,{size}),RangeError);
 assert.throws(()=>computeFuelOperatingMap(DEFAULT_FUEL_CENTRIFUGE,{xKey:'currentA',yKey:'currentA'}),RangeError);
 assert.throws(()=>computeFuelOperatingMap(DEFAULT_FUEL_CENTRIFUGE,{metric:'unknown' as never}),RangeError);
 assert.throws(()=>computeFuelOperatingMap(DEFAULT_FUEL_CENTRIFUGE,{xDomain:[1,1]}),RangeError);
 assert.throws(()=>computeFuelOperatingMap(DEFAULT_FUEL_CENTRIFUGE,{xKey:'pressurePa',xDomain:[0,1]}),RangeError);
 const map=computeFuelOperatingMap(DEFAULT_FUEL_CENTRIFUGE,{size:3,xKey:'pressurePa',yKey:'gasK'});
 close(map.x.values[1],10);assert.equal(map.x.unit,'Pa');assert.equal(map.y.unit,'K');
 assert.deepEqual(map.x.domain,[1,100]);assert.deepEqual(map.y.domain,[300,2000]);
});

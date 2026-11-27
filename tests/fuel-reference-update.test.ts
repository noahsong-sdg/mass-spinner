import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge,type FuelConfig} from '../src/fuel-centrifuge.js';
import {DEFAULT_FUEL_THERMAL,simulateFuelOperation,type FuelOperation} from '../src/fuel-operation.js';
import {fuelTransportCollection,sampleFuelTransport,simulateFuelTransport,type FuelTransportCheckpoint} from '../src/fuel-transport.js';
import {isFuelReferenceInput,updateFuelReferences} from '../src/fuel-reference-update.js';

const config={...DEFAULT_FUEL_CENTRIFUGE,durationS:.1,currentA:.01,linerK:600};
const events=[{timeS:.04,currentA:.02},{timeS:.07,currentA:0}];
const options={cells:8,steps:64};
function fixture(thermal=false){
 const rotor=simulateFuelCentrifuge(config,events);
 const operation:FuelOperation={schemaVersion:1,events,thermal:{...DEFAULT_FUEL_THERMAL,enabled:thermal}};
 return {...rotor,transport:simulateFuelOperation(rotor,operation,options)};
}
const physical=(state:FuelTransportCheckpoint)=>{const {collection:_collection,...rest}=state;return rest;};

test('reference input classification separates physical setup and enabled liner temperature',()=>{
 for(const key of ['application','cutFraction','stages','feedStage','pumpSpeedM3S','conductanceM3S',
  'fusionMW','burnFraction','loopTimeS','linerConductanceWK','lithiumSeed'] as const){
  assert.equal(isFuelReferenceInput(key),true,key);assert.equal(isFuelReferenceInput(key,true),true,key);
 }
 assert.equal(isFuelReferenceInput('linerK'),true);assert.equal(isFuelReferenceInput('linerK',true),false);
 for(const key of ['currentA','durationS','pair','gasK','radiusM','radialDiffusivityM2S'] as const)
  assert.equal(isFuelReferenceInput(key),false,key);
});

test('reference updates retain exact accepted masses, momenta, phases, energy and event history',()=>{
 const result=fixture(),before=JSON.stringify(result),next={...config,stages:12,feedStage:8,cutFraction:.3,
  pumpSpeedM3S:.03,fusionMW:750,linerK:1100,lithiumSeed:true};
 const updated=updateFuelReferences(result,next),transport=updated.transport!,expected=simulateFuelCentrifuge(next,events);
 assert.deepEqual(updated.config,next);assert.deepEqual(updated.cascade,expected.cascade);
 assert.deepEqual(updated.pumping,expected.pumping);assert.deepEqual(updated.fuelCycle,expected.fuelCycle);
 assert.deepEqual(updated.samples,expected.samples);assert.deepEqual(updated.lithium,expected.lithium);
 assert.equal(transport.operation!.events,result.transport.operation!.events);
 assert.equal(transport.operation!.thermal,result.transport.operation!.thermal);
 assert.equal(transport.operation!.initialCurrentA,config.currentA);
 assert.equal(transport.operation!.setup.feedStage,8);assert.equal(transport.cutFraction,.3);
 for(const name of ['snapshots','checkpoints'] as const){
  const prior=result.transport[name]!,current=transport[name]!;assert.equal(current.length,prior.length);
  current.forEach((state,i)=>{
   assert.deepEqual(physical(state),physical(prior[i]));assert.equal(state.lightMass,prior[i].lightMass);
   assert.equal(state.heavyMass,prior[i].heavyMass);assert.equal(state.energy,prior[i].energy);
   assert.deepEqual(state.collection,fuelTransportCollection(state.lightMass,state.heavyMass,next.lightFraction,.3));
  });
 }
 assert.equal(JSON.stringify(result),before,'A reference update must not change the accepted source or pinned references.');
 const unchangedCut=updateFuelReferences(result,{...config,stages:6});
 assert.equal(unchangedCut.transport!.snapshots,result.transport.snapshots);
 assert.equal(unchangedCut.transport!.checkpoints,result.transport.checkpoints);
});

test('projected cuts remain correct at accepted and interpolated times, including empty, full and pure inventories',()=>{
 for(const lightFraction of [0,.0759,1]){
  const rotor=simulateFuelCentrifuge({...config,lightFraction}),transport=simulateFuelTransport(rotor,options),result={...rotor,transport};
  for(const cutFraction of [0,.31,1]){
   const next=updateFuelReferences(result,{...rotor.config,cutFraction},[]);
   for(const time of [0,.05321,.1]){
    const original=sampleFuelTransport(transport,time),sample=sampleFuelTransport(next.transport!,time);
    assert.deepEqual(physical(sample),physical(original));
    assert.deepEqual(sample.collection,fuelTransportCollection(original.lightMass,original.heavyMass,lightFraction,cutFraction));
   }
  }
 }
});

test('reference metadata permits a subsequent current intervention without changing the physical continuation',()=>{
 const result=fixture(),nextConfig={...config,cutFraction:.27,stages:8,feedStage:7,pumpSpeedM3S:.04,linerK:900};
 const updated=updateFuelReferences(result,nextConfig),timeS=.06;
 const intervention:FuelOperation={schemaVersion:1,events:[events[0],{timeS,currentA:.005}],thermal:{...DEFAULT_FUEL_THERMAL}};
 const originalNext=simulateFuelOperation(simulateFuelCentrifuge(config,intervention.events),intervention,options,{transport:result.transport,timeS});
 const projectedNext=simulateFuelOperation(simulateFuelCentrifuge(nextConfig,intervention.events),intervention,options,{transport:updated.transport!,timeS});
 assert.equal(projectedNext.checkpoints!.length,originalNext.checkpoints!.length);
 projectedNext.checkpoints!.forEach((state,i)=>assert.deepEqual(physical(state),physical(originalNext.checkpoints![i])));
 assert.deepEqual(projectedNext.operation!.events,intervention.events);
 assert.deepEqual(projectedNext.snapshots.at(-1)!.collection,
  fuelTransportCollection(projectedNext.snapshots.at(-1)!.lightMass,projectedNext.snapshots.at(-1)!.heavyMass,nextConfig.lightFraction,.27));
});

test('physical changes reject before projection; thermal references retain the accepted thermal objects',()=>{
 const result=fixture();
 for(const key of ['currentA','gasK','durationS','radiusM'] as const)
  assert.throws(()=>updateFuelReferences(result,{...config,[key]:config[key]*1.1}),new RegExp(`physical input ${key}`));
 const thermal=fixture(true),next=updateFuelReferences(thermal,{...config,fusionMW:900,cutFraction:.4});
 thermal.transport.snapshots.forEach((state,i)=>assert.equal(next.transport!.snapshots[i].thermal,state.thermal));
 assert.throws(()=>updateFuelReferences(thermal,{...config,linerK:800}),/physical input linerK/);
 assert.throws(()=>updateFuelReferences(result,{...config,stages:2,feedStage:3}),/Stage feed/);
 const plain=simulateFuelCentrifuge(config),plainNext=updateFuelReferences(plain,{...config,stages:6},[]);
 assert.equal(plainNext.transport,undefined);assert.equal(plainNext.config.stages,6);
});

test('reference results without operation metadata require explicit current history',()=>{
 const original=simulateFuelCentrifuge(config,events),nextConfig={...config,stages:6};
 assert.throws(()=>updateFuelReferences(original,nextConfig),/recorded current history/);
 const updated=updateFuelReferences(original,nextConfig,events);
 assert.deepEqual(updated.samples,original.samples);
 assert.deepEqual(updated.collection,original.collection);
 assert.deepEqual(updated.samples,simulateFuelCentrifuge(nextConfig,events).samples);
});

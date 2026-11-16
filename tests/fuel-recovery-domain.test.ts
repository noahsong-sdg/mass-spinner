import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,FUEL_PAIRS,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {computeFuelOperatingMap} from '../src/fuel-experiments.js';
import {simulateFuelTransport} from '../src/fuel-transport.js';

test('absent light species has undefined recovery in every static inventory and cascade summary',()=>{
 for(const cutFraction of [0,.65,1]){
  const r=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA:0,lightFraction:0,cutFraction});
  assert.equal(r.collection.lightRecovery,null);
  assert.equal(r.cascade.lightRecovery,null);
  assert.ok(r.cuts.every(cut=>cut.lightRecovery===null));
  assert.ok(r.cascades.every(stage=>stage.recovery===null));
  // The mathematical routing probability remains defined even when no light
  // inventory is present; it must not be labelled a recovered feed fraction.
  assert.equal(typeof r.cascade.light.product,'number');
  assert.ok(Math.abs(r.cascade.light.product+r.cascade.light.tails-1)<1e-12);
  assert.ok(Math.abs(r.cascade.lightBalance)<1e-12);
 }
});

test('present light species retains recovery at empty, interior and complete cuts',()=>{
 for(const lightFraction of [.0759,1])for(const cutFraction of [0,.65,1]){
  const r=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA:0,lightFraction,cutFraction});
  assert.ok(Math.abs(r.collection.lightRecovery!-cutFraction**2)<1e-12);
  assert.equal(r.cascade.lightRecovery,r.cascade.light.product);
  assert.equal(r.cascades.at(-1)!.recovery,r.cascade.lightRecovery);
  assert.equal(r.cuts[0].lightRecovery,0);
  assert.equal(r.cuts.at(-1)!.lightRecovery,1);
 }
});

test('static and transient recovery use the same absent-species domain',()=>{
 for(const lightFraction of [0,1]){
  const r=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,lightFraction,durationS:0});
  const t=simulateFuelTransport(r,{cells:2,steps:1});
  assert.equal(r.collection.lightRecovery,t.snapshots[0].collection.lightRecovery);
 }
});

test('operating-map recovery leaves an absent species undefined instead of plotting a fictitious fraction',()=>{
 const map=computeFuelOperatingMap({...DEFAULT_FUEL_CENTRIFUGE,lightFraction:0},{metric:'recovery',size:2});
 assert.ok(map.points.every(point=>point.status==='valid'&&point.value===null&&point.error===null));
 assert.deepEqual(map.domain,[0,1]);
});

test('critical-velocity reference ignores absent feed species at pure-composition endpoints',()=>{
 const U=1.66053906892e-27,E=1.602176634e-19;
 for(const pair of Object.keys(FUEL_PAIRS) as (keyof typeof FUEL_PAIRS)[])for(const lightFraction of [0,1]){
  const species=lightFraction===1?0:1,inputs=FUEL_PAIRS[pair];
  const expected=Math.sqrt(2*inputs.ionEV[species]*E/(inputs.masses[species]*U));
  const r=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,pair,lightFraction,lithiumSeed:false,currentA:0});
  assert.ok(Math.abs(r.mechanics.criticalVelocityMS/expected-1)<1e-14);
 }
});

test('mixed-feed critical velocity and the explicitly added lithium seed retain their reference values',()=>{
 const U=1.66053906892e-27,E=1.602176634e-19,seed=Math.sqrt(2*5.3917*E/(7.0160034366*U));
 for(const pair of Object.keys(FUEL_PAIRS) as (keyof typeof FUEL_PAIRS)[]){
  const inputs=FUEL_PAIRS[pair],mixed=Math.min(...inputs.ionEV.map((energy,i)=>Math.sqrt(2*energy*E/(inputs.masses[i]*U))));
  for(const lightFraction of [.001,.0759,.5,.999]){
   const r=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,pair,lightFraction,lithiumSeed:false,currentA:0});
   assert.equal(r.mechanics.criticalVelocityMS,mixed);
  }
  for(const lightFraction of [0,.0759,1]){
   const r=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,pair,lightFraction,lithiumSeed:true,currentA:0});
   assert.equal(r.mechanics.criticalVelocityMS,seed);
  }
 }
});

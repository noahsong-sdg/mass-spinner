import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {atomicStoppingCrossSection,litStoppingCrossSection} from '../src/deuteron-stopping.ts';
import {stoppingForComposition,normalizeImplantationWeights,binImplantationDepths} from '../src/target-material.ts';

const close=(a:number,b:number,tolerance=2e-15)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(a),Math.abs(b),1e-30),`${a} vs ${b}`);

test('full T/D composition preserves the existing isotope endpoint and frozen source oracle',()=>{
 for(const e of [20,100,500]){
  const fullT=stoppingForComposition(e,{tritiumFraction:1,deuteriumFraction:0});
  const fullD=stoppingForComposition(e,{tritiumFraction:0,deuteriumFraction:1});
  for(const key of ['electronicKeVM2','nuclearKeVM2','totalKeVM2'] as const){
   close(fullT[key],litStoppingCrossSection(e)[key]);close(fullD[key],litStoppingCrossSection(e,7,2)[key]);
  }
  assert.equal(fullT.electronicKeVM2,fullD.electronicKeVM2);
  assert.notEqual(fullT.nuclearKeVM2,fullD.nuclearKeVM2);
 }
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/geant4-stopping-v23.json',import.meta.url),'utf8'));
 for(const row of fixture){
  const fullT=stoppingForComposition(row.energyKeV,{tritiumFraction:1,deuteriumFraction:0});
  close(fullT.electronicKeVM2,row.electronicKeVM2,3e-14);
  close(fullT.nuclearKeVM2,row.nuclearKeVM2,3e-14);
 }
});

test('empty sites remove hydrogen stopping while retaining Li, and mixed occupancy is additive',()=>{
 for(const e of [1,20,100,500]){
  const empty=stoppingForComposition(e,{tritiumFraction:0,deuteriumFraction:0}),li=atomicStoppingCrossSection(e,3,7);
  const t=stoppingForComposition(e,{tritiumFraction:1,deuteriumFraction:0}),d=stoppingForComposition(e,{tritiumFraction:0,deuteriumFraction:1});
  const mix=stoppingForComposition(e,{tritiumFraction:.3,deuteriumFraction:.2});
  for(const key of ['electronicKeVM2','nuclearKeVM2','totalKeVM2'] as const){
   assert.equal(empty[key],li[key]);assert.ok(empty[key]<t[key]);
   close(mix[key],.5*empty[key]+.3*t[key]+.2*d[key]);
  }
  assert.equal(mix.vacancyFraction,.5);
  assert.equal(stoppingForComposition(e,{tritiumFraction:.8,deuteriumFraction:.2}).vacancyFraction,0);
 }
});

test('atomic Li/D/T endpoints match independently compiled upstream function bodies',()=>{
 const rows=JSON.parse(readFileSync(new URL('./fixtures/geant4-atomic-stopping-v35.json',import.meta.url),'utf8'));
 assert.equal(rows.length,20);
 for(const row of rows){
  const atom=atomicStoppingCrossSection(row.energyKeV,row.z,row.massU);
  close(atom.electronicKeVM2,row.electronicKeVM2,3e-14);
  close(atom.nuclearKeVM2,row.nuclearKeVM2,3e-14);
 }
});

test('composition and atomic domains reject unsupported states without clipping',()=>{
 for(const c of [{tritiumFraction:-.1,deuteriumFraction:0},{tritiumFraction:.8,deuteriumFraction:.3},{tritiumFraction:NaN,deuteriumFraction:0}])assert.throws(()=>stoppingForComposition(100,c),RangeError);
 for(const e of [0,.8,501,Infinity])assert.throws(()=>stoppingForComposition(e,{tritiumFraction:1,deuteriumFraction:0}),RangeError);
 assert.throws(()=>atomicStoppingCrossSection(100,2 as 1,7),RangeError);
 assert.throws(()=>stoppingForComposition(100,{tritiumFraction:1,deuteriumFraction:0},{deuteriumMassU:0}),RangeError);
 assert.throws(()=>stoppingForComposition(100,{tritiumFraction:1,deuteriumFraction:0},{deuteriumMassU:null as unknown as number}),RangeError);
});

test('scenario profile normalization validates its domain and preserves zero channels',()=>{
 assert.deepEqual(normalizeImplantationWeights([0,2,6]),[0,.25,.75]);
 for(const weights of [[],[0,0],[-1,2],[NaN,1],[Infinity,1],[1e308,1e308]])assert.throws(()=>normalizeImplantationWeights(weights),RangeError);
});

test('deposited-depth histogram retains the incident denominator and exact boundary accounting',()=>{
 const r=binImplantationDepths([0,1e-6,2e-6],[0,.5e-6,1e-6,1.5e-6,2e-6,3e-6],10);
 assert.deepEqual(r.counts,[2,2]);assert.deepEqual(r.cellFractions,[.2,.2]);
 assert.equal(r.beyondTargetFraction,.2);assert.equal(r.unclassifiedFraction,.4);
 assert.equal(r.cellFractions.reduce((a,b)=>a+b,0)+r.beyondTargetFraction+r.unclassifiedFraction,1);
 const fine=binImplantationDepths([0,.5e-6,1e-6,1.5e-6,2e-6],[0,.5e-6,1e-6,1.5e-6,2e-6,3e-6],10);
 assert.deepEqual([fine.counts[0]+fine.counts[1],fine.counts[2]+fine.counts[3]],r.counts);
 for(const args of [ [[1,2],[1.5],1], [[0,1,1],[.5],1], [[0,1],[-1],1], [[0,1],[.2,.3],1], [[0,1],[.2],0] ] as const)
  assert.throws(()=>binImplantationDepths(args[0],args[1],args[2]),RangeError);
});

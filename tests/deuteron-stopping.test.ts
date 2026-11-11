import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {litStoppingCrossSection,DEUTERON_STOPPING_PROVENANCE} from '../src/deuteron-stopping.js';

const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<=3e-14*Math.abs(b),`${a} != ${b}`);
test('adapted stopping matches compiled original pinned Geant4 function bodies in physical units',()=>{
 const reference=JSON.parse(readFileSync('tests/fixtures/geant4-stopping-v23.json','utf8'));
 for(const row of reference){
  const result=litStoppingCrossSection(row.energyKeV);
  close(result.electronicKeVM2,row.electronicKeVM2);
  close(result.nuclearKeVM2,row.nuclearKeVM2);
  assert.equal(result.totalKeVM2,result.electronicKeVM2+result.nuclearKeVM2);
 }
});

test('source low-energy electronic continuation has exact square-root velocity scaling',()=>{
 const a=litStoppingCrossSection(1),b=litStoppingCrossSection(4);
 close(b.electronicKeVM2,2*a.electronicKeVM2);
 // Nuclear recoil remains a separate positive channel and has a different slope.
 assert.ok(a.nuclearKeVM2>b.nuclearKeVM2);
 assert.ok(a.nuclearKeVM2>0&&b.nuclearKeVM2>0);
 const left=litStoppingCrossSection(20-1e-7),right=litStoppingCrossSection(20+1e-7);
 assert.ok(Math.abs(left.electronicKeVM2/right.electronicKeVM2-1)<1e-8);
});

test('material stopping is independent of tritium reaction loading; isotope mass changes only recoil channel',()=>{
 const li7=litStoppingCrossSection(100,7,3),li6=litStoppingCrossSection(100,6,3);
 assert.equal(li7.electronicKeVM2,li6.electronicKeVM2);
 assert.notEqual(li7.nuclearKeVM2,li6.nuclearKeVM2);
 // This dimensional reference corresponds to ~1.45 keV per 10^21 formula units/m².
 assert.ok(li7.totalKeVM2*1e21>1&&li7.totalKeVM2*1e21<2);
});

test('stopping rejects unsupported tail/incident energies rather than silently extrapolating',()=>{
 const p=DEUTERON_STOPPING_PROVENANCE;
 assert.ok(litStoppingCrossSection(p.minimumEnergyKeV).totalKeVM2>0);
 assert.ok(litStoppingCrossSection(p.maximumEnergyKeV).totalKeVM2>0);
 for(const value of [0,-1,.8,500.001,NaN,Infinity])
  assert.throws(()=>litStoppingCrossSection(value),RangeError);
 assert.throws(()=>litStoppingCrossSection(100,0),RangeError);
 assert.throws(()=>litStoppingCrossSection(100,7,Infinity),RangeError);
 assert.match(p.assumptions,/no measured LiT/);
});

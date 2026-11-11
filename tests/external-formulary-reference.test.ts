import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compareFormulary} from '../scripts/compare-external-formulary.js';

const fixture=()=>JSON.parse(readFileSync('scientific/formulary/plasmapy-reference.json','utf8'));
test('production rates, source widths, gyro stepping and screening agree with executed PlasmaPy fixtures',()=>{
 const r=compareFormulary(fixture());assert.equal(r.verdict,'PASS');assert.equal(r.checks.length,24);
 assert.equal(r.finiteTimeCollisionValidated,false);assert.equal(r.separatorTransportValidated,false);
});
test('the upstream extreme-cold quadrature failure remains recorded and unaccepted',()=>{
 const r=fixture(),probe=r.upstreamProbes[0];
 assert.equal(probe.status,'FAIL');assert.equal(probe.referenceAccepted,false);
});
test('stale reference metadata cannot silently reuse rate fixtures',()=>{
 for(const mutate of [(r:any)=>r.schemaVersion=0,(r:any)=>r.constants.massUnitKg=1,
  (r:any)=>r.versions.plasmapy='other',(r:any)=>r.sourceHashes={}]){
  const r=fixture();mutate(r);assert.throws(()=>compareFormulary(r));
 }
});
test('a changed collision coefficient is reported as disagreement rather than accepted',()=>{
 const r=fixture();r.coldBeamCases[0].expectedTaVarianceRateS1*=1.1;
 assert.equal(compareFormulary(r).verdict,'FAIL');
});

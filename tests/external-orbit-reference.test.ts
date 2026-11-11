import test from 'node:test';
import assert from 'node:assert/strict';
import {validateOrbitReference,compareOrbitReference} from '../scripts/compare-external-orbits.js';
import {AMU,E_CHARGE} from '../src/physics.js';

const fixture=()=>({schemaVersion:1,solver:'SciML OrdinaryDiffEqVerner.Vern9',
 constants:{elementaryChargeC:E_CHARGE,atomicMassUnitKG:AMU},sourceHashes:{reference:'a'.repeat(64)},
 cases:[{name:'ballistic-interior',config:{radius:.2,length:.6,magneticT:0,voltage:0,quadraticShape:0,massU:40,chargeState:1},
  initialState:[.02,0,.3,1,0,0],energyNormalizationJ:1e-18,momentumNormalizationSI:1e-20,
  checkpoints:[{timeS:0,state:[.02,0,.3,1,0,0],energyJ:40*AMU/2,canonicalMomentumSI:0},
   {timeS:1e-6,state:[.020001,0,.3,1,0,0],energyJ:40*AMU/2,canonicalMomentumSI:0}],
  refinements:[{maxPositionDifferenceM:0,maxVelocityDifferenceMS:0}]}]});

test('external orbit comparison exercises the production step on exact ballistic data',()=>{
 const result=compareOrbitReference(fixture());assert.equal(result.verdict,'PASS');
 assert.ok(result.cases[0].levels.every(l=>l.maxPositionDifferenceM<1e-14&&l.maxVelocityDifferenceMS===0));
 assert.equal(result.collisionsValidated,false);assert.equal(result.collectorEventsValidated,false);
});
test('stale schemas, unknown solvers, altered units and missing provenance cannot be accepted',()=>{
 for(const mutate of [(r:any)=>r.schemaVersion=0,(r:any)=>r.solver='custom',
  (r:any)=>r.constants.atomicMassUnitKG=1,(r:any)=>r.sourceHashes={},(r:any)=>r.sourceHashes.reference='stale']){
  const r=fixture();mutate(r);assert.throws(()=>validateOrbitReference(r));
 }
});
test('out-of-domain, mismatched initial data and unordered checkpoints fail explicitly',()=>{
 for(const mutate of [(r:any)=>r.cases[0].checkpoints[1].timeS=0,
  (r:any)=>r.cases[0].checkpoints[1].state[0]=.2,(r:any)=>r.cases[0].config.massU=-1,
  (r:any)=>r.cases[0].initialState[3]=2,(r:any)=>r.cases[0].checkpoints[1].state[0]=NaN]){
  const r=fixture();mutate(r);assert.throws(()=>compareOrbitReference(r));
 }
});
test('insufficient external refinement remains UNKNOWN and a resolved disagreement FAILS',()=>{
 const unresolved=fixture();unresolved.cases[0].refinements[0].maxPositionDifferenceM=1e-6;
 assert.equal(compareOrbitReference(unresolved).verdict,'UNKNOWN');
 const disagrees=fixture();disagrees.cases[0].checkpoints[1].state[0]+=.001;
 assert.equal(compareOrbitReference(disagrees).verdict,'FAIL');
});

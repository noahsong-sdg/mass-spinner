import test from 'node:test';
import assert from 'node:assert/strict';
import {collectorAcceptance} from '../src/collector-acceptance.js';
const species=()=>[40,84].map(massU=>({massU,chargeState:1,injected:5,end:2,wall:1,source:1,remaining:1,impacts:[
 {destination:'end' as const,position:[0,0,2] as [number,number,number],time:1,kineticEV:1},
 {destination:'end' as const,position:[.4,0,2] as [number,number,number],time:1,kineticEV:1},
 {destination:'wall' as const,position:[.5,0,1] as [number,number,number],time:1,kineticEV:1},
 {destination:'source' as const,position:[0,0,0] as [number,number,number],time:1,kineticEV:1}]}));
test('zero and full apertures preserve original destination inventory and incident denominator',()=>{
 for(const destination of ['end','wall','source'] as const){
  const zero=collectorAcceptance(species(),{destination,innerRadiusM:0,outerRadiusM:0});
  assert.equal(zero.totalAccepted,0);assert.equal(zero.species[0].purity,null);
  const full=collectorAcceptance(species(),{destination,innerRadiusM:0,outerRadiusM:.5});
  for(const [i,s] of full.species.entries()){
   assert.equal(s.accepted,species()[i][destination]);assert.equal(s.recovery,s.accepted/5);
   assert.equal(s.accepted+s.rejected+s.otherDestinations+s.remaining,s.injected);
  }
 }
});
test('radial and axial masks select actual impacts without modifying original trajectories',()=>{
 const input=species(),before=JSON.stringify(input);
 const value=collectorAcceptance(input,{destination:'end',innerRadiusM:.1,outerRadiusM:.4,minZM:2,maxZM:2});
 assert.equal(value.species[0].accepted,1);assert.equal(value.species[0].recovery,.2);assert.equal(value.species[0].purity,.5);assert.equal(JSON.stringify(input),before);
 assert.equal(collectorAcceptance(input,{destination:'wall',innerRadiusM:0,outerRadiusM:.5,minZM:1.1}).totalAccepted,0);
});
test('stale sampled or incomplete positions cannot masquerade as a collector calculation',()=>{
 const stale=species();delete (stale[0].impacts[0] as any).position;
 assert.throws(()=>collectorAcceptance(stale,{destination:'end',innerRadiusM:0,outerRadiusM:.5}),/Complete impact positions/);
 const truncated=species();truncated[0].impacts.pop();assert.throws(()=>collectorAcceptance(truncated,{destination:'end',innerRadiusM:0,outerRadiusM:.5}),/complete incident inventory/);
 assert.throws(()=>collectorAcceptance(species(),{destination:'end',innerRadiusM:.5,outerRadiusM:.4}),/ordered/);
});
test('full collector includes floating-point surface roots but not physically distinct impacts',()=>{
 const input=species();input[0].impacts[2].position[0]=.5+Number.EPSILON;
 assert.equal(collectorAcceptance(input,{destination:'wall',innerRadiusM:0,outerRadiusM:.5}).species[0].accepted,1);
 input[0].impacts[2].position[0]=.500001;
 assert.equal(collectorAcceptance(input,{destination:'wall',innerRadiusM:0,outerRadiusM:.5}).species[0].accepted,0);
});

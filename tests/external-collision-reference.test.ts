import test from 'node:test';
import assert from 'node:assert/strict';
import {compareWarpReference,validateWarpReference,validateWarpCampaign} from '../scripts/compare-external-collisions.js';
import {AMU,E_CHARGE,type Vec} from '../src/physics.js';

function fixture(){
 const species=[40,84].map((massU,k)=>({massU,massKG:massU*AMU,chargeC:E_CHARGE,
  weights:[2.5e17,2.5e17],velocitiesMS:[[1000+500*k,200,-300],[-1000-500*k,-200,300]] as Vec[]}));
 return {schemaVersion:1,solver:'WarpX',solverVersion:'26.10',runnerSHA256:'a'.repeat(64),inputSHA256:'b'.repeat(64),
  config:{particlesPerSpecies:2,dtS:1e-6,seed:101,durationS:1e-6,densityPerSpeciesM3:5e17,coulombLog:12,
   commonTemperature:false,collisions:false,spatialCells:1,spatialPush:false,selfConsistentFields:false,unitTransverseAreaM2:1,cellLengthM:1},
  checkpoints:[0,1e-6].map(timeS=>({timeS,maximumFieldAbsSI:{Ex:0,Ey:0,Ez:0,Bx:0,By:0,Bz:0},species:structuredClone(species)}))};
}
test('collision-off external fixture preserves exact initialized distributions without claiming validity',()=>{
 const r=compareWarpReference(fixture());
 assert.equal(r.maxEnergyResidual,0);assert.equal(r.maxMomentumResidual,0);
 for(const c of r.history)for(const s of c.species){assert.equal(s.temperatureDifferenceEV,0);assert.equal(s.speedCDFDistance,0);}
 assert.equal(r.verdict,'UNKNOWN');assert.equal(r.referenceAccepted,false);
});
test('external collision references reject stale schemas, fields, weights and physical normalization mismatches',()=>{
 for(const mutate of [(r:any)=>r.schemaVersion=0,(r:any)=>r.solverVersion='old',
  (r:any)=>r.config.selfConsistentFields=true,(r:any)=>r.config.cellLengthM=2,
  (r:any)=>r.checkpoints[1].maximumFieldAbsSI.Bz=.06,(r:any)=>r.checkpoints[0].species[1].massKG=84,
  (r:any)=>r.checkpoints[1].species[0].weights[0]*=2,(r:any)=>r.checkpoints[1].species[0].velocitiesMS.pop(),
  (r:any)=>r.checkpoints[1].timeS=0,(r:any)=>r.checkpoints[1].species[0].velocitiesMS[0][0]=NaN]){
  const r=fixture();mutate(r);assert.throws(()=>validateWarpReference(r));
 }
});
test('production collisions execute against an external initial realization and conserve invariants',()=>{
 const r=fixture();r.config.collisions=true;
 const result=compareWarpReference(r);
 assert.ok(result.maxVariance>0);assert.ok(result.maxEnergyResidual<1e-12);assert.ok(result.maxMomentumResidual<1e-12);
 assert.equal(result.verdict,'UNKNOWN');
});
test('campaign refuses individually valid stale physics, generator revisions and observation schedules',()=>{
 const base=fixture();validateWarpCampaign([base,structuredClone(base)]);
 for(const mutate of [(r:ReturnType<typeof fixture>)=>r.config.coulombLog=10,
  (r:ReturnType<typeof fixture>)=>{r.config.densityPerSpeciesM3*=2;for(const p of r.checkpoints)for(const s of p.species)s.weights=s.weights.map(w=>2*w);},
  (r:ReturnType<typeof fixture>)=>{r.config.durationS*=2;r.checkpoints[1].timeS*=2;},
  (r:ReturnType<typeof fixture>)=>r.runnerSHA256='c'.repeat(64),
  (r:ReturnType<typeof fixture>)=>r.checkpoints.splice(1,0,{...structuredClone(r.checkpoints[0]),timeS:5e-7})]){
  const stale=fixture();mutate(stale);validateWarpReference(stale);
  assert.throws(()=>validateWarpCampaign([base,stale]));
 }
 const roundoff=fixture();roundoff.checkpoints[1].timeS*=1+5e-14;validateWarpCampaign([base,roundoff]);
 assert.throws(()=>validateWarpCampaign([]));
});

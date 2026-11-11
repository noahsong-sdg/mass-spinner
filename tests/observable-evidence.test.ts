import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_DOUBLEWELL,simulateDoublewell} from '../src/doublewell-dynamics.js';
import {assessCollisionObservableEvidence} from '../src/observable-evidence.js';

const result=()=>simulateDoublewell({...DEFAULT_DOUBLEWELL,particlesPerSpecies:16,duration:2e-7,collisions:false});
function sampled(){
 const r=result();r.config.collisions=true;
 for(const f of r.regimeHistory){f.assessment.status='within-supported-domain';f.assessment.observed.unresolvedRepresentativeFraction=0;}
 r.regimeSummary.status='within-supported-domain';r.conservation.maxMomentumResidual=0;
 return r;
}
test('collision-free orbits do not inherit irrelevant collision-domain failures',()=>{
 const r=result();r.regimeSummary.status='outside-supported-domain';
 const e=assessCollisionObservableEvidence(r,'outlet-fraction');
 assert.equal(e.status,'ideal-orbit');assert.equal(e.continuum,'not-applicable');
});
test('passing current-run diagnostics never certify a live observable or inherit archived resolutions',()=>{
 const r=sampled();const e=assessCollisionObservableEvidence(r,'radial-density');
 assert.equal(e.status,'preview');assert.equal(e.sampledDomain,'within-sampled-domain');
 assert.equal(e.continuum,'unqualified');assert.equal(e.settings.particlesPerSpecies,16);
 assert.equal(assessCollisionObservableEvidence({...r,archivedStatus:'pass'} as typeof r,'temperature').status,'preview');
});
test('one observed violation is retained even with zero unresolved exposure',()=>{
 const r=sampled();r.regimeHistory[0].assessment.status='outside-supported-domain';
 const e=assessCollisionObservableEvidence(r,'angular-transfer');assert.equal(e.status,'outside-domain');
 assert.equal(e.unresolvedExposure,0);
});
test('missing/stale histories and undefined exposure fail closed without granting a domain pass',()=>{
 for(const mutate of [(r:ReturnType<typeof sampled>)=>{r.regimeHistory=[];},
  (r:ReturnType<typeof sampled>)=>{r.regimeHistory[0].time+=1;},
  (r:ReturnType<typeof sampled>)=>{r.config.duration*=2;},
  (r:ReturnType<typeof sampled>)=>{r.regimeHistory[0].assessment.observed.unresolvedRepresentativeFraction=null;}]){
  const r=sampled();mutate(r);assert.equal(assessCollisionObservableEvidence(r,'impact-time').status,'unresolved');
 }
});
test('unchanged exposure and raw torque budgets are applied to actual values, including exact boundaries',()=>{
 const r=sampled();for(const f of r.regimeHistory)f.assessment.observed.unresolvedRepresentativeFraction=.01;
 r.conservation.maxMomentumResidual=.001;assert.equal(assessCollisionObservableEvidence(r,'outlet-fraction').status,'preview');
 r.conservation.maxMomentumResidual=.0010001;assert.equal(assessCollisionObservableEvidence(r,'outlet-fraction').status,'budget-exceeded');
 r.conservation.maxMomentumResidual=NaN;assert.equal(assessCollisionObservableEvidence(r,'outlet-fraction').status,'unresolved');
 r.conservation.maxMomentumResidual=0;for(const f of r.regimeHistory)f.assessment.observed.unresolvedRepresentativeFraction=.010001;
 assert.equal(assessCollisionObservableEvidence(r,'outlet-fraction').sampledDomain,'unresolved');
});

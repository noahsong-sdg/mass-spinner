import test from 'node:test';
import assert from 'node:assert/strict';
import {AMU,E_CHARGE,type Vec} from '../src/physics.js';
import {DEFAULT_DOUBLEWELL,doublewellRegime,simulateDoublewell} from '../src/doublewell-dynamics.js';
import {inspectDoublewellRegime} from '../src/doublewell-regime.js';

function thermal(massU:number,temperatureEV:number,drift:Vec=[0,0,0],chargeState=1){
 // Six axis-aligned samples have exactly the requested unbiased 3D variance.
 const speed=Math.sqrt(5*E_CHARGE*temperatureEV/(2*AMU*massU));
 return [0,1,2].flatMap(axis=>[-1,1].map(sign=>({massU,chargeState,
  velocity:drift.map((v,k)=>v+(k===axis?sign*speed:0)) as Vec})));
}
const c={...DEFAULT_DOUBLEWELL,magneticT:.05};

test('local thermal estimates remove each species drift and recover a known kinetic temperature',()=>{
 const result=inspectDoublewellRegime(c,[{densityM3:1e18,
  ions:[...thermal(40,5,[10000,0,0]),...thermal(84,5,[-10000,0,0])]}]);
 assert.equal(result.status,'within-supported-domain');assert.equal(result.observed.resolvedCells,1);
 assert.ok(Math.abs(result.observed.minTemperatureEV!-5)<1e-12);
 assert.equal(result.observed.unresolvedRepresentativeFraction,0);
 assert.ok(result.observed.maxCoupling!<.001);assert.ok(result.observed.minDebyePopulation!>1000);
});

test('sparse minority species makes its entire cell unresolved instead of borrowing a reference temperature',()=>{
 const sparse={densityM3:1e18,ions:[...thermal(40,5),...thermal(84,5).slice(0,2)]};
 const resolved={densityM3:1e18,ions:thermal(40,5)};
 const result=inspectDoublewellRegime(c,[sparse,resolved]);
 assert.equal(result.status,'unresolved');assert.equal(result.observed.resolvedCells,1);
 assert.equal(result.observed.unresolvedRepresentativeFraction,8/14);
 assert.match(result.reasons.join(' '),/four representatives/);
 const dense=inspectDoublewellRegime(c,[{...sparse,densityM3:1e30}]);
 assert.equal(dense.status,'outside-supported-domain');assert.equal(dense.observed.unresolvedRepresentativeFraction,1);
 assert.ok(dense.observed.minDebyePopulation!<10);
 assert.match(dense.reasons.join(' '),/screening limit/);
});

test('actual engine checks concentrated equilibrium peak and records unresolved short sparse runs',()=>{
 const concentrated={...c,densityM3:1e23,particlesPerSpecies:8,duration:1e-9,
  boundary:'closed' as const,initialState:'equilibrium' as const,rotationMode:'common' as const,
  rotationRadS:1e5,beamEV:0};
 const mean=doublewellRegime(concentrated);
 assert.ok(mean.particlesPerDebyeSphere>10);assert.ok(mean.coupling!<.1);
 assert.ok(mean.estimatedCoulombLog!>2);assert.ok(mean.encounterMagnetization!<.1);
 const reference=simulateDoublewell({...concentrated,collisions:false});
 assert.ok(reference.regime.initialPeakDensityM3>concentrated.densityM3*5);
 assert.equal(reference.regimeSummary.status,'outside-supported-domain');
 assert.throws(()=>simulateDoublewell({...concentrated,collisions:true}),/Initial state is outside/);
 const sparse=simulateDoublewell({...c,particlesPerSpecies:8,duration:1e-9});
 assert.equal(sparse.regimeHistory[0].assessment.status,'unresolved');
 assert.ok(sparse.regimeHistory[0].assessment.observed.unresolvedRepresentativeFraction!>0);
});

test('concentrated initial peak and cooled sampled cells cannot inherit a passing mean-density reference',()=>{
 const ordinary=inspectDoublewellRegime(c,[{densityM3:1e18,ions:thermal(40,5)}]);
 assert.equal(ordinary.status,'within-supported-domain');
 const peak=inspectDoublewellRegime(c,[],1e26);
 assert.equal(peak.status,'outside-supported-domain');assert.equal(peak.referenceDensityKind,'analytic initial peak');
 assert.ok(peak.reference.reasons.length>0);
 const cooled=inspectDoublewellRegime(c,[{densityM3:1e18,ions:thermal(40,1e-5)}]);
 assert.equal(cooled.status,'outside-supported-domain');assert.ok(cooled.observed.maxCoupling!>.1);
});

test('differential drift changes encounter estimates without becoming artificial thermal energy',()=>{
 const at=(speed:number)=>inspectDoublewellRegime(c,[{densityM3:1e18,
  ions:[...thermal(40,5,[speed,0,0]),...thermal(84,5,[-speed,0,0])]}]);
 const still=at(0),drifting=at(50000);
 assert.ok(Math.abs(still.observed.minTemperatureEV!-drifting.observed.minTemperatureEV!)<1e-12);
 // Self-species pairs remain in the minimum, so drift must not lower the minimum log.
 assert.ok(drifting.observed.minEstimatedCoulombLog!>=still.observed.minEstimatedCoulombLog!);
 assert.ok(drifting.observed.maxEncounterMagnetization!<=still.observed.maxEncounterMagnetization!);
});

test('empty or zero-spread local populations report undefined or unsupported diagnostics without a speed floor',()=>{
 const empty=inspectDoublewellRegime(c,[]);
 assert.equal(empty.status,'unresolved');assert.equal(empty.observed.minTemperatureEV,null);
 assert.equal(empty.observed.unresolvedRepresentativeFraction,null);
 const zero=inspectDoublewellRegime(c,[{densityM3:1e18,ions:thermal(40,0)}]);
 assert.equal(zero.status,'outside-supported-domain');assert.equal(zero.observed.minTemperatureEV,0);
 assert.equal(zero.observed.maxCoupling,null);assert.equal(zero.observed.maxEncounterMagnetization,null);
 assert.equal(zero.observed.minEstimatedCoulombLog,null);
 assert.match(zero.reasons.join(' '),/Zero sampled thermal spread/);
 assert.ok(!JSON.stringify(zero).includes('Infinity'));
 assert.throws(()=>inspectDoublewellRegime(c,[{densityM3:0,ions:thermal(40,5)}]));
});

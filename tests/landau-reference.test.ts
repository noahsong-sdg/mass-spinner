import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_LANDAU_REFERENCE as d,simulateLandauReference} from '../src/landau-reference.js';

test('independent isotropic Rosenbluth discretization recovers the SI Maxwellian energy-exchange coefficient',()=>{
 // Closed-form Landau Maxwellian moment, independent of this FV solver.
 const e=1.602176634e-19,u=1.66053906660e-27,eps=8.8541878128e-12;
 const [a,b]=d.species,ma=a.massU*u,mb=b.massU*u,coupling=e*e/(4*Math.PI*eps);
 const expected=8*Math.sqrt(2*Math.PI)/3*b.densityM3*coupling**2*d.coulombLog/
  (ma*mb*(e*a.temperatureEV/ma+e*b.temperatureEV/mb)**1.5)*(b.temperatureEV-a.temperatureEV);
 const r=simulateLandauReference({...d,bins:512,dtS:1e-8,durationS:1e-8});
 const actual=(r.history.at(-1)!.temperaturesEV[0]-r.history[0].temperaturesEV[0])/1e-8;
 assert.ok(Math.abs(actual/expected-1)<.001);
 assert.equal(r.finiteTimeReferenceAccepted,false);
});

test('finite-time FV relaxation conserves each species number without projecting energy and remains positive',()=>{
 const r=simulateLandauReference({...d,bins:128,dtS:5e-7,durationS:1e-4});
 assert.ok(r.maxNumberResidual<1e-11);
 assert.ok(r.distributionPerVelocityVolume.every(f=>f.every(x=>Number.isFinite(x)&&x>=0)));
 assert.ok(r.history.at(-1)!.temperaturesEV[0]>r.history[0].temperaturesEV[0]);
 assert.ok(r.history.at(-1)!.temperaturesEV[1]<r.history[0].temperaturesEV[1]);
 assert.ok(r.maxEnergyResidual>1e-8,'Energy defect is measured, not silently projected away.');
});

test('common-temperature stationarity errors decrease under radial mesh refinement',()=>{
 const errors=[64,128].map(bins=>{
  const r=simulateLandauReference({...d,bins,dtS:5e-7,durationS:1e-4,
   species:d.species.map(s=>({...s,temperatureEV:6}))});
  return Math.max(...r.stationarityL1);
 });
 assert.ok(errors[1]<errors[0]/3.5);
});

test('nonlinear finite-time lagged coefficient error decreases with timestep and cutoff is independently checked',()=>{
 const a=simulateLandauReference({...d,bins:128,dtS:1e-6,durationS:1e-4});
 const b=simulateLandauReference({...d,bins:128,dtS:2.5e-7,durationS:1e-4});
 assert.ok(b.maxEnergyResidual<a.maxEnergyResidual/2.5);
 const extended=simulateLandauReference({...d,bins:160,maximumScaledSpeed:10,dtS:2.5e-7,durationS:1e-4});
 assert.ok(Math.abs(extended.history.at(-1)!.temperaturesEV[0]-b.history.at(-1)!.temperaturesEV[0])<1e-7,
  'same velocity spacing with a larger cutoff has negligible effect in this specified case');
});

test('invalid, unbounded and absent-species settings are rejected instead of inventing a reference solution',()=>{
 for(const change of [{dtS:0},{bins:4},{sampleEvery:0},{maximumScaledSpeed:NaN},
  {durationS:1e4},{species:[{...d.species[0],densityM3:0}]}])
  assert.throws(()=>simulateLandauReference({...d,...change}));
});

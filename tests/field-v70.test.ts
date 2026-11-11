import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {matchedPoints,score,cornerSensitivity,transportSensitivity} from '../scientific/field-v70/scaling.js';
const data=JSON.parse(readFileSync('scientific/experimental-v64/data/markers-corrected.json','utf8'));
const points=matchedPoints(data);
test('steady viscous hypothesis opposes the old inventory temperature feedback',()=>{
 const p=points.map(p=>({...p,temperatureK:1000}));p[2].temperatureK=2000;
 const old=score('fixed-rate-inventory',p),steady=score('neutral-viscosity',p),constant=score('constant-viscosity',p);
 assert.ok(old.points[2].predictedMS>constant.points[2].predictedMS);
 assert.ok(steady.points[2].predictedMS<constant.points[2].predictedMS);
});
test('one calibration amplitude cannot see held-out observed speeds',()=>{
 const a=score('neutral-viscosity',points),changed=points.map((p,i)=>({...p,velocityMS:p.velocityMS*(i===1?1:10)}));
 assert.deepEqual(score('neutral-viscosity',changed).points.map(p=>p.predictedMS),a.points.map(p=>p.predictedMS));
 assert.ok(score('neutral-viscosity',changed).maximumHeldoutRelativeError>a.maximumHeldoutRelativeError);
 const scaled=score('neutral-viscosity',points.map(p=>({...p,velocityMS:p.velocityMS*2})));
 assert.ok(Math.abs(scaled.maximumHeldoutRelativeError-a.maximumHeldoutRelativeError)<1e-14);
});
test('corrected extraction and unique matched fields are required',()=>{
 const stale=structuredClone(data);delete stale.temperatureCalibrationTicks;assert.throws(()=>matchedPoints(stale));
 const missing=structuredClone(data);missing.sweeps.temperature.pop();assert.throws(()=>matchedPoints(missing));
 const duplicate=structuredClone(data);duplicate.sweeps.velocity.push(duplicate.sweeps.velocity[0]);assert.throws(()=>matchedPoints(duplicate));
});
test('property-domain uncertainty remains unavailable and cannot pass by dropping corners',()=>{
 assert.throws(()=>score('neutral-viscosity',points,2));
 const sensitivity=cornerSensitivity('neutral-viscosity',points,1/.7,'independent-reproducibility');
 assert.equal(sensitivity.cornerCount,256);assert.ok(sensitivity.outsidePropertyDomain>0);
 assert.equal(sensitivity.availableCorners+sensitivity.outsidePropertyDomain,256);
 assert.equal(sensitivity.allCornersWithin20Percent,false);
 // Competing algebraic hypotheses do not use or extrapolate neutral Ar data.
 assert.equal(score('constant-viscosity',points,2).points[0].viscosityPaS,null);
 assert.equal(cornerSensitivity('constant-viscosity',points,2,'independent-reproducibility').outsidePropertyDomain,0);
});
test('material accuracy sensitivity retains independent-coordinate failures',()=>{
 const sensitivity=transportSensitivity(points,1);
 assert.equal(sensitivity.cornerCount,16);assert.equal(sensitivity.confidenceInterval,false);
 assert.ok(sensitivity.maximumErrorRange[0]<=score('neutral-viscosity',points).maximumHeldoutRelativeError);
 assert.ok(sensitivity.maximumErrorRange[1]>=score('neutral-viscosity',points).maximumHeldoutRelativeError);
});

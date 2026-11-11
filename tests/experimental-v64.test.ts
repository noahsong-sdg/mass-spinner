import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fitRigid,rigidMetric,lambdaEnvelope,type Marker} from '../scientific/experimental-v64/metrics.js';
const points:Marker[]=[{rCm:1,vMS:10,split:'train',rHalfWidthCm:0,vHalfWidthMS:0},
 {rCm:2,vMS:20,split:'train',rHalfWidthCm:0,vHalfWidthMS:0},
 {rCm:3,vMS:5,split:'test',rHalfWidthCm:0,vHalfWidthMS:0}];
test('profile fitting excludes held-out markers and metrics use the observed peak',()=>{
 assert.equal(fitRigid(points),1000);assert.equal(rigidMetric(points,1000),1.25);
 assert.equal(fitRigid(points.map(p=>p.split==='test'?{...p,vMS:5000}:p)),1000);
 assert.throws(()=>fitRigid(points.filter(p=>p.split==='test')));
 assert.throws(()=>rigidMetric(points.filter(p=>p.split==='train'),1000));
});
test('bounded squared-speed uncertainty is asymmetric, monotone and rejects nonphysical ranges',()=>{
 const result=lambdaEnvelope(40,1000,500,.15);
 assert.ok(Math.abs(result.lambdaEnvelope[0]/result.lambda-.85**2/1.15)<1e-14);
 assert.ok(Math.abs(result.lambdaEnvelope[1]/result.lambda-1.15**2/.85)<1e-14);
 assert.equal(lambdaEnvelope(40,0,500,.15).lambda,0);
 for(const f of [-1,1,NaN])assert.throws(()=>lambdaEnvelope(40,1000,500,f));
 assert.throws(()=>lambdaEnvelope(40,1000,0,.15));
});

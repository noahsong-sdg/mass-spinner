import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFuelRadialProjection} from '../src/fuel-radial-projection.js';
const sum=(v:readonly number[])=>v.reduce((a,b)=>a+b,0);
test('nested q projection conserves integrated torque, heat and signed non-rigid work',()=>{
 const p=createFuelRadialProjection(8,2),omega=[3,-1,5,1,-8,2,4,-2],torque=[7,-3];
 const coarse=p.restrictOmega(omega),fine=p.prolongIntegrated(torque);
 assert.deepEqual(coarse,[2,-1]);assert.equal(sum(fine),sum(torque));
 assert.equal(sum(fine.map((v,i)=>v*omega[i])),sum(torque.map((v,i)=>v*coarse[i])));
 assert.equal(sum(p.prolongIntegrated([2,6])),8);
 assert.deepEqual(p.restrictOmega(Array(8).fill(4)),[4,4]);
});
test('same-grid projection is an exact copy and invalid grids and fields are rejected',()=>{
 const p=createFuelRadialProjection(4,4),values=[0,-1,3,8];
 assert.deepEqual(p.restrictOmega(values),values);assert.deepEqual(p.prolongIntegrated(values),values);
 assert.notEqual(p.restrictOmega(values),values);
 for(const [ng,ne] of [[6,4],[2,4],[4,1],[NaN,2],[8,2.5]])assert.throws(()=>createFuelRadialProjection(ng,ne));
 assert.throws(()=>p.restrictOmega([1]));assert.throws(()=>p.prolongIntegrated([1,2,3,Infinity]));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {createFuelFieldSampler,sampleFuelField,type FuelFieldState} from '../src/fuel-field.js';
import {fuelCompositionCurves} from '../src/fuel-learning.js';

const rotor=()=>simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA:0});

test('a validated field sampler matches public samples at cell boundaries and pure-feed limits',()=>{
 for(const lightFraction of [0,.0759,1]){
  const result=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA:0,lightFraction}),R=result.config.radiusM;
  const state={lightMass:[.1,.2,.3,.4],heavyMass:[.4,.3,.2,.1],timeS:.2,neutralRadS:30};
  Object.freeze(state.lightMass);Object.freeze(state.heavyMass);
  const before=JSON.stringify(state),sample=createFuelFieldSampler(result,state);
  for(const radius of [0,R*.2,R*Math.sqrt(.25),R*Math.sqrt(.5),R*Math.sqrt(.75),R])assert.deepEqual(sample(radius),sampleFuelField(result,radius,state));
  assert.equal(JSON.stringify(state),before);
  assert.throws(()=>sample(-R),RangeError);assert.throws(()=>sample(R*1.01),RangeError);
 }
});

test('field profiles validate once for a batch and keep finite-volume sample work linear',()=>{
 const result=rotor(),n=128;let reads=0;
 const light=Array<number>(n).fill(0),heavy=Array<number>(n).fill(0);
 for(const array of [light,heavy])for(let i=0;i<n;i++)Object.defineProperty(array,i,{get(){reads++;return 1/n;},configurable:true});
 const sample=createFuelFieldSampler(result,{lightMass:light,heavyMass:heavy});
 const validated=reads;
 assert.equal(validated,2*n);
 for(let i=0;i<n;i++)sample(result.config.radiusM*Math.sqrt((i+.5)/n));
 assert.equal(reads-validated,2*n,'sampling reads only the selected cell in each species');
 reads=0;fuelCompositionCurves(result,{lightMass:light,heavyMass:heavy});
 assert.equal(reads,4*n,'plot construction validates once and reads each species cell once');
});

test('public field sampling still rejects malformed and subsequently changed state',()=>{
 const result=rotor(),state={lightMass:[.2,.8],heavyMass:[.8,.2],timeS:0,neutralRadS:0};
 assert.ok(sampleFuelField(result,0,state));state.lightMass[1]=NaN;
 assert.throws(()=>sampleFuelField(result,0,state),/finite-volume species masses/);
 assert.throws(()=>createFuelFieldSampler(result,{lightMass:Array<number>(2),heavyMass:[.8,.2]}),/finite-volume species masses/);
 const malformed={...state,lightMass:[.2,.8],thermal:{gasK:600,gas:{temperatureK:[500,700],pressurePa:[10,-1]}}} as unknown as FuelFieldState;
 assert.throws(()=>createFuelFieldSampler(result,malformed),/Spatial gas diagnostics/);
 assert.throws(()=>createFuelFieldSampler(result,{timeS:-1}),/Physical time/);
 assert.throws(()=>createFuelFieldSampler(result,{neutralRadS:NaN}),/Finite bulk rotation/);
});

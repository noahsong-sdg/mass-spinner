import test from 'node:test';
import assert from 'node:assert/strict';
import {PROTON_MASS_U,hydrogenGroundCaptureCrossSection,hydrogenCaptureHazard,constantCaptureTime,hydrogenCaptureProducts} from '../src/hydrogen-charge-exchange.js';
const speed=Math.sqrt(2*1.602176634e-19/1.66053906660e-27);
test('published fit units and energy boundary remain explicit and zero-density disables the channel exactly',()=>{
 const sigma=hydrogenGroundCaptureCrossSection(1);assert.ok(sigma>3.9e-19&&sigma<4.1e-19);
 assert.ok(hydrogenGroundCaptureCrossSection(.1)>sigma);assert.ok(hydrogenGroundCaptureCrossSection(20)<sigma);
 assert.throws(()=>hydrogenGroundCaptureCrossSection(20.01),/0.1–20/);assert.throws(()=>hydrogenGroundCaptureCrossSection(.01),/0.1–20/);
 assert.equal(hydrogenCaptureHazard([1e9,0,0],0).ratePerS,0);assert.equal(constantCaptureTime(0,.5),Infinity);
});
test('constant-hazard flight obeys exp(-n sigma L) survival rather than per-step clipping',()=>{
 const n=1e18,L=2,h=hydrogenCaptureHazard([0,0,speed],n),flight=L/speed;
 const survival=Math.exp(-n*h.crossSectionM2!*L),threshold=1-survival;
 assert.ok(constantCaptureTime(h.ratePerS,threshold*(1-1e-8))<flight);
 assert.ok(constantCaptureTime(h.ratePerS,threshold+(1-threshold)*1e-8)>flight);
 const whole=Math.exp(-h.ratePerS*flight),half=Math.exp(-h.ratePerS*flight/2);assert.ok(Math.abs(whole-half*half)<1e-15);
});
test('the tagged fast neutral and reservoir-origin slow ion preserve nuclei, charge and nuclear kinetic ledgers',()=>{
 const ion={atomicIdentity:'H-1' as const,massU:PROTON_MASS_U,chargeState:1 as const,velocityMS:[0,0,speed] as [number,number,number]};
 const target={...ion,chargeState:0 as const,velocityMS:[0,0,0] as [number,number,number]},before=JSON.stringify([ion,target]);
 const products=hydrogenCaptureProducts(ion,target);assert.equal(products.fastNeutral.chargeState,0);assert.equal(products.slowIon.chargeState,1);
 assert.deepEqual(products.fastNeutral.velocityMS,ion.velocityMS);assert.deepEqual(products.slowIon.velocityMS,target.velocityMS);
 const energy=(p:typeof ion|typeof target)=>.5*p.massU*p.velocityMS.reduce((a,v)=>a+v*v,0);
 assert.equal(energy(ion)+energy(target),energy(products.fastNeutral)+energy(products.slowIon));
 for(let axis=0;axis<3;axis++)assert.equal(ion.massU*ion.velocityMS[axis]+target.massU*target.velocityMS[axis],products.fastNeutral.massU*products.fastNeutral.velocityMS[axis]+products.slowIon.massU*products.slowIon.velocityMS[axis]);
 assert.equal(products.ledger.incomingNuclei,products.ledger.outgoingNuclei);assert.equal(products.ledger.incomingChargeE,products.ledger.outgoingChargeE);
 assert.equal(JSON.stringify([ion,target]),before);
 assert.throws(()=>hydrogenCaptureProducts({...ion,massU:40},target),/Explicit H-1/);
 assert.throws(()=>hydrogenCaptureProducts(ion,{...target,velocityMS:[1,0,0]}),/cold stationary/);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFuelMomentumGrid,advanceFuelMomentum,fuelRadialCurrentTorques,fuelDopplerCentroid,
 fuelIsotopeLogOddsChange,fuelLithiumNeutralTransport,fuelMomentumState} from '../src/fuel-momentum.js';
const make=(inner:number|null=null,outer:number|null=null)=>createFuelMomentumGrid({edgesM:[0,.25,.5,.75,1],lengthM:2,
 densityKgM3:[1,1,1,1],viscosityPaS:[.1,.1,.1,.1],innerWallRadS:inner,outerWallRadS:outer});
test('regular-axis stress-free rigid rotation has no shear and conserves angular momentum',()=>{
 const grid=make(),omega=[3,3,3,3],next=advanceFuelMomentum(grid,omega,[0,0,0,0],.3);
 assert.ok(Math.max(...next.omegaRadS.map(v=>Math.abs(v-3)))<1e-12);
 assert.ok(next.increment.shearHeatJ<1e-24);assert.ok(Math.abs(next.angularResidualKgM2S)<1e-12);
 assert.throws(()=>make(0));
});
test('stationary no-slip wall torque removes momentum, dissipating heat in the gas with zero wall work',()=>{
 const next=advanceFuelMomentum(make(null,0),[2,2,2,2],[0,0,0,0],.1);
 assert.ok(next.increment.wallImpulseKgM2S<0);assert.equal(Math.abs(next.increment.wallWorkJ),0);
 assert.ok(next.increment.shearHeatJ>0);assert.ok(next.increment.numericalLossJ>0);
 assert.ok(Math.abs(next.energyResidualJ)<1e-12);
});
test('signed electromagnetic torque integrates the driven annulus without excluding core gas',()=>{
 const grid=make(),torque=fuelRadialCurrentTorques(grid,.3,2,3);
 assert.ok(Math.abs(torque.reduce((a,b)=>a+b,0)+3*(1-.3**2))<1e-14);
 assert.equal(torque[0],0);assert.equal(grid.edgesM[0],0);
 assert.throws(()=>fuelRadialCurrentTorques(grid,0,2,3),/positive radius/);
 const annulus=createFuelMomentumGrid({...grid,edgesM:[.2,.4,.6,.8,1]});
 assert.ok(fuelRadialCurrentTorques(annulus,.2,2,3).every(t=>t<0));
});
test('Doppler chords of rigid rotation and isotope odds reproduce exact sampling-radius laws',()=>{
 const grid=make(),omega=[7,7,7,7];
 for(const x of [-.9,-.2,0,.2,.9])assert.ok(Math.abs(fuelDopplerCentroid(grid,omega,x)-7*x)<1e-14);
 const mass=1.66053906892e-27,a=.2,b=.8,T=500;
 assert.ok(Math.abs(fuelIsotopeLogOddsChange(grid,omega,[T,T,T,T],mass,a,b)-mass*49*(b*b-a*a)/(2*1.380649e-23*T))<1e-17);
 assert.throws(()=>fuelDopplerCentroid(grid,omega,1));
});
test('zero step retains signed fields; moving walls supply mechanical work; invalid material inputs fail',()=>{
 const grid=make(null,3),initial=[-.1,.2,.3,-.4],next=advanceFuelMomentum(grid,initial,[1,-1,0,0],0);
 assert.deepEqual(next.omegaRadS,initial);assert.equal(next.increment.shearHeatJ,0);
 assert.ok(advanceFuelMomentum(grid,[0,0,0,0],[0,0,0,0],.1).increment.wallWorkJ>0);
 assert.throws(()=>advanceFuelMomentum(grid,initial,[0,0,0,0],-1));
 assert.throws(()=>createFuelMomentumGrid({...grid,viscosityPaS:[0,1,1,1]}));
 assert.throws(()=>fuelMomentumState(grid,[1e200,1e200,1e200,1e200]),/energy domain/);
});
test('neutral lithium transport fits retain source units and domain',()=>{
 const at500=fuelLithiumNeutralTransport(500),at1000=fuelLithiumNeutralTransport(1000);
 assert.ok(Math.abs(at500.viscosityPaS/(.314*500**.863)-1e-7)<1e-21);
 assert.ok(Math.abs(at1000.conductivityWmK/at500.conductivityWmK-2**.863)<1e-14);
 for(const t of [99,3001,NaN])assert.throws(()=>fuelLithiumNeutralTransport(t));
});

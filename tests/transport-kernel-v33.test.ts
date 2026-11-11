import test from 'node:test';
import assert from 'node:assert/strict';
import {scatterCoulombPair,collideCoulombCell,coulombVariance,type CoulombIon} from '../src/coulomb.js';
import * as before from '../scientific/transport-v33/performance/original-coulomb.js';
import {collideAxisymmetricCell} from '../src/axisymmetric-collisions.js';
import {collideAxisymmetricCell as originalRing} from '../scientific/transport-v33/performance/original-ring.js';

const generator=(seed:number)=>()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
test('allocation-reduced pair arithmetic retains exact frozen TA/Nanbu results and draw sequence',()=>{
 const random=generator(17821);
 for(const method of ['takizuka-abe','nanbu'] as const)for(let i=0;i<10000;i++){
  const ion=():CoulombIon=>({massU:20+160*random(),chargeState:1+Math.floor(3*random()),
   velocity:[(random()-.5)*1e5,(random()-.5)*1e5,(random()-.5)*1e5]});
  const a=ion(),b=ion(),density=10**(14+8*random()),log=2+15*random(),dt=10**(-11+6*random());
  const oldRng=generator(i),newRng=generator(i);
  assert.equal(coulombVariance(a,b,density,log,dt),before.coulombVariance(a,b,density,log,dt));
  assert.deepEqual(scatterCoulombPair(a,b,density,log,dt,newRng,method),
   before.scatterCoulombPair(a,b,density,log,dt,oldRng,method));
  assert.equal(newRng(),oldRng(),'same random draw count');
 }
});

test('cell scheduling and ring observer identities remain exact against frozen implementations',()=>{
 for(const n of [0,1,2,7,32])for(const method of ['takizuka-abe','nanbu'] as const){
  const random=generator(73),make=()=>Array.from({length:n},(_,i)=>({
   massU:i%2?84:40,chargeState:1,position:[random()*.1,random()*.1,random()*.5] as [number,number,number],
   velocity:[(random()-.5)*1e4,(random()-.5)*1e4,(random()-.5)*1e4] as [number,number,number]}));
  const ions=make();
  for(const [current,original] of [[collideCoulombCell,before.collideCoulombCell],[collideAxisymmetricCell,originalRing]] as const){
   const a=structuredClone(ions),b=structuredClone(ions),eventsA:unknown[]=[],eventsB:unknown[]=[];
   const resultA=current(a,1e18,10,1e-7,generator(98),(x,y,impulse)=>eventsA.push([a.indexOf(x),a.indexOf(y),impulse]),method);
   const resultB=original(b,1e18,10,1e-7,generator(98),(x,y,impulse)=>eventsB.push([b.indexOf(x),b.indexOf(y),impulse]),method);
   assert.deepEqual(a,b);assert.deepEqual(resultA,resultB);assert.deepEqual(eventsA,eventsB);
  }
 }
});

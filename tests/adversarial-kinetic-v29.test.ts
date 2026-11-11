import test from 'node:test';
import assert from 'node:assert/strict';
import {AMU,E_CHARGE,type Vec} from '../src/physics.js';
import {scatterCoulombPair,coulombVariance} from '../src/coulomb.js';
import {collideAxisymmetricCell,axisymmetricCollisionCells} from '../src/axisymmetric-collisions.js';
import {canonicalMomentum,type DoublewellModel} from '../src/doublewell-orbits.js';

const close=(a:number,b:number,scale:number,tolerance=2e-12)=>assert.ok(Math.abs(a-b)<=tolerance*scale,`${a} != ${b}`);
const norm2=(v:Vec)=>v.reduce((s,x)=>s+x*x,0);

test('unlike-ion scattering obeys SI Rutherford variance and conserves center-of-momentum energy at extreme variance',()=>{
 const a={massU:40,chargeState:2,velocity:[1300,-2100,670] as Vec};
 const b={massU:84,chargeState:3,velocity:[-1700,1100,-310] as Vec};
 const reducedMass=AMU/(1/a.massU+1/b.massU),g=Math.hypot(...a.velocity.map((v,i)=>v-b.velocity[i]));
 const coupling=a.chargeState*b.chargeState*E_CHARGE**2/(4*Math.PI*8.8541878128e-12);
 const coefficient=2*Math.PI*1e18*coupling**2*10/(reducedMass**2*g**3);
 close(coulombVariance(a,b,1e18,10,1),coefficient,coefficient);
 const beforeEnergy=a.massU*norm2(a.velocity)+b.massU*norm2(b.velocity);
 for(const variance of [1e-8,.1,1,100,1e8]){
  const draws=[.6,.37,.19];let i=0;
  const after=scatterCoulombPair(a,b,1e18,10,variance/coefficient,()=>draws[i++]);
  close(a.massU*norm2(after.velocityA)+b.massU*norm2(after.velocityB),beforeEnergy,beforeEnergy);
  for(let k=0;k<3;k++)close(a.massU*after.velocityA[k]+b.massU*after.velocityB[k],
   a.massU*a.velocity[k]+b.massU*b.velocity[k],Math.sqrt(beforeEnergy*(a.massU+b.massU)));
 }
});

test('axisymmetric torque observer equals raw canonical-angular change for unequal radii and charges',()=>{
 const m:DoublewellModel={radius:.2,length:.6,magneticT:.06,voltage:20,quadraticShape:1.2};
 const a={position:[.06,0,.2] as Vec,velocity:[1500,2200,3000] as Vec,massU:40,chargeState:2};
 const b={position:[0,.09,.2] as Vec,velocity:[-1700,-1300,-2400] as Vec,massU:84,chargeState:1};
 const energyBefore=a.massU*norm2(a.velocity)+b.massU*norm2(b.velocity);
 const pBefore=canonicalMomentum(a,a,m)+canonicalMomentum(b,b,m);
 const axialBefore=a.massU*a.velocity[2]+b.massU*b.velocity[2];
 let observed=0,i=0;const draws=[.8,.4,.1,.3];
 collideAxisymmetricCell([a,b],1e18,10,1e-7,()=>draws[i++],(first,second,impulse)=>{
  observed+=(Math.hypot(first.position[0],first.position[1])-Math.hypot(second.position[0],second.position[1]))*impulse[1];
 });
 const pAfter=canonicalMomentum(a,a,m)+canonicalMomentum(b,b,m);
 close(pAfter-pBefore,observed,Math.max(Math.abs(pBefore),Math.abs(observed)));
 close(a.massU*norm2(a.velocity)+b.massU*norm2(b.velocity),energyBefore,energyBefore);
 close(a.massU*a.velocity[2]+b.massU*b.velocity[2],axialBefore,Math.sqrt(energyBefore*(a.massU+b.massU)));
});

test('annular source fitting uses exact physical volume and does not renormalize representatives',()=>{
 const radius=.2,length=.6,sourceRadius=.08,sourceLength=.15,weight=3e12;
 const ions=Array.from({length:1024},(_,i)=>{
  const r=sourceRadius*Math.sqrt((i+.5)/1024),phi=i*2.399963229728653;
  return {position:[r*Math.cos(phi),r*Math.sin(phi),sourceLength*((i*37)%1024+.5)/1024] as Vec};
 });
 const cells=axisymmetricCollisionCells(ions,{radius,length,weight,radialCells:3,axialCells:9,
  radiusBreakM:sourceRadius,axialBreakM:sourceLength});
 close(cells.reduce((s,c)=>s+c.densityM3*c.volumeM3,0),ions.length*weight,ions.length*weight);
 for(const cell of cells){
  assert.ok(cell.radialHighM<=sourceRadius);assert.ok(cell.axialHighM<=sourceLength);
  const volume=2*Math.PI*(cell.radialHighM+cell.radialLowM)/2*(cell.radialHighM-cell.radialLowM)*(cell.axialHighM-cell.axialLowM);
  close(volume,cell.volumeM3,volume);
 }
});

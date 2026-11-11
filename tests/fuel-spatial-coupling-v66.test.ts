import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFuelMomentumGrid,advanceFuelMomentum,fuelMomentumState} from '../src/fuel-momentum.js';
import {advanceFuelAdvectedMomentum} from '../src/fuel-spatial-coupling.js';

const make=(wall:number|null=null)=>createFuelMomentumGrid({edgesM:[0,.5,Math.sqrt(.5),Math.sqrt(.75),1],lengthM:1,
 densityKgM3:[1,1,1,1],viscosityPaS:[.2,.1,.5,.3],innerWallRadS:null,outerWallRadS:wall});
const close=(a:number,b:number,tolerance=1e-11)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);

test('accepted outward mass transfers conserve mass and angular momentum while updating local inertia',()=>{
 const old=make(),omega=[3,2,1,.5],next=advanceFuelAdvectedMomentum(old,omega,[.1,.03,-.02],[0,0,0,0],.01);
 close(next.massKg.reduce((a,b)=>a+b,0),Math.PI);
 close(next.angularMomentumKgM2S,fuelMomentumState(old,omega).angularMomentumKgM2S);
 close(next.angularResidualKgM2S,0);close(next.energyResidualJ,0);
 assert.ok(next.grid.densityKgM3[0]<old.densityKgM3[0]);assert.ok(next.grid.densityKgM3[1]>old.densityKgM3[1]);
 assert.ok(next.increment.advectionNumericalLossJ>0);assert.ok(next.increment.backwardEulerNumericalLossJ>0);
 close(next.centWorkJByCell.reduce((a,b)=>a+b,0),next.increment.centrifugalWorkJ);
 close(next.shearHeatJByCell.reduce((a,b)=>a+b,0),next.increment.shearHeatJ);
});

test('zero aggregate transfer, including counterdiffusion, reduces to qualified prescribed-mass shear',()=>{
 const grid=make(),omega=[-1,.5,2,3],torque=[.1,-.2,.3,0],dt=.02;
 // Species transfers +0.03kg and −0.03kg have no net mass/angular advection.
 const combined=[.03-.03,.03-.03,.03-.03];
 const next=advanceFuelAdvectedMomentum(grid,omega,combined,torque,dt),reference=advanceFuelMomentum(grid,omega,torque,dt);
 next.omegaRadS.forEach((v,i)=>close(v,reference.omegaRadS[i]));
 close(next.increment.advectionNumericalLossJ,0);close(next.increment.centrifugalWorkJ,0);
 close(next.increment.shearHeatJ,reference.increment.shearHeatJ);close(next.energyResidualJ,0);
});

test('moving and stationary wall work, reciprocal torques and signed currents preserve the full kinetic identity',()=>{
 for(const wall of [0,4]){
  const grid=make(wall),next=advanceFuelAdvectedMomentum(grid,[1,-2,.5,-1],[.04,-.03,.01],[.3,-.4,.2,-.1],.03);
  close(next.angularResidualKgM2S,0);close(next.energyResidualJ,0);
  if(wall===0)assert.equal(Math.abs(next.increment.wallWorkJ),0);
  else assert.ok(next.increment.wallWorkJ>0);
  assert.ok(next.shearHeatJByCell.every(q=>q>=0));
 }
});

test('one-face two-cell momentum flux matches a direct nonsymmetric system and its explicit work split',()=>{
 const grid=createFuelMomentumGrid({edgesM:[1,Math.sqrt(2),Math.sqrt(3)],lengthM:1,densityKgM3:[1,2],viscosityPaS:[1,4],innerWallRadS:null,outerWallRadS:null});
 const initial=[2,-1],F=.1,dt=.02,next=advanceFuelAdvectedMomentum(grid,initial,[F],[0,0],dt);
 const I=next.grid.inertiaKgM2,g=grid.conductance[1],flux=2*F;
 const a=I[0]+dt*g+flux,b=-dt*g,c=-dt*g-flux,d=I[1]+dt*g;
 const rhs=initial.map((v,i)=>v*grid.inertiaKgM2[i]),det=a*d-b*c;
 close(next.omegaRadS[0],(d*rhs[0]-b*rhs[1])/det);close(next.omegaRadS[1],(a*rhs[1]-c*rhs[0])/det);
 close(next.increment.centrifugalWorkJ,F*(next.omegaRadS[0]**2+next.omegaRadS[1]**2)/4);
 close(next.increment.advectionNumericalLossJ,F*(next.omegaRadS[1]-next.omegaRadS[0])**2);
 const left=(1/grid.radiusM[0]**2-1/2)/(4*Math.PI),right=(1/2-1/grid.radiusM[1]**2)/(16*Math.PI);
 close(next.shearHeatJByCell[0]/next.shearHeatJByCell[1],left/right);
 close(next.energyResidualJ,0);
});

test('zero-time mass flux, depleted cells, uneven volume and stale derived density/inertia fail explicitly',()=>{
 const grid=make(),omega=[1,1,1,1],torque=[0,0,0,0];
 assert.throws(()=>advanceFuelAdvectedMomentum(grid,omega,[.01,0,0],torque,0),/zero-time/);
 assert.throws(()=>advanceFuelAdvectedMomentum(grid,omega,[10,0,0],torque,.1),/positive gas mass/);
 const stale={...grid,densityKgM3:[2,1,1,1]};
 assert.throws(()=>advanceFuelAdvectedMomentum(stale,omega,[0,0,0],torque,.1),/derived fields/);
 const uneven=createFuelMomentumGrid({...grid,edgesM:[0,.25,.5,.75,1]});
 assert.throws(()=>advanceFuelAdvectedMomentum(uneven,omega,[0,0,0],torque,.1),/equal-volume/);
 assert.throws(()=>advanceFuelAdvectedMomentum(grid,omega,[0,0],torque,.1),/internal mass transfers/);
 const next=advanceFuelAdvectedMomentum(grid,omega,[0,0,0],torque,0);
 next.omegaRadS.forEach((v,i)=>close(v,omega[i]));close(next.increment.numericalLossJ,0);
});

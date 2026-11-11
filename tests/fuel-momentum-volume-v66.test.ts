import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFuelMomentumGrid,advanceFuelMomentum} from '../src/fuel-momentum.js';
import {advanceFuelAdvectedMomentum} from '../src/fuel-spatial-coupling.js';

const rho=2,mu=.3,L=.7,A=3,B=-2,R=1,rate=8*mu*B/rho;
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<2e-11*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
function fixture(n:number,wall=A+B*R*R){
 const edges=Array.from({length:n+1},(_,i)=>R*Math.sqrt(i/n));
 const q=Array.from({length:n},(_,i)=>(i+.5)*R*R/n);
 const grid=createFuelMomentumGrid({edgesM:edges,lengthM:L,densityKgM3:Array(n).fill(rho),
  viscosityPaS:Array(n).fill(mu),innerWallRadS:null,outerWallRadS:wall,shearScheme:'volume-coordinate'});
 return {grid,q,omega:q.map(v=>A+B*v)};
}

test('volume-coordinate shear gives exact quadratic-r acceleration, including the regular axis',()=>{
 for(const n of [4,16]){
  const {grid,omega}=fixture(n),g=grid.conductance;
  for(let i=0;i<n;i++){
   const inner=i?g[i]*(omega[i-1]-omega[i]):0;
   const outer=g[i+1]*((i<n-1?omega[i+1]:grid.outerWallRadS!)-omega[i]);
   close((inner+outer)/grid.inertiaKgM2[i],rate);
  }
  // The analytic counter-torque balances physical diffusion in every cell.
  const torque=grid.inertiaKgM2.map(v=>-v*rate),next=advanceFuelMomentum(grid,omega,torque,.2);
  next.omegaRadS.forEach((v,i)=>close(v,omega[i]));
  close(next.energyResidualJ,0);close(next.angularResidualKgM2S,0);
  // Negative control: the separately valid constant-torque point-profile
  // operator cannot be reused with this q-midpoint transient representation.
  const pointGrid=createFuelMomentumGrid({...grid,shearScheme:'integrated-resistance'});
  const pointAcceleration=pointGrid.conductance[1]*(omega[1]-omega[0])/pointGrid.inertiaKgM2[0];
  close(pointAcceleration,(1+Math.SQRT2)*mu*B/rho);
  assert.ok(Math.abs(pointAcceleration/rate-1)>.5,'the representation mismatch must remain detectable');
 }
});

test('moving-wall quadratic-r transient is exact and reduces identically through zero-flux coupling',()=>{
 for(const n of [4,16]){
  let omega=fixture(n).omega;
  const dt=.005;
  for(let step=1;step<=20;step++){
   const time=step*dt,{grid,q}=fixture(n,A+B*R*R+rate*time);
   const reference=advanceFuelMomentum(grid,omega,Array(n).fill(0),dt);
   const coupled=advanceFuelAdvectedMomentum(grid,omega,Array(n-1).fill(0),Array(n).fill(0),dt);
   coupled.omegaRadS.forEach((v,i)=>{close(v,A+B*q[i]+rate*time);close(v,reference.omegaRadS[i]);});
   close(coupled.energyResidualJ,0);close(coupled.angularResidualKgM2S,0);
   close(coupled.increment.shearHeatJ,reference.increment.shearHeatJ);
   close(coupled.increment.advectionNumericalLossJ,0);
   omega=coupled.omegaRadS;
  }
 }
});

test('volume-coordinate variable-viscosity resistance and physical heat use the same half distances',()=>{
 const {grid:base}=fixture(4),viscosity=[.1,.2,.4,.8],grid=createFuelMomentumGrid({...base,viscosityPaS:viscosity});
 const q=Array.from({length:4},(_,i)=>(i+.5)/4),omega=[2,1,-1,3],dt=.03;
 const next=advanceFuelAdvectedMomentum(grid,omega,[0,0,0],[0,0,0,0],dt),heat=Array(4).fill(0);
 for(let f=1;f<4;f++){
  const qf=f/4,left=(qf-q[f-1])/(4*Math.PI*L*viscosity[f-1]*qf*qf);
  const right=(q[f]-qf)/(4*Math.PI*L*viscosity[f]*qf*qf);
  close(grid.conductance[f],1/(left+right));
  const dissipated=dt*grid.conductance[f]*(next.omegaRadS[f]-next.omegaRadS[f-1])**2;
  heat[f-1]+=dissipated*left/(left+right);heat[f]+=dissipated*right/(left+right);
 }
 heat[3]+=dt*grid.conductance[4]*(grid.outerWallRadS!-next.omegaRadS[3])**2;
 heat.forEach((v,i)=>close(v,next.shearHeatJByCell[i]));
 close(next.energyResidualJ,0);
});

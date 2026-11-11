import {test} from 'node:test';
import assert from 'node:assert/strict';
import {solveFuelCurrent,type FuelCurrentInput} from '../src/fuel-current.js';

/** Manufacture the regular current I_r(q)=a q dz, q=r², in every axial row.
 * Independent nodal potentials and electrode supplies enforce that current;
 * the torque oracle integrates I_r(q) analytically over the complete cell.
 * This catches losing the axis-to-center source or using arithmetic-r centers.
 */
function regularAxis(n:number,rotating:boolean){
 const R=1,L=1,nz=2,dz=L/nz,dq=R*R/n,a=3,B=.7,sigmaR=2,sigmaZ=7;
 const edges=Array.from({length:n+1},(_,i)=>R*Math.sqrt(i/n));
 const q=Array.from({length:n},(_,i)=>(i+.5)*dq),centers=q.map(Math.sqrt);
 const omega=q.map(v=>rotating?1+4*v:0),potential=[0];
 for(let i=0;i<n-1;i++){
  const resistance=Math.log(centers[i+1]/centers[i])/(2*Math.PI*dz*sigmaR);
  const emf=B*dq*(omega[i]+omega[i+1])/4;
  potential.push(potential[i]+emf-a*(i+1)*dq*dz*resistance);
 }
 const outerResistance=Math.log(R/centers[n-1])/(2*Math.PI*dz*sigmaR);
 const outer=potential[n-1]+B*dq*omega[n-1]/4-a*R*R*dz*outerResistance;
 // Each row's radial current divergence a*dq*dz is supplied by its one
 // axial boundary; internal axial current is zero by row symmetry.
 const supply=potential.map(v=>v+a*dz*dz/(2*Math.PI*sigmaZ));
 const input:FuelCurrentInput={radialEdgesM:edges,axialEdgesM:[0,dz,L],
  sigmaPerpSM:Array(n*nz).fill(sigmaR),sigmaParallelSM:Array(n*nz).fill(sigmaZ),
  omegaRadS:Array.from({length:n*nz},(_,i)=>omega[i%n]),magneticT:B,
  innerVoltageV:Array(nz).fill(null),outerVoltageV:Array(nz).fill(outer),
  lowerVoltageV:supply,upperVoltageV:supply};
 const expectedTorque=Array.from({length:n},(_,i)=>-B*a*dz*dq*((i*dq)+((i+1)*dq))/4);
 return {input,potential,expectedTorque,omega};
}

test('regular-axis Lorentz torque integrates the full cell, including its axis half',()=>{
 for(const n of [4,16])for(const rotating of [false,true]){
  const {input,potential,expectedTorque,omega}=regularAxis(n,rotating),result=solveFuelCurrent(input);
  for(let j=0;j<2;j++)for(let i=0;i<n;i++){
   assert.ok(Math.abs(result.potentialV[j*n+i]-potential[i])<2e-9,'manufactured nodal potential');
   assert.ok(Math.abs(result.torqueNm[j*n+i]/expectedTorque[i]-1)<2e-8,
    `regular-axis torque n=${n}, cell=${i}: ${result.torqueNm[j*n+i]} vs ${expectedTorque[i]}`);
  }
  const mechanical=2*expectedTorque.reduce((s,v,i)=>s+v*omega[i],0);
  const scale=Math.abs(result.electrodePowerW)+result.jouleW+Math.abs(mechanical);
  assert.ok(Math.abs(result.mechanicalW-mechanical)<2e-9*scale);
  assert.ok(Math.abs(result.electrodePowerW-result.jouleW-mechanical)<2e-9*scale,
   'the same corrected geometry must preserve the EMF/torque power adjoint');
 }
});

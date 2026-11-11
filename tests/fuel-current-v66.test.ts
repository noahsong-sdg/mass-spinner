import {test} from 'node:test';
import assert from 'node:assert/strict';
import {solveFuelCurrent,type FuelCurrentInput} from '../src/fuel-current.js';
function annulus(omega=0):FuelCurrentInput{
 const nr=16,nz=4,n=nr*nz;
 return {radialEdgesM:Array.from({length:nr+1},(_,i)=>1+i/nr),axialEdgesM:[0,.25,.5,.75,1],
  sigmaPerpSM:Array(n).fill(2),sigmaParallelSM:Array(n).fill(7),omegaRadS:Array(n).fill(omega),magneticT:3,
  innerVoltageV:Array(nz).fill(10),outerVoltageV:Array(nz).fill(0),lowerVoltageV:Array(nr).fill(null),upperVoltageV:Array(nr).fill(null)};
}
test('coaxial resistance, motional EMF, Lorentz work and Joule heating satisfy exact circuit law',()=>{
 for(const omega of [0,2,-2]){
  const c=annulus(omega),s=solveFuelCurrent(c),current=(10+3*omega*(4-1)/2)/(Math.log(2)/(4*Math.PI));
  const outer=s.boundaryCurrentsA.filter(v=>v>0).reduce((a,b)=>a+b,0);
  assert.ok(Math.abs(outer/current-1)<1e-9);
  assert.ok(Math.abs(s.mechanicalW+current*3*omega*1.5)<1e-7);
  assert.ok(s.jouleW>0);assert.ok(Math.abs(s.energyResidualW)<1e-7);
  assert.ok(Math.abs(s.netBoundaryCurrentA)<1e-8);
 }
});
test('open radial boundaries polarize against rigid-rotation motional EMF without spurious wall current',()=>{
 const c=annulus(2);c.innerVoltageV=c.innerVoltageV.map(()=>null);c.outerVoltageV=c.outerVoltageV.map(()=>null);
 c.lowerVoltageV=c.lowerVoltageV.map(()=>0);
 // Lower electrode is equipotential, so this deliberately permits internal circulation.
 const s=solveFuelCurrent(c);assert.ok(s.jouleW>0);assert.ok(Math.abs(s.netBoundaryCurrentA)<1e-8);
 assert.ok(Math.abs(s.electrodePowerW)<1e-12);assert.ok(Math.abs(s.jouleW+s.mechanicalW)<1e-7);
});
test('axis electrodes and ungrounded current systems fail explicitly; zero voltage gives zero current',()=>{
 const c=annulus();c.innerVoltageV=c.innerVoltageV.map(()=>0);assert.equal(solveFuelCurrent(c).jouleW,0);
 assert.throws(()=>solveFuelCurrent({...c,outerVoltageV:c.outerVoltageV.map(()=>null),innerVoltageV:c.innerVoltageV.map(()=>null)}));
 assert.throws(()=>solveFuelCurrent({...c,radialEdgesM:c.radialEdgesM.map(r=>r-1)}),/axis/);
});
test('voltage gauge shifts do not alter currents, heat or torque',()=>{
 const c=annulus(2),a=solveFuelCurrent(c),shift=(v:number|null)=>v===null?null:v+1e8;
 const b=solveFuelCurrent({...c,innerVoltageV:c.innerVoltageV.map(shift),outerVoltageV:c.outerVoltageV.map(shift)});
 assert.ok(Math.abs(a.jouleW-b.jouleW)<1e-7);assert.ok(Math.abs(a.electrodePowerW-b.electrodePowerW)<1e-7);
});
test('regular-axis open circuit balances motional field without current or heating',()=>{
 const c=annulus(2),nr=c.radialEdgesM.length-1,nz=c.axialEdgesM.length-1;
 const s=solveFuelCurrent({...c,radialEdgesM:c.radialEdgesM.map(r=>r-1),innerVoltageV:Array(nz).fill(null)});
 assert.ok(s.jouleW<1e-15);assert.ok(Math.abs(s.mechanicalW)<1e-8);
 for(let j=0;j<nz;j++)for(let i=0;i<nr;i++)assert.ok(Math.abs(s.potentialV[j*nr+i]-3*((i*i+(i+1)**2)/(2*nr**2)-1))<1e-8);
});

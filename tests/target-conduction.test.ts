import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceTargetConduction,type TargetConductionConfig} from '../src/target-conduction.ts';

const close=(a:number,b:number,tol=1e-11)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const slab=(n:number):TargetConductionConfig=>({cells:Array.from({length:n},()=>({widthM:1/n,conductivityWMK:1,volumetricHeatCapacityJm3K:1})),coolantK:300,backHeatTransferWM2K:0});

test('depth-local deposition creates a film/backing gradient rather than one frozen bulk node',()=>{
 const c=slab(2);c.cells=c.cells.map(v=>({...v,widthM:1}));
 const s=advanceTargetConduction(c,[300,300],1,[100,0]);
 close(s.temperatureK[0],300+200/3);close(s.temperatureK[1],300+100/3);
 close(s.storedChangeJm2,100);close(s.depositedJm2,100);close(s.energyResidualJm2,0);
 assert.ok(s.faceFluxWM2[1]>0);assert.equal(s.coolantJm2,0);
});

test('adiabatic node has exact source heating and zero-time preserves its input',()=>{
 const c=slab(1),initial=[310],source=[12];
 const s=advanceTargetConduction(c,initial,.25,source);
 close(s.temperatureK[0],313);close(s.storedChangeJm2,3);close(s.energyResidualJm2,0);
 assert.deepEqual(advanceTargetConduction(c,initial,0,source).temperatureK,initial);
 assert.deepEqual(initial,[310]);assert.deepEqual(source,[12]);
});

test('insulated heterogeneous cells conserve energy and obey the discrete maximum principle for a large step',()=>{
 const c:TargetConductionConfig={cells:[{widthM:1e-6,conductivityWMK:5,volumetricHeatCapacityJm3K:2e6},{widthM:.001,conductivityWMK:100,volumetricHeatCapacityJm3K:3e6}],coolantK:293.15,backHeatTransferWM2K:0};
 const old=[1000,300],s=advanceTargetConduction(c,old,1e9,[0,0]);
 assert.ok(s.temperatureK.every(t=>t>=300&&t<=1000));
 close(s.storedChangeJm2,0,1e-8);close(s.energyResidualJm2,0,1e-8);
 close(s.temperatureK[0],(2*1000+3000*300)/3002,1e-10);
});

test('uniform bath equilibrium is exact for any finite representable step',()=>{
 const c=slab(7);c.backHeatTransferWM2K=5000;
 const s=advanceTargetConduction(c,Array(7).fill(300),1e8,Array(7).fill(0));
 assert.deepEqual(s.temperatureK,Array(7).fill(300));assert.equal(s.energyResidualJm2,0);
});

test('contact and back-half-cell resistance produce the independent layered steady profile',()=>{
 const c:TargetConductionConfig={cells:[{widthM:.01,conductivityWMK:2,volumetricHeatCapacityJm3K:20},{widthM:.02,conductivityWMK:5,volumetricHeatCapacityJm3K:30}],contactResistanceM2KPerW:[.1],coolantK:300,backHeatTransferWM2K:10,backContactResistanceM2KPerW:.2};
 const s=advanceTargetConduction(c,[300,300],1e10,[100,0]);
 const back=300+100*(.02/(2*5)+.2+1/10),front=back+100*(.01/(2*2)+.1+.02/(2*5));
 close(s.temperatureK[0],front,1e-9);close(s.temperatureK[1],back,1e-9);
 close(s.faceFluxWM2[1],100,1e-9);close(s.faceFluxWM2[2],100,1e-9);
 close(s.energyResidualJm2,0,1e-3);
});

test('signed coolant flux warms a colder slab and one-node timestep error is first order',()=>{
 const c=slab(1);c.backHeatTransferWM2K=2;
 // Cell half resistance .5 plus convection resistance .5 => G=1, C=1.
 const cold=advanceTargetConduction(c,[250],.2,[0]);
 close(cold.temperatureK[0],300-50/1.2);assert.ok(cold.coolantJm2<0);
 close(cold.storedChangeJm2,-cold.coolantJm2);
 const errors=[10,20,40,80].map(steps=>{let t=[350];for(let k=0;k<steps;k++)t=advanceTargetConduction(c,t,1/steps,[0]).temperatureK;return Math.abs(t[0]-(300+50/Math.E));});
 for(let i=1;i<errors.length;i++)assert.ok(errors[i-1]/errors[i]>1.9&&errors[i-1]/errors[i]<2.1);
});

test('insulated cosine mode matches the independent discrete eigenvalue and converges spatially',()=>{
 const discreteErrors:number[]=[],continuumErrors:number[]=[];
 for(const n of [8,16,32]){
  const c=slab(n),initial=c.cells.map((_,i)=>300+10*Math.cos(Math.PI*(i+.5)/n));
  const dt=1e-6,steps=20000,time=dt*steps;let temperatures=initial;
  for(let k=0;k<steps;k++)temperatures=advanceTargetConduction(c,temperatures,dt,Array(n).fill(0)).temperatureK;
  const lambda=4*n*n*Math.sin(Math.PI/(2*n))**2,amplitude=(1+lambda*dt)**-steps;
  discreteErrors.push(Math.max(...temperatures.map((t,i)=>Math.abs(t-(300+(initial[i]-300)*amplitude)))));
  continuumErrors.push(Math.max(...temperatures.map((t,i)=>Math.abs(t-(300+(initial[i]-300)*Math.exp(-(Math.PI**2)*time))))));
 }
 assert.ok(discreteErrors.every(e=>e<2e-8),JSON.stringify(discreteErrors));
 for(let i=1;i<continuumErrors.length;i++)assert.ok(continuumErrors[i-1]/continuumErrors[i]>3.8&&continuumErrors[i-1]/continuumErrors[i]<4.2,JSON.stringify(continuumErrors));
});

test('thermal domains reject negative heat, malformed contacts, invalid geometry and nonfinite arithmetic',()=>{
 const c=slab(2);
 for(const run of [()=>advanceTargetConduction(c,[300],1,[0,0]),()=>advanceTargetConduction(c,[300,300],1,[-1,0]),()=>advanceTargetConduction({...c,contactResistanceM2KPerW:[-1]},[300,300],1,[0,0]),()=>advanceTargetConduction({...c,cells:[{widthM:0,conductivityWMK:1,volumetricHeatCapacityJm3K:1}]},[300],1,[0]),()=>advanceTargetConduction(c,[300,300],Infinity,[0,0]),()=>advanceTargetConduction(c,[300,300],1e308,[1e308,0])])assert.throws(run,RangeError);
});

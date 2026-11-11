import test from 'node:test';
import assert from 'node:assert/strict';
import {AMU,E_CHARGE,DEFAULT_CONFIG,fields,sourceVelocity,step,simulate,type Particle,type Vec} from '../src/physics.js';
import {quarticFields,quarticPotential} from '../src/doublewell-orbits.js';
import {elasticCollision} from '../src/collisions.js';
import {geometry,DEFAULT_GEOMETRY} from '../src/geometries.js';

const close=(a:number,b:number,tolerance:number)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}; tolerance ${tolerance}`);

test('double-well minimum is global over the physical chamber for either voltage sign and cropped plots',()=>{
 const a=DEFAULT_GEOMETRY.radius,critical=E_CHARGE*DEFAULT_GEOMETRY.magneticT**2*a*a/(8*DEFAULT_GEOMETRY.massA*AMU);
 const cases=[
  {voltage:-1000,magneticT:.01,quadraticShape:0,plotInnerFraction:0,expected:a},
  {voltage:-1,magneticT:.1,quadraticShape:0,plotInnerFraction:0,expected:0},
  {voltage:0,magneticT:.1,quadraticShape:1,plotInnerFraction:0,expected:0},
  {voltage:critical*2,magneticT:.1,quadraticShape:1,plotInnerFraction:.75,expected:a/2},
  {voltage:1000,magneticT:.1,quadraticShape:4,plotInnerFraction:0,expected:a},
 ];
 for(const {expected,...settings}of cases){
  const result=geometry('doublewell',{...DEFAULT_GEOMETRY,canonicalMomentum:0,...settings});
  close(result.metrics.find(m=>m.label==='A minimum radius')!.value,expected,1e-14);
 }
});

test('independent uniform crossed-field solution retains signed gyro rotation and ExB drift',()=>{
 for(const qm of [-3,2])for(const magneticT of [-2,1]){
  const electric:Vec=[.3,-.2,0],vE=[electric[1]/magneticT,-electric[0]/magneticT],duration=.7;
  const initial:Particle={position:[.2,-.1,.4],velocity:[.8,-.6,.2]};
  const omega=qm*magneticT,angle=omega*duration,u=initial.velocity[0]-vE[0],v=initial.velocity[1]-vE[1];
  const exactV=[vE[0]+u*Math.cos(angle)+v*Math.sin(angle),vE[1]+v*Math.cos(angle)-u*Math.sin(angle),.2];
  const exactX=[initial.position[0]+vE[0]*duration+(u*Math.sin(angle)+v*(1-Math.cos(angle)))/omega,
   initial.position[1]+vE[1]*duration+(v*Math.sin(angle)-u*(1-Math.cos(angle)))/omega,.4+.2*duration];
  const error=(n:number)=>{let p=structuredClone(initial);for(let j=0;j<n;j++)p=step(p,qm,duration/n,()=>({electric,magnetic:[0,0,magneticT]}));
   return Math.hypot(...p.position.map((x,i)=>x-exactX[i]),...p.velocity.map((x,i)=>x-exactV[i]));};
  const coarse=error(700),fine=error(1400);assert.ok(coarse/fine>3.99&&coarse/fine<4.01);assert.ok(fine<4e-6);
 }
});

test('synchronized Boris drift-kick-drift is reversible for actual radial field evaluators',()=>{
 const initial:Particle={position:[.13,-.08,.2],velocity:[300,-1400,20]},qm=E_CHARGE/(40*AMU);
 const model={radius:.48,length:2.8,magneticT:-.08,voltage:40,quadraticShape:1.2};
 for(const evaluate of [(p:Vec)=>fields(p,model),(p:Vec)=>quarticFields(p,model)]){
  const forward=step(initial,qm,2e-8,evaluate),back=step(forward,qm,-2e-8,evaluate);
  for(let i=0;i<3;i++){close(back.position[i],initial.position[i],1e-15);close(back.velocity[i],initial.velocity[i],1e-11);}
 }
});

test('quartic field gradient matches independent polynomial derivative for both voltage signs',()=>{
 for(const voltage of [-1000,0,400])for(const quadraticShape of [0,1.2,2]){
  const model={radius:.48,length:2.8,magneticT:.03,voltage,quadraticShape},p:Vec=[.12,-.09,.3];
  const derivative=voltage*(4*(p[0]**2+p[1]**2)/model.radius**4-2*quadraticShape/model.radius**2);
  const result=quarticFields(p,model);close(result.electric[0],-derivative*p[0],2e-12);close(result.electric[1],-derivative*p[1],2e-12);
  close(quarticPotential(p,model),voltage*((p[0]**2+p[1]**2)**2/model.radius**4-quadraticShape*(p[0]**2+p[1]**2)/model.radius**2),1e-13);
 }
});

test('cold-neutral relative scattering has the isotropic fourth polar moment for unequal masses',()=>{
 const velocity:Vec=[3,-7,11],speed=Math.hypot(...velocity),bins=8192;
 for(const [a,b]of [[1,200],[40,40],[200,1]]){
  let second=0,fourth=0;
  for(let j=0;j<bins;j++){
   const uniforms=[(j+.5)/bins,.371];let index=0;
   const out=elasticCollision(velocity,a,b,()=>uniforms[index++]);
   const cosine=(out.ionVelocity[2]-out.neutralVelocity[2])/speed;
   second+=cosine*cosine/bins;fourth+=cosine**4/bins;
  }
  close(second,1/3,6e-9);close(fourth,1/5,1.1e-8);
 }
});

test('thermal pulse samples equal energy distributions at unequal mass and charge without hidden charge heating',()=>{
 const result=simulate({...DEFAULT_CONFIG,magneticT:0,voltage:0,distribution:'thermal',perpendicularEV:3,
  parallelEV:2,axialTemperatureEV:7,species:[{massU:2,chargeState:3},{massU:200,chargeState:1}],particlesPerSpecies:1000,dt:1e-8,duration:1e-7});
 close(result.species[0].meanInitialKineticEV,result.species[1].meanInitialKineticEV,1e-13);
 assert.equal(result.species[0].source,result.species[1].source);
 for(const s of result.species){assert.equal(s.source+s.remaining,1000);assert.ok(Math.abs(s.meanInitialKineticEV-8.5)<.7);}
 const fixed=sourceVelocity(40,3,2,7,0,'fixed',()=>{throw new Error('fixed source must not draw thermal samples');});
 close(40*AMU*(fixed[0]**2+fixed[1]**2)/(2*E_CHARGE),3,1e-14);
 close(40*AMU*fixed[2]**2/(2*E_CHARGE),2,1e-14);
});

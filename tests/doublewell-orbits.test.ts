import test from 'node:test';
import assert from 'node:assert/strict';
import {AMU,E_CHARGE,type Particle} from '../src/physics.js';
import {advanceDoublewell,canonicalMomentum,doublewellEnergy,quarticFields,quarticPotential,validateDoublewellOrbitSettings,type DoublewellModel} from '../src/doublewell-orbits.js';

const model:DoublewellModel={radius:.48,length:10,magneticT:.02,voltage:30,quadraticShape:1.4};
const ion={massU:40,chargeState:1};
const radialSpeed=(p:Particle)=>(p.position[0]*p.velocity[0]+p.position[1]*p.velocity[1])/Math.hypot(p.position[0],p.position[1]);
const close=(a:number,b:number,tolerance:number)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}`);

test('quartic laboratory electric field is the differentiated potential, with no added centrifugal force',()=>{
 const p:[number,number,number]=[.2,-.11,.3],h=1e-6;
 const f=quarticFields(p,model);
 for(const i of [0,1]){
  const plus=[...p] as typeof p,minus=[...p] as typeof p;plus[i]+=h;minus[i]-=h;
  close(f.electric[i],-(quarticPotential(plus,model)-quarticPotential(minus,model))/(2*h),2e-8);
 }
 assert.equal(f.electric[2],0);assert.deepEqual(f.magnetic,[0,0,.02]);
 close(quarticPotential([model.radius,0,0],model),model.voltage*(1-model.quadraticShape),1e-12);
});

test('nonlinear collisionless H and canonical Ptheta converge at second order over many radial oscillations',()=>{
 const errors=[];
 for(const dt of [8e-8,4e-8,2e-8]){
  validateDoublewellOrbitSettings(ion,dt,model);
  let p:Particle={position:[.12,0,1],velocity:[200,-2000,0]};
  const e=doublewellEnergy(p,ion,model),l=canonicalMomentum(p,ion,model);let he=0,pe=0;
  for(let i=0;i<Math.round(.0002/dt);i++){
   const next=advanceDoublewell(p,ion,dt,model,'periodic');assert.equal(next.hit,null);p=next.particle;
   he=Math.max(he,Math.abs((doublewellEnergy(p,ion,model)-e)/e));
   pe=Math.max(pe,Math.abs((canonicalMomentum(p,ion,model)-l)/l));
  }
  errors.push([he,pe]);
 }
 for(const j of [0,1])for(const i of [0,1])assert.ok(errors[i][j]/errors[i+1][j]>3.9&&errors[i][j]/errors[i+1][j]<4.1);
 assert.ok(errors[2][0]<6e-7);assert.ok(errors[2][1]<1.2e-6);
});

test('nonlinear radial turning point and flight time agree with independent Hamiltonian quadrature',()=>{
 const initial:Particle={position:[.12,0,1],velocity:[0,-2000,0]},mass=ion.massU*AMU,q=E_CHARGE;
 // Independent one-dimensional reduction. It does not call either exported
 // energy/momentum helper or the Cartesian field when constructing Ueff.
 const rmin=.12,a=model.radius,b=model.magneticT;
 const momentum=mass*rmin*initial.velocity[1]+q*b*rmin*rmin/2;
 const potential=(r:number)=>(momentum-q*b*r*r/2)**2/(2*mass*r*r)
  +q*model.voltage*((r/a)**4-model.quadraticShape*(r/a)**2);
 const energy=potential(rmin);let low=.2,high=.45;
 assert.ok(potential(low)<energy&&potential(high)>energy);
 for(let i=0;i<70;i++){const mid=(low+high)/2;if(potential(mid)>energy)high=mid;else low=mid;}
 const rmax=(low+high)/2;
 // r=rmin+(rmax-rmin)sin²(t) removes the endpoint square-root singularities.
 const bins=20000,du=Math.PI/(2*bins);let turningTime=0;
 for(let j=0;j<bins;j++){
  const u=(j+.5)*du,r=rmin+(rmax-rmin)*Math.sin(u)**2;
  turningTime+=Math.sqrt(mass/2)/(Math.sqrt(energy-potential(r)))
   *2*(rmax-rmin)*Math.sin(u)*Math.cos(u)*du;
 }
 const measure=(dt:number)=>{
  let p=structuredClone(initial),time=0,previousSpeed=0;
  for(let i=0;i<30000;i++){
   const next=advanceDoublewell(p,ion,dt,model,'periodic').particle,speed=radialSpeed(next);
   if(previousSpeed>0&&speed<=0){
    const fraction=previousSpeed/(previousSpeed-speed);
    return {time:time+fraction*dt,radius:Math.hypot(next.position[0],next.position[1])};
   }
   p=next;time+=dt;previousSpeed=speed;
  }
  throw new Error('Expected first outer turning point.');
 };
 const coarse=measure(8e-8),fine=measure(2e-8);
 close(fine.radius,rmax,1e-7);close(fine.time,turningTime,1e-10);
 assert.ok(Math.abs(coarse.time-turningTime)>8*Math.abs(fine.time-turningTime));
});

test('refined absorber events choose earliest wall or axial exit and retain physical impact velocity',()=>{
 const m={...model,radius:1,length:2,magneticT:0,voltage:0},dt=.001;
 for(const [velocity,destination,time]of [[[2000,0,3000],'wall',.0005],[[100,0,3000],'end',1.9/3000],[[0,0,-1000],'source',.0001]] as const){
  const p:Particle={position:[0,0,.1],velocity:[...velocity]};
  const next=advanceDoublewell(p,ion,dt,m);
  assert.equal(next.hit!.destination,destination);close(next.elapsedS,time,1e-16);
  assert.deepEqual(next.particle.velocity,p.velocity);
  if(destination==='wall')close(Math.hypot(...next.particle.position.slice(0,2)),1,1e-15);
 }
 const launch:Particle={position:[0,0,0],velocity:[0,0,100]};
 assert.equal(advanceDoublewell(launch,ion,dt,m).hit,null,'forward source-plane launch remains active');
 const back=advanceDoublewell({...launch,velocity:[0,0,-100]},ion,dt,m);
 assert.equal(back.hit!.destination,'source');close(back.elapsedS,0,1e-16);
 const periodic=advanceDoublewell({position:[0,0,1.99],velocity:[0,0,100]},ion,dt,m,'periodic');
 assert.equal(periodic.hit,null);close(periodic.particle.position[2],2.09,1e-14);
});

test('nonzero-B wall impact time converges to an independent circular orbit intersection',()=>{
 const m={...model,radius:.5,length:2,magneticT:.1,voltage:0},p:Particle={position:[.49,0,1],velocity:[3000,100,0]};
 const omega=ion.chargeState*E_CHARGE*m.magneticT/(ion.massU*AMU);
 const radiusAt=(t:number)=>{
  const x=.49+(3000*Math.sin(omega*t)+100*(1-Math.cos(omega*t)))/omega;
  const y=(100*Math.sin(omega*t)-3000*(1-Math.cos(omega*t)))/omega;
  return Math.hypot(x,y);
 };
 // Choose a velocity whose gyro-circle reaches the wall.
 let lo=0,hi=5e-6;assert.ok(radiusAt(hi)>.5);
 for(let i=0;i<65;i++){const mid=(lo+hi)/2;if(radiusAt(mid)>.5)hi=mid;else lo=mid;}
 const exact=(lo+hi)/2;
 const impact=(dt:number)=>{
  let state=structuredClone(p),time=0;
  for(let i=0;i<10000;i++){
   const next=advanceDoublewell(state,ion,dt,m);
   if(next.hit)return {time:time+next.elapsedS,energy:doublewellEnergy(next.particle,ion,m)};
   state=next.particle;time+=dt;
  }
  throw new Error('Expected wall contact.');
 };
 const a=impact(8e-8),b=impact(4e-8),c=impact(2e-8);
 assert.ok(Math.abs(a.time-exact)>3.5*Math.abs(b.time-exact));
 assert.ok(Math.abs(b.time-exact)>3.5*Math.abs(c.time-exact));
 close(c.time,exact,2e-11);
 close(c.energy/doublewellEnergy(p,ion,m),1,2e-13);
});

test('specular wall reflection preserves H and canonical angular momentum and leaves the absorber inward',()=>{
 const p:Particle={position:[.48,0,1],velocity:[200,1000,30]};
 const reflected:Particle={position:[...p.position],velocity:[-200,1000,30]};
 assert.equal(doublewellEnergy(p,ion,model),doublewellEnergy(reflected,ion,model));
 assert.equal(canonicalMomentum(p,ion,model),canonicalMomentum(reflected,ion,model));
 assert.equal(advanceDoublewell(reflected,ion,2e-8,model,'periodic').hit,null);
});

test('unresolved settings fail explicitly before advancing an ensemble',()=>{
 assert.throws(()=>validateDoublewellOrbitSettings(ion,1e-4,model),/timestep/);
 assert.throws(()=>validateDoublewellOrbitSettings({...ion,chargeState:1.5},2e-8,model),/inputs/);
 assert.throws(()=>validateDoublewellOrbitSettings(ion,2e-8,{...model,radius:0}),/inputs/);
});

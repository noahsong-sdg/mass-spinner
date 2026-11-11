import test from 'node:test';
import assert from 'node:assert/strict';
import {AMU,E_CHARGE,step,type Particle} from '../src/physics.js';
import {advanceDoublewell,quarticFields,validateDoublewellOrbitSettings} from '../src/doublewell-orbits.js';

test('ballistic axial contact at the exact step endpoint collects at either surface',()=>{
 const species={massU:40,chargeState:1},model={radius:10,length:2,magneticT:0,voltage:0,quadraticShape:1};
 for(const vz of [-1,1]){
  const next=advanceDoublewell({position:[0,0,1],velocity:[0,0,vz]},species,1,model);
  assert.equal(next.hit?.destination,vz>0?'end':'source');
  assert.equal(next.elapsedS,1);assert.equal(next.particle.position[2],vz>0?2:0);
 }
});

test('absorber detects a resolved narrow gyro-wall excursion between every old event sample',()=>{
 const species={massU:40,chargeState:1};
 for(const magneticT of [.1,-.1]){
  const model={radius:1,length:2,magneticT,voltage:0,quadraticShape:1};
  const omega=E_CHARGE*magneticT/(40*AMU),dt=.079/Math.abs(omega);
  const rho=.1,center=.9+1e-7,theta=2*Math.atan(omega*dt/32);
  const p:Particle={position:[center+rho*Math.cos(theta),rho*Math.sin(theta),1],
   velocity:[omega*rho*Math.sin(theta),-omega*rho*Math.cos(theta),0]};
  validateDoublewellOrbitSettings(species,dt,model);
  // Uniform-B synchronized Boris positions lie on the exact gyro-circle at
  // angle theta-2atan(omega*t/2). The peak is at dt/16, between old samples.
  const radiusAt=(t:number)=>{
   const phase=theta-2*Math.atan(omega*t/2);
   return Math.hypot(center+rho*Math.cos(phase),rho*Math.sin(phase));
  };
  assert.ok(Array.from({length:9},(_,i)=>radiusAt(i*dt/8)).every(r=>r<1));
  assert.ok(radiusAt(dt/16)>1);
  const edgeAngle=Math.acos((1-center*center-rho*rho)/(2*center*rho));
  const numericalFirstCrossing=2*Math.tan((Math.abs(theta)-edgeAngle)/2)/Math.abs(omega);
  const next=advanceDoublewell(p,species,dt,model);
  assert.equal(next.hit?.destination,'wall','An absorbing wall cannot silently retain a leave/reenter trajectory.');
  assert.ok(Math.abs(next.elapsedS-numericalFirstCrossing)<1e-14);
  assert.ok(Math.abs(Math.hypot(next.particle.position[0],next.particle.position[1])-1)<1e-14);
 }
});

test('exact numerical gyro tangencies collect, resolved interior near misses survive, and ambiguous near misses fail explicitly',()=>{
 const species={massU:40,chargeState:1};
 for(const magneticT of [.1,-.1]){
  const model={radius:1,length:2,magneticT,voltage:0,quadraticShape:1};
  const omega=E_CHARGE*magneticT/(40*AMU),dt=.079/Math.abs(omega),rho=.1,theta=2*Math.atan(omega*dt/32);
  const launch=(offset:number):Particle=>({position:[.9+offset+rho*Math.cos(theta),rho*Math.sin(theta),1],
   velocity:[omega*rho*Math.sin(theta),-omega*rho*Math.cos(theta),0]});
  const tangent=advanceDoublewell(launch(0),species,dt,model);
  assert.equal(tangent.hit?.destination,'wall');
  assert.ok(Math.abs(tangent.elapsedS-dt/16)<1e-14);
  assert.equal(advanceDoublewell(launch(-1e-7),species,dt,model).hit,null);
  assert.throws(()=>advanceDoublewell(launch(-1e-15),species,dt,model),/Unresolved grazing/);
 }
});

test('radial reflection continues inward without repeating a zero-time wall event',()=>{
 const species={massU:40,chargeState:1},model={radius:1,length:2,magneticT:.1,voltage:0,quadraticShape:1},dt=1e-7;
 const p:Particle={position:[.9999,0,1],velocity:[3000,500,0]};
 const hit=advanceDoublewell(p,species,dt,model);assert.equal(hit.hit?.destination,'wall');
 const [x,y]=hit.particle.position,dot=x*hit.particle.velocity[0]+y*hit.particle.velocity[1];
 const reflected:Particle={position:[...hit.particle.position],velocity:[hit.particle.velocity[0]-2*dot*x,hit.particle.velocity[1]-2*dot*y,0]};
 const remainder=advanceDoublewell(reflected,species,dt-hit.elapsedS,model);
 assert.equal(remainder.hit,null);assert.ok(Math.hypot(...remainder.particle.position.slice(0,2))<1);
});

test('an earlier axial exit takes precedence over an unresolved later grazing trajectory',()=>{
 const species={massU:40,chargeState:1},magneticT=.1;
 const model={radius:1,length:1,magneticT,voltage:0,quadraticShape:1};
 const omega=E_CHARGE*magneticT/(40*AMU),dt=.079/omega,rho=.1,theta=2*Math.atan(omega*dt/32);
 const p:Particle={position:[.9-1e-15+rho*Math.cos(theta),rho*Math.sin(theta),.5],
  velocity:[omega*rho*Math.sin(theta),-omega*rho*Math.cos(theta),.5/(dt/32)]};
 const next=advanceDoublewell(p,species,dt,model);
 assert.equal(next.hit?.destination,'end');assert.equal(next.elapsedS,dt/32);
});

test('nonlinear quartic wall roots agree with independently dense-bracketed partial Boris paths',()=>{
 const species={massU:40,chargeState:1},model={radius:.2,length:2,magneticT:.06,voltage:20,quadraticShape:1.2},dt=1e-7;
 const qm=E_CHARGE/(40*AMU);validateDoublewellOrbitSettings(species,dt,model);
 let contacts=0;
 for(const vx of [-100,100,1000])for(const vy of [-8000,0,8000]){
  const p:Particle={position:[.19999,0,1],velocity:[vx,vy,0]};
  const at=(time:number)=>step(p,qm,time,x=>quarticFields(x,model));
  let lower=0,upper:number|null=null;
  for(let i=1;i<=10000;i++){
   const t=dt*i/10000;
   if(Math.hypot(...at(t).position.slice(0,2))>=model.radius){upper=t;break;}
   lower=t;
  }
  const actual=advanceDoublewell(p,species,dt,model);
  if(upper===null){assert.equal(actual.hit,null);continue;}
  for(let i=0;i<60;i++){
   const mid=(lower+upper)/2;
   if(Math.hypot(...at(mid).position.slice(0,2))>=model.radius)upper=mid;else lower=mid;
  }
  contacts++;assert.equal(actual.hit?.destination,'wall');
  assert.ok(Math.abs(actual.elapsedS-(lower+upper)/2)<1e-15);
 }
 assert.ok(contacts>=3);
});

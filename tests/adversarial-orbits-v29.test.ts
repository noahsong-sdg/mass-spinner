import test from 'node:test';
import assert from 'node:assert/strict';
import {AMU,E_CHARGE,DEFAULT_CONFIG,cutoffMassU,fields,step,rfField,simulate,type Particle,type Vec} from '../src/physics.js';
import {elasticCollision,collisionProbability} from '../src/collisions.js';

const close=(a:number,b:number,tol:number)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b} (tol ${tol})`);
const kinetic=(v:Vec)=>v.reduce((sum,x)=>sum+x*x,0);

test('ideal cutoff is exactly the double root of the independent signed radial characteristic equation',()=>{
 for(const magneticT of [-.25,.04,.1,.25])for(const voltage of [20,400,800])for(const chargeState of [1,2,3]){
  const model={radius:.48,length:2.8,voltage,magneticT},mass=cutoffMassU(model,chargeState)!*AMU;
  const omega=chargeState*E_CHARGE*magneticT/mass,alpha=2*chargeState*E_CHARGE*voltage/(mass*model.radius**2);
  close((omega*omega-4*alpha)/(omega*omega),0,1e-14);
 }
});

test('circular RF solves the signed forced Lorentz equation, including resonance and counter-rotation',()=>{
 const m=40*AMU,q=E_CHARGE,amplitude=60,frequency=q*.1/m/(2*Math.PI),duration=4e-5;
 const run=(magneticT:number,handedness:-1|1,dt:number)=>{
  let p:Particle={position:[0,0,0],velocity:[0,0,0]};
  for(let t=0;t<duration;){const h=Math.min(dt,duration-t),e=rfField(t+h/2,amplitude,frequency,handedness);
   p=step(p,q/m,h,()=>({electric:e,magnetic:[0,0,magneticT]}));t+=h;}
  return p;
 };
 for(const magneticT of [.1,-.1])for(const handedness of [-1,1] as const){
  const omega=q*magneticT/m,drive=handedness*2*Math.PI*frequency,delta=omega+drive;
  // |a (exp(i drive t)-exp(-i omega t))/(i delta)|, with its continuous resonant limit.
  const speed=Math.abs(delta)<1e-8?q*amplitude/m*duration:
   2*q*amplitude/m*Math.abs(Math.sin(delta*duration/2)/delta);
  const coarse=run(magneticT,handedness,4e-8),fine=run(magneticT,handedness,2e-8);
  const error=(p:Particle)=>Math.abs(Math.hypot(...p.velocity)-speed);
  assert.ok(error(fine)<error(coarse)/3.8);close(error(fine)/Math.max(1,speed),0,1e-4);
 }
});

test('DC orbit energy and canonical angular momentum converge together under timestep refinement',()=>{
 const mass=40*AMU,q=E_CHARGE,model={radius:.48,length:2.8,voltage:400,magneticT:.1};
 const initial:Particle={position:[.08,0,.2],velocity:[1000,-2000,100]};
 const momentum=(p:Particle)=>mass*(p.position[0]*p.velocity[1]-p.position[1]*p.velocity[0])+q*model.magneticT*(p.position[0]**2+p.position[1]**2)/2;
 const energy=(p:Particle)=>mass*kinetic(p.velocity)/2+q*model.voltage*(1-(p.position[0]**2+p.position[1]**2)/model.radius**2);
 const invariant=(dt:number)=>{let p=initial,maxH=0,maxP=0;for(let i=0;i<Math.round(1e-4/dt);i++){
  p=step(p,q/mass,dt,x=>fields(x,model));maxH=Math.max(maxH,Math.abs(energy(p)/energy(initial)-1));
  maxP=Math.max(maxP,Math.abs(momentum(p)/momentum(initial)-1));}return{maxH,maxP};};
 const coarse=invariant(4e-8),fine=invariant(2e-8);
 assert.ok(fine.maxH<coarse.maxH/3.8);assert.ok(fine.maxP<coarse.maxP/3.8);
 assert.ok(coarse.maxH<2e-5&&coarse.maxP<2e-4);
});

test('cold finite-device wall impact converges to an independently derived hyperbolic orbit',()=>{
 const base={...DEFAULT_CONFIG,magneticT:.1,voltage:800,distribution:'fixed' as const,perpendicularEV:0,
  parallelEV:2,sourceRadius:.15,particlesPerSpecies:1};
 let state=base.seed>>>0;state=(Math.imul(1664525,state)+1013904223)>>>0;
 const r=base.sourceRadius*Math.sqrt(state/4294967296);
 const expected=(massU:number)=>{
  const qm=E_CHARGE/(massU*AMU),alpha=2*qm*base.voltage/base.radius**2,gamma=Math.sqrt(alpha-(qm*base.magneticT)**2/4);
  return Math.asinh(gamma*Math.sqrt((base.radius**2/r**2-1)/alpha))/gamma;
 };
 // Linear event interpolation has an O(h²) envelope but a phase-dependent
 // coefficient; successive levels need not have an identical Richardson ratio.
 for(const dt of [4e-8,2e-8,1e-8])for(const species of simulate({...base,dt}).species){
  const hit=species.impacts[0],exact=expected(species.massU);
  assert.equal(hit.destination,'wall');
  close(hit.time/exact,1,6e-6*(dt/4e-8)**2);
  close(Math.hypot(...hit.position.slice(0,2)),base.radius,1e-14);
 }
});

test('cold-neutral scattering conserves each pair and has the independently integrated angular moments',()=>{
 const velocity:Vec=[3,-7,11];
 for(const ionMass of [1,40,200])for(const neutralMass of [1,40,200]){
  const average:Vec=[0,0,0];let meanEnergy=0;
  // Eight-point sphere cubature integrates first and second angular moments exactly.
  for(const cosine of [-1/Math.sqrt(3),1/Math.sqrt(3)])for(let azimuth=0;azimuth<4;azimuth++){
   const samples=[(1+cosine)/2,azimuth/4];let i=0;
   const out=elasticCollision(velocity,ionMass,neutralMass,()=>samples[i++]);
   for(let axis=0;axis<3;axis++){
    close(ionMass*out.ionVelocity[axis]+neutralMass*out.neutralVelocity[axis],ionMass*velocity[axis],1e-11);
    average[axis]+=out.ionVelocity[axis]/8;
   }
   close(ionMass*kinetic(out.ionVelocity)+neutralMass*kinetic(out.neutralVelocity),ionMass*kinetic(velocity),1e-10);
   meanEnergy+=kinetic(out.ionVelocity)/8;
  }
  const fraction=ionMass/(ionMass+neutralMass);
  for(let axis=0;axis<3;axis++)close(average[axis],fraction*velocity[axis],1e-13);
  close(meanEnergy/kinetic(velocity),fraction**2+(1-fraction)**2,1e-14);
 }
});

test('frozen-speed collision probability follows the exact Poisson no-event semigroup',()=>{
 for(const speed of [0,100,10000])for(const density of [0,1e16,1e18]){
  const p=collisionProbability(speed,density,1e-19,1e-7),half=collisionProbability(speed,density,1e-19,5e-8);
  close(1-p,(1-half)**2,1e-15);
 }
});

test('thermal pulse returns negative axial velocities immediately, without treating them as injected reservoir flux',()=>{
 const result=simulate({...DEFAULT_CONFIG,voltage:0,magneticT:0,distribution:'thermal',perpendicularEV:0,
  parallelEV:2,axialTemperatureEV:10,particlesPerSpecies:1000,dt:1e-8,duration:1e-7});
 // P(vz<0)=Phi(-sqrt(2 Ebeam/Tz)) ≈ .2635 for this pulsed Gaussian source.
 assert.equal(result.species[0].source,result.species[1].source);
 for(const s of result.species){
  assert.ok(s.source>220&&s.source<310);assert.equal(s.source+s.remaining,1000);
  assert.ok(s.impacts.every(hit=>hit.destination==='source'&&hit.time===0&&hit.position[2]===0));
 }
});

const constantRF={...DEFAULT_CONFIG,mode:'icr' as const,distribution:'fixed' as const,voltage:0,magneticT:0,
 rfFrequencyHz:0,rfAmplitudeVM:200,perpendicularEV:0,parallelEV:2,particlesPerSpecies:1,
 sourceRadius:.04,duration:1e-4};

test('constant RF acceleration cannot bypass the timestep boundary-resolution guard at zero B and frequency',()=>{
 assert.throws(()=>simulate({...constantRF,dt:1e-4}),/Timestep/);
 // Zero amplitude has no acceleration scale. Inactive RF settings do not
 // constrain this field-free rotating-mode calculation.
 assert.doesNotThrow(()=>simulate({...constantRF,rfAmplitudeVM:0,dt:1e-4}));
 assert.doesNotThrow(()=>simulate({...constantRF,mode:'rotating',rfFrequencyHz:200000,dt:1e-4}));
});

test('accepted constant-RF steps refine wall time and kinetic energy against independent constant-acceleration kinematics',()=>{
 let state=constantRF.seed>>>0;const draw=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
 const radius=constantRF.sourceRadius*Math.sqrt(draw()),angle=2*Math.PI*draw();
 const x0=radius*Math.cos(angle),y0=radius*Math.sin(angle);
 for(const dt of [8e-7,4e-7,2e-7])for(const s of simulate({...constantRF,dt}).species){
  const a=E_CHARGE*constantRF.rfAmplitudeVM/(s.massU*AMU),dx=Math.sqrt(constantRF.radius**2-y0*y0)-x0;
  const exactTime=Math.sqrt(2*dx/a),exactEnergy=constantRF.parallelEV+constantRF.rfAmplitudeVM*dx;
  const hit=s.impacts[0];assert.equal(hit.destination,'wall');
  // Chord interpolation of x=x0+a t²/2 has phase-dependent O(h²)
  // arrival bias. These bounds shrink by four with every halved h.
  close(hit.time/exactTime,1,(dt/exactTime)**2/4);
  close(hit.kineticEV/exactEnergy,1,(dt/exactTime)**2/2);
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceOrbit, AMU, E_CHARGE, firstHit, simulate, sourceVelocity, step, type Model, type Particle, type RunConfig, type Vec } from '../src/physics.ts';

// Analytic references are independent of the event polynomial and its root solver.
const model=(magneticT=0,voltage=0):Model=>({radius:1,length:1,magneticT,voltage});
const close=(got:number,want:number,tolerance=1e-10)=>assert.ok(Math.abs(got-want)<=tolerance*Math.max(1e-20,Math.abs(want)),`${got} != ${want}, relative ${Math.abs((got-want)/want)}`);
const norm=(v:Vec)=>Math.hypot(...v);
function bisect(f:(t:number)=>number,lo:number,hi:number):number {
  assert.ok(f(lo)<=0&&f(hi)>=0,'independent bracket');
  for(let n=0;n<90;n++){const mid=(lo+hi)/2;if(f(mid)>0)hi=mid;else lo=mid;}return(lo+hi)/2;
}
function gyro(p:Particle,t:number,omega:number):Particle {
  const [x,y,z]=p.position,[vx,vy,vz]=p.velocity,c=Math.cos(omega*t),s=Math.sin(omega*t);
  return {position:[x+vx*s/omega+vy*(1-c)/omega,y+vy*s/omega-vx*(1-c)/omega,z+vz*t],velocity:[vx*c+vy*s,vy*c-vx*s,vz]};
}
function assertSurface(hit:NonNullable<ReturnType<typeof advanceOrbit>['hit']>,m:Model){
  const p=hit.position;
  if(hit.destination==='wall')close(Math.hypot(p[0],p[1]),m.radius);
  else close(p[2],hit.destination==='end'?m.length:0,1e-10);
}

for(const sign of [-1,1])test(`signed B ${sign}: retained leave/reenter crossing and consistent state`,()=>{
  const p:Particle={position:[.99999,0,.5],velocity:[.003,-sign*.5,0]},m=model(sign);
  const next=step(p,1,.03,()=>({electric:[0,0,0],magnetic:[0,0,sign]}));
  assert.equal(firstHit(p.position,next.position,m),null,'old chord deliberately misses');
  const exact=bisect(t=>Math.hypot(...gyro(p,t,sign).position.slice(0,2))-1,0,.012);
  const out=advanceOrbit(p,1,.03,m);assert.ok(out.hit);assert.equal(out.hit.destination,'wall');
  close(out.elapsedS,exact,2e-6);close(out.elapsedS,out.hit.timeS);assertSurface(out.hit,m);
  assert.deepEqual(out.particle.position,out.hit.position);close(norm(out.particle.velocity),norm(p.velocity),1e-12);
  const expectedNumerical=2*Math.tan(exact/2);close(out.elapsedS,expectedNumerical,1e-9);
  console.log(JSON.stringify({family:'grazing',sign,exactTime:exact,numericalTime:out.elapsedS,relativeTimeError:(out.elapsedS-exact)/exact}));
});

test('absorbing exactly tangent contact and strictly inside near tangent',()=>{
  const tangentTime=1/128;
  for(const inset of [0,1e-8]){
    // All exact-tangent coefficients are binary-exact, including t*=1/128.
    const p:Particle={position:[-1+tangentTime**2/2+inset,0,.5],velocity:[-tangentTime,0,0]};
    const out=advanceOrbit(p,1,2*tangentTime,model(),{timeS:0,amplitudeVM:1,frequencyHz:0,handedness:-1});
    if(inset===0){assert.ok(out.hit);assert.equal(out.hit.destination,'wall');close(out.elapsedS,tangentTime,2e-6);assertSurface(out.hit,model());}
    else assert.equal(out.hit,null);
  }
});

for(const [name,p,expected,time] of [
  ['wall',{position:[.9,0,.5],velocity:[1,0,0]},'wall',.1],
  ['end',{position:[0,0,.9],velocity:[0,0,1]},'end',.1],
  ['source',{position:[0,0,.1],velocity:[0,0,-1]},'source',.1],
  ['wall beats end',{position:[.9,0,.8],velocity:[1,0,1]},'wall',.1],
  ['end beats wall',{position:[.8,0,.9],velocity:[1,0,1]},'end',.1],
  ['source beats wall',{position:[.8,0,.1],velocity:[1,0,-1]},'source',.1],
] as const)test(`zero fields: ${name}`,()=>{
  const out=advanceOrbit(p as unknown as Particle,1,.3,model());assert.ok(out.hit);assert.equal(out.hit.destination,expected);close(out.elapsedS,time);assertSurface(out.hit,model());
});

test('constant zero-frequency RF crossing is constant acceleration, with work balance',()=>{
  const p:Particle={position:[.99995,0,.5],velocity:[.003,0,0]},m=model();
  const drive={timeS:0,amplitudeVM:1,frequencyHz:0,handedness:-1 as const};
  const exact=(-.003+Math.sqrt(.003**2+2*(1-.99995)));
  const out=advanceOrbit(p,1,.01,m,drive);assert.ok(out.hit);close(out.elapsedS,exact);assertSurface(out.hit,m);
  close(out.particle.velocity[0],.003+exact);close((norm(out.particle.velocity)**2-norm(p.velocity)**2)/2,1-p.position[0]);
});

test('parabolic outward E converges to analytic hyperbolic orbit',()=>{
  const p:Particle={position:[.9,0,.5],velocity:[.1,0,0]},m=model(0,.5);
  const exact=bisect(t=>.9*Math.cosh(t)+.1*Math.sinh(t)-1,0,1);
  const errors:number[]=[];
  for(const h of [.02,.01,.005]){
    let state=p,time=0;
    for(let n=0;n<1000;n++){const out=advanceOrbit(state,1,h,m);time+=out.elapsedS;state=out.particle;if(out.hit){assertSurface(out.hit,m);break;}}
    errors.push(Math.abs(time-exact));
  }
  for(let n=0;n<2;n++){const ratio=errors[n]/errors[n+1];assert.ok(ratio>=3&&ratio<=5.5,`parabolic ratio ${ratio}, errors ${errors}`);}
  console.log(JSON.stringify({family:'parabolic',errors}));
});

for(const handedness of [-1,1] as const)test(`time-varying RF ${handedness}: free-space second-order convergence`,()=>{
  const omega=2,amplitude=.5,T=.4,p:Particle={position:[0,0,.5],velocity:[.1,-.05,0]};
  const exact:Vec=[.1*T+amplitude*(1-Math.cos(omega*T))/omega**2,-.05*T+handedness*amplitude*(T/omega-Math.sin(omega*T)/omega**2),.5];
  const errors:number[]=[];
  for(const h of [.01,.005,.0025]){
    let state=p;for(let n=0;n<Math.round(T/h);n++){const out=advanceOrbit(state,1,h,model(),{timeS:n*h,amplitudeVM:amplitude,frequencyHz:omega/(2*Math.PI),handedness});assert.equal(out.hit,null);state=out.particle;}
    errors.push(Math.hypot(...state.position.map((x,i)=>x-exact[i])));
  }
  for(let n=0;n<2;n++)assert.ok(errors[n]/errors[n+1]>=3&&errors[n]/errors[n+1]<=5.5,`RF errors ${errors}`);
  console.log(JSON.stringify({family:'free-rf',handedness,errors}));
});

function initial(config:RunConfig,massU:number):Particle {
  let s=config.seed>>>0;const rand=()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};
  const r=config.sourceRadius*Math.sqrt(rand()),angle=rand()*2*Math.PI,phase=rand()*2*Math.PI;
  return {position:[r*Math.cos(angle),r*Math.sin(angle),0],velocity:sourceVelocity(massU,config.perpendicularEV,config.parallelEV,0,phase,'fixed',rand)};
}
const config:RunConfig={radius:.1,length:10,magneticT:0,voltage:0,seed:42,particlesPerSpecies:1,perpendicularEV:.05,parallelEV:1,sourceRadius:.01,dt:1e-7,duration:1e-4,mode:'icr',rfAmplitudeVM:100,rfFrequencyHz:0,rfHandedness:-1};
test('actual simulate: zero-field end collection has exact flight time and energy',()=>{
  const c={...config,mode:'rotating' as const,rfAmplitudeVM:0,perpendicularEV:0,length:.01};
  for(const s of simulate(c).species){assert.equal(s.end,1);const p=initial(c,s.massU),impact=s.impacts[0];close(impact.time,c.length/p.velocity[2]);close(impact.kineticEV,1);close(impact.position[2],c.length);assert.ok(s.maxRelativeImpactEnergyError<1e-10);}
});
test('actual simulate: RF impact position/time and accumulated work match analytic acceleration',()=>{
  for(const s of simulate(config).species){
    assert.equal(s.wall,1);const p=initial(config,s.massU),a=E_CHARGE/(s.massU*AMU)*100;
    const at=(t:number):Vec=>[p.position[0]+p.velocity[0]*t+a*t*t/2,p.position[1]+p.velocity[1]*t,p.position[2]+p.velocity[2]*t];
    const exact=bisect(t=>Math.hypot(...at(t).slice(0,2))-config.radius,0,config.duration),impact=s.impacts[0];
    close(impact.time,exact);close(Math.hypot(...impact.position.slice(0,2)),config.radius);
    for(let k=0;k<3;k++)close(impact.position[k],at(exact)[k],1e-9);
    close(impact.kineticEV-s.meanInitialKineticEV,s.rfWorkEV);assert.ok(s.maxRelativeImpactEnergyError<1e-10);
  }
});

for(const sign of [-1,1])test(`actual simulate: rotating signed B ${sign} analytic impact convergence`,()=>{
  const c:RunConfig={...config,radius:.48,length:10,magneticT:sign*.01,voltage:1000,perpendicularEV:.5,sourceRadius:.04,mode:'rotating',dt:1e-7};
  const errors:number[][]=[[],[]];
  for(const h of [1e-7,5e-8,2.5e-8]){
    const result=simulate({...c,dt:h});
    for(const [i,s] of result.species.entries()){
      assert.equal(s.wall,1);const p=initial(c,s.massU),qm=E_CHARGE/(s.massU*AMU),omega=qm*c.magneticT;
      // z_complex=exp(-i Omega t/2) u, u''=(kappa-Omega²/4)u.
      const lambda=Math.sqrt(2*qm*c.voltage/c.radius**2-omega**2/4);
      const at=(t:number):Vec=>{
        const C=Math.cosh(lambda*t),S=Math.sinh(lambda*t)/lambda,phase=omega*t/2;
        const ux=p.position[0]*C+(p.velocity[0]-omega*p.position[1]/2)*S;
        const uy=p.position[1]*C+(p.velocity[1]+omega*p.position[0]/2)*S;
        return [ux*Math.cos(phase)+uy*Math.sin(phase),uy*Math.cos(phase)-ux*Math.sin(phase),p.velocity[2]*t];
      };
      const exact=bisect(t=>Math.hypot(...at(t).slice(0,2))-c.radius,0,c.duration);
      const impact=s.impacts[0];close(Math.hypot(...impact.position.slice(0,2)),c.radius);errors[i].push(Math.abs(impact.time-exact));
    }
  }
  for(const e of errors)for(let n=0;n<2;n++)assert.ok(e[n]/e[n+1]>=3&&e[n]/e[n+1]<=5.5,`rotating errors ${e}`);
  console.log(JSON.stringify({family:'simulate-rotating',sign,errors}));
});

for(const handedness of [-1,1] as const)test(`actual simulate: finite RF ${handedness} analytic impact convergence`,()=>{
  const c={...config,rfFrequencyHz:2000,rfHandedness:handedness},errors:number[][]=[[],[]],timeErrors:number[][]=[[],[]];
  for(const h of [1e-7,5e-8,2.5e-8])for(const [i,s] of simulate({...c,dt:h}).species.entries()){
    assert.equal(s.wall,1);const p=initial(c,s.massU),a=E_CHARGE/(s.massU*AMU)*100,w=2*Math.PI*c.rfFrequencyHz;
    const at=(t:number):Vec=>[p.position[0]+p.velocity[0]*t+a*(1-Math.cos(w*t))/w**2,p.position[1]+p.velocity[1]*t+handedness*a*(t/w-Math.sin(w*t)/w**2),p.velocity[2]*t];
    const exact=bisect(t=>Math.hypot(...at(t).slice(0,2))-c.radius,0,c.duration),impact=s.impacts[0];
    timeErrors[i].push(Math.abs(impact.time-exact));
    // Use the full trajectory error at a common clock. The leading error's
    // radial projection can cancel: a timing-only ratio then measures higher
    // terms and the changing final partial step. Retain the failed timing gate
    // in the independent evidence rather than stretching its acceptance band.
    const reference=at(impact.time),positionError=Math.hypot(...impact.position.map((x,k)=>x-reference[k]));
    assert.ok(positionError>512*Number.EPSILON*c.radius,'order diagnostic must resolve roundoff');
    assert.ok(positionError<=a*h*h*(2+w*exact)/12,'prescribed error envelope for these RF cases');
    errors[i].push(positionError);close(Math.hypot(...impact.position.slice(0,2)),c.radius);
    close(impact.kineticEV-s.meanInitialKineticEV,s.rfWorkEV);assert.ok(s.maxRelativeImpactEnergyError<1e-10);
  }
  for(const e of errors)for(let n=0;n<2;n++)assert.ok(e[n]/e[n+1]>=3&&e[n]/e[n+1]<=5.5,`finite RF errors ${e}`);
  console.log(JSON.stringify({family:'simulate-rf',handedness,positionErrors:errors,timeErrors}));
});

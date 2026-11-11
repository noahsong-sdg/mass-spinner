import test from 'node:test';
import assert from 'node:assert/strict';
import {step,fields,firstHit,cutoffMassU,simulate,validate,DEFAULT_CONFIG,E_CHARGE,AMU,type Particle,type Model} from '../src/physics.js';
const close=(actual:number,expected:number,tolerance:number)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);

test('field-free motion and constant electric acceleration',()=>{
  const p:Particle={position:[1,2,3],velocity:[2,3,4]};
  const n=step(p,1,.5,()=>({electric:[0,0,0],magnetic:[0,0,0]}));
  assert.deepEqual(n,{position:[2,3.5,5],velocity:[2,3,4]});
  const a=step(p,2,.5,()=>({electric:[1,0,0],magnetic:[0,0,0]}));
  close(a.position[0],2.25,1e-14);close(a.velocity[0],3,1e-14);
});

test('uniform B preserves speed and follows analytical helix, including charge sign',()=>{
  for(const qm of [1,-1]){
    let p:Particle={position:[0,0,0],velocity:[1,0,.2]};
    const dt=.001,N=10000,T=dt*N;
    for(let i=0;i<N;i++)p=step(p,qm,dt,()=>({electric:[0,0,0],magnetic:[0,0,1]}));
    close(p.position[0],Math.sin(qm*T)/qm,2e-6);
    close(p.position[1],(Math.cos(qm*T)-1)/qm,2e-6);
    close(p.position[2],.2*T,1e-10);
    close(p.velocity.reduce((s,v)=>s+v*v,0),1.04,1e-11);
  }
});

test('parabolic potential gives outward E with correct radial slope',()=>{
  const m:Model={radius:2,length:5,voltage:10,magneticT:.1};
  assert.deepEqual(fields([.2,-.4,0],m),{electric:[1,-2,0],magnetic:[0,0,.1]});
});

test('stable rotating orbit converges at second order to independent exact solution',()=>{
  const model:Model={radius:1,length:100,voltage:.1,magneticT:2};
  const omega=2,k=.2,delta=Math.sqrt(omega**2-4*k);
  const w1=(-omega+delta)/2,w2=(-omega-delta)/2,r=.2,T=3;
  const c1=-w2*r/delta,c2=w1*r/delta;
  const exact=[c1*Math.cos(w1*T)+c2*Math.cos(w2*T),c1*Math.sin(w1*T)+c2*Math.sin(w2*T)];
  const error=(dt:number)=>{
    let p:Particle={position:[r,0,0],velocity:[0,0,0]};
    for(let i=0;i<Math.round(T/dt);i++)p=step(p,1,dt,x=>fields(x,model));
    return Math.hypot(p.position[0]-exact[0],p.position[1]-exact[1]);
  };
  const coarse=error(.02),fine=error(.01);
  assert.ok(coarse/fine>3.8 && coarse/fine<4.2);
  assert.ok(fine<1e-5);
});

test('unstable rotating orbit converges to the exact exponentially growing solution',()=>{
  const omega=2,k=1.4,r=.05,T=3;
  const model:Model={radius:1,length:100,voltage:k/2,magneticT:omega};
  // u=x+iy=e^(-i*omega*t/2)[r*cosh(gamma*t)+i*omega*r*sinh(gamma*t)/(2*gamma)].
  const gamma=Math.sqrt(k-omega**2/4),h=omega*T/2;
  const a=r*Math.cosh(gamma*T),b=omega*r*Math.sinh(gamma*T)/(2*gamma);
  const exact=[a*Math.cos(h)+b*Math.sin(h),b*Math.cos(h)-a*Math.sin(h)];
  const error=(dt:number)=>{
    let p:Particle={position:[r,0,0],velocity:[0,0,0]};
    for(let i=0;i<Math.round(T/dt);i++)p=step(p,1,dt,x=>fields(x,model));
    return Math.hypot(p.position[0]-exact[0],p.position[1]-exact[1]);
  };
  const coarse=error(.02),fine=error(.01);
  assert.ok(coarse/fine>3.8 && coarse/fine<4.2);
  assert.ok(fine<3e-5);
});

test('marginal cutoff orbit converges to the exact linearly growing envelope',()=>{
  const omega=2,r=.05,T=3;
  const model:Model={radius:1,length:100,voltage:omega**2/8,magneticT:omega};
  // At the double root, u=r*(1+i*omega*t/2)*e^(-i*omega*t/2), not a bounded circle.
  const h=omega*T/2;
  const exact=[r*(Math.cos(h)+h*Math.sin(h)),r*(h*Math.cos(h)-Math.sin(h))];
  const error=(dt:number)=>{
    let p:Particle={position:[r,0,0],velocity:[0,0,0]};
    for(let i=0;i<Math.round(T/dt);i++)p=step(p,1,dt,x=>fields(x,model));
    return Math.hypot(p.position[0]-exact[0],p.position[1]-exact[1]);
  };
  const coarse=error(.02),fine=error(.01);
  assert.ok(coarse/fine>3.8 && coarse/fine<4.2);
  assert.ok(fine<1.2e-5);
});

test('canonical angular momentum converges under axisymmetric electric and magnetic fields',()=>{
  const model:Model={radius:1,length:100,voltage:.1,magneticT:2},T=12;
  // Per unit mass for q/m=1: Ptheta/m=x*vy-y*vx+B*r²/2.
  const momentum=(p:Particle)=>p.position[0]*p.velocity[1]-p.position[1]*p.velocity[0]
    +model.magneticT*(p.position[0]**2+p.position[1]**2)/2;
  const error=(dt:number)=>{
    let p:Particle={position:[.2,0,0],velocity:[.07,-.03,0]};
    const initial=momentum(p);let maximum=0;
    for(let i=0;i<Math.round(T/dt);i++){
      p=step(p,1,dt,x=>fields(x,model));
      maximum=Math.max(maximum,Math.abs(momentum(p)-initial)/Math.abs(initial));
    }
    return maximum;
  };
  const coarse=error(.02),fine=error(.01);
  assert.ok(coarse/fine>3.8 && coarse/fine<4.2);
  assert.ok(fine<3e-6);
});

test('cutoff lies between Ar+ and Kr+ for the selected voltage convention',()=>{
  const cutoff=cutoffMassU(DEFAULT_CONFIG)!;
  assert.ok(cutoff>40 && cutoff<84);
  close(cutoff, E_CHARGE*.1**2*.48**2/(8*400*AMU),1e-12);
  assert.equal(cutoffMassU({...DEFAULT_CONFIG,voltage:0}),null);
});

test('first wall/end/source intersections use earliest surface and exact chord position',()=>{
  const m:Model={radius:1,length:2,magneticT:0,voltage:0};
  const wall=firstHit([0,0,.1],[2,0,3],m)!;
  assert.equal(wall.destination,'wall');close(wall.position[0],1,1e-12);
  const end=firstHit([0,0,1],[.1,0,3],m)!;
  assert.equal(end.destination,'end');close(end.position[2],2,1e-12);
  assert.equal(firstHit([0,0,.1],[0,0,-.1],m)!.destination,'source');
  assert.equal(firstHit([0,0,.1],[0,0,.2],m),null);
});

test('seeded ensemble conserves particle accounting and exhibits mass-selective loss',()=>{
  const config={...DEFAULT_CONFIG,particlesPerSpecies:12};
  const a=simulate(config),b=simulate(config);
  assert.deepEqual(a,b);
  for(const s of a.species){
    assert.equal(s.wall+s.end+s.source+s.remaining,s.injected);
    assert.equal(s.wallAxialBins.reduce((sum,n)=>sum+n,0),s.wall);
    assert.equal(s.endRadialBins.reduce((sum,n)=>sum+n,0),s.end);
    assert.ok(s.maxRelativeEnergyError<.001);
  }
  assert.ok(a.species[1].wall>a.species[0].wall);
  assert.ok(a.species[0].end>a.species[1].end);
});

test('zero-voltage control transmits low-energy ions without invented separation',()=>{
  const r=simulate({...DEFAULT_CONFIG,particlesPerSpecies:6,voltage:0});
  for(const s of r.species){assert.equal(s.end,s.injected);assert.equal(s.wall,0);}
});

test('collector counts remain stable on timestep refinement away from a cutoff transition',()=>{
  const config={...DEFAULT_CONFIG,particlesPerSpecies:12};
  const coarse=simulate(config),fine=simulate({...config,dt:config.dt/2});
  coarse.species.forEach((s,i)=>{
    assert.deepEqual([s.wall,s.end,s.source,s.remaining],
      [fine.species[i].wall,fine.species[i].end,fine.species[i].source,fine.species[i].remaining]);
    assert.ok(fine.species[i].maxRelativeEnergyError<s.maxRelativeEnergyError);
  });
});

test('finite-device collection near cutoff matches exact cold-orbit envelopes at both timesteps',()=>{
  const criticalVoltage=E_CHARGE*DEFAULT_CONFIG.magneticT**2*DEFAULT_CONFIG.radius**2/(8*40*AMU);
  for(const factor of [.999,1,1.001]){
    const config={...DEFAULT_CONFIG,voltage:criticalVoltage*factor,perpendicularEV:0,particlesPerSpecies:8};
    const coarse=simulate(config),fine=simulate({...config,dt:config.dt/2});
    coarse.species.forEach((species,index)=>{
      const qm=E_CHARGE/(species.massU*AMU),omega=qm*config.magneticT;
      const transit=config.length/Math.sqrt(2*qm*config.parallelEV);
      const discriminant=omega**2-8*qm*config.voltage/config.radius**2;
      let maximumGain:number;
      if(Math.abs(discriminant)<omega**2*1e-12){
        maximumGain=Math.hypot(1,omega*transit/2);
      }else if(discriminant>0){
        const delta=Math.sqrt(discriminant),phase=Math.min(delta*transit/2,Math.PI/2);
        maximumGain=Math.hypot(Math.cos(phase),omega*Math.sin(phase)/delta);
      }else{
        const gamma=Math.sqrt(-discriminant)/2;
        maximumGain=Math.hypot(Math.cosh(gamma*transit),omega*Math.sinh(gamma*transit)/(2*gamma));
      }
      assert.ok(transit<config.duration);
      for(const result of [species,fine.species[index]]){
        assert.equal(result.paths.length,result.injected);
        let expectedWall=0;
        for(const path of result.paths){
          const initial=path.positions[0],radius=Math.hypot(initial[0],initial[1]);
          const destination=radius*maximumGain>config.radius?'wall':'end';
          assert.equal(path.destination,destination,`factor=${factor}, mass=${species.massU}`);
          if(destination==='wall')expectedWall++;
        }
        assert.equal(result.wall,expectedWall);
        assert.equal(result.end,result.injected-expectedWall);
        assert.equal(result.source+result.remaining,0);
      }
    });
    if(factor===1){
      assert.ok(coarse.species[0].wall>0);
      assert.ok(coarse.species[0].end>0);
    }
  }
});

test('invalid domains and unresolved timesteps fail explicitly',()=>{
  assert.throws(()=>validate({...DEFAULT_CONFIG,sourceRadius:.5}));
  assert.throws(()=>validate({...DEFAULT_CONFIG,dt:1e-4}));
  assert.throws(()=>validate({...DEFAULT_CONFIG,particlesPerSpecies:0}));
  assert.throws(()=>validate({...DEFAULT_CONFIG,voltage:NaN}));
});

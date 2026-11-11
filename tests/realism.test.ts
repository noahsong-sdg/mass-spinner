import test from 'node:test';
import assert from 'node:assert/strict';
import {step,rfField,sourceVelocity,simulate,DEFAULT_CONFIG,E_CHARGE,AMU,type Particle} from '../src/physics.js';
const speed2=(v:number[])=>v.reduce((s,x)=>s+x*x,0);
function rng(){let state=12345;return ()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};}

test('circular RF matches exact resonant, detuned and opposite-polarization energy with second-order refinement',()=>{
  const omega=2,amplitude=.4,T=3;
  for(const drive of [2,1.3,-2]){
    const detuning=omega-drive;
    const exactSpeed=Math.abs(detuning)<1e-12?amplitude*T:Math.abs(2*amplitude*Math.sin(detuning*T/2)/detuning);
    const error=(dt:number)=>{
      let p:Particle={position:[0,0,0],velocity:[0,0,0]};
      for(let i=0;i<Math.round(T/dt);i++)p=step(p,1,dt,()=>({electric:rfField((i+.5)*dt,amplitude,Math.abs(drive)/(2*Math.PI),drive>0?-1:1),magnetic:[0,0,omega]}));
      return Math.abs(speed2(p.velocity)-exactSpeed**2);
    };
    const coarse=error(.01),fine=error(.005);
    assert.ok(coarse/fine>3.8&&coarse/fine<4.2);
    assert.ok(fine<1e-4);
  }
});

test('drifting Maxwellian source recovers independent velocity means and temperatures',()=>{
  const random=rng(),N=50000,mass=40,temperature=2,axialT=3,beamEV=20;
  const beam=Math.sqrt(2*E_CHARGE*beamEV/(mass*AMU));
  const sum=[0,0,0],second=[0,0,0];let xy=0;
  for(let i=0;i<N;i++){
    const v=sourceVelocity(mass,temperature,beamEV,axialT,0,'thermal',random);v[2]-=beam;
    v.forEach((x,j)=>{sum[j]+=x;second[j]+=x*x;});xy+=v[0]*v[1];
  }
  for(let j=0;j<3;j++){
    const variance=E_CHARGE*(j===2?axialT:temperature)/(mass*AMU);
    assert.ok(Math.abs(sum[j]/N)<.025*Math.sqrt(variance));
    assert.ok(Math.abs(second[j]/N/variance-1)<.025);
  }
  assert.ok(Math.abs(xy/N)/(E_CHARGE*temperature/(mass*AMU))<.025);
});

test('thermal source position is statistically independent of transverse kinetic energy',()=>{
  const random=rng(),N=2048;let x=0,y=0,xx=0,yy=0,xy=0;
  for(let i=0;i<N;i++){
    const seed=Math.floor(random()*4294967296);
    const path=simulate({...DEFAULT_CONFIG,seed,particlesPerSpecies:1,distribution:'thermal',
      voltage:0,magneticT:0,duration:1e-8,dt:1e-8}).species[0].paths[0].positions;
    const radius2=(path[0][0]**2+path[0][1]**2)/DEFAULT_CONFIG.sourceRadius**2;
    const vx=(path.at(-1)![0]-path[0][0])/1e-8;
    const vx2=vx**2/(E_CHARGE*DEFAULT_CONFIG.perpendicularEV/(40*AMU));
    x+=radius2;y+=vx2;xx+=radius2**2;yy+=vx2**2;xy+=radius2*vx2;
  }
  const correlation=(xy/N-x*y/N**2)/Math.sqrt((xx/N-(x/N)**2)*(yy/N-(y/N)**2));
  assert.ok(Math.abs(correlation)<.1,`Spurious source correlation: ${correlation}`);
});

test('equal m/q and identical velocity distributions give identical orbits',()=>{
  const a={...DEFAULT_CONFIG,particlesPerSpecies:8,distribution:'thermal' as const,axialTemperatureEV:1,species:[{massU:40,chargeState:1},{massU:40,chargeState:1}]};
  const b={...a,parallelEV:a.parallelEV*2,perpendicularEV:a.perpendicularEV*2,axialTemperatureEV:2,species:[{massU:80,chargeState:2},{massU:80,chargeState:2}]};
  const x=simulate(a),y=simulate(b);
  x.species.forEach((s,i)=>{
    assert.deepEqual([s.end,s.wall,s.source,s.remaining],[y.species[i].end,y.species[i].wall,y.species[i].source,y.species[i].remaining]);
    s.paths.forEach((path,j)=>path.positions.forEach((p,k)=>p.forEach((v,axis)=>assert.ok(Math.abs(v-y.species[i].paths[j].positions[k][axis])<1e-10))));
  });
});

test('integrated RF heating is selective, repeatable and energy-balanced; zero amplitude is the undriven limit',()=>{
  const input={...DEFAULT_CONFIG,mode:'icr' as const,voltage:0,particlesPerSpecies:8,perpendicularEV:0,dt:2e-8,
    rfAmplitudeVM:60,rfFrequencyHz:E_CHARGE*.1/(40*AMU)/(2*Math.PI),rfHandedness:-1 as const};
  const result=simulate(input);assert.deepEqual(result,simulate(input));
  assert.ok(result.species[0].rfWorkEV>10*result.species[1].rfWorkEV);
  result.species.forEach(s=>{assert.ok(s.maxRelativeEnergyError<1e-6);assert.equal(s.impacts.length,s.end+s.wall+s.source);});
  const zero=simulate({...input,rfAmplitudeVM:0});
  for(const s of zero.species){assert.equal(s.rfWorkEV,0);assert.equal(s.end,s.injected);}
});

test('cold-bath integrated collisions dissipate ion energy, conserve accounting and switch off at zero cross section',()=>{
  const input={...DEFAULT_CONFIG,particlesPerSpecies:48,voltage:0,magneticT:0,neutralDensityM3:1e18,neutralCrossSectionM2:1e-19,dt:2e-8};
  const result=simulate(input);assert.deepEqual(result,simulate(input));
  for(const s of result.species){assert.ok(s.collisions>0);assert.ok(s.neutralEnergyEV>0);assert.equal(s.end+s.wall+s.source+s.remaining,s.injected);assert.ok(s.maxRelativeEnergyError<1e-8);}
  const zero=simulate({...input,neutralCrossSectionM2:0});
  for(const s of zero.species){assert.equal(s.collisions,0);assert.equal(s.neutralEnergyEV,0);}
});

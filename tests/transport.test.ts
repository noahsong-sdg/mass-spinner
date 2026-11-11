import test from 'node:test';
import assert from 'node:assert/strict';
import {transport,DEFAULT_TRANSPORT,stepIonizationRate,transitCDF,type TransportMode} from '../src/transport.js';
import {AMU,E_CHARGE} from '../src/physics.js';
const close=(a:number,b:number,tolerance=1e-10)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-30),`${a} != ${b}`);
const metric=(r:ReturnType<typeof transport>,label:string)=>r.metrics.find(m=>m.label===label)!.value;

test('zero-B advection equals mobility and obeys qE/(mν) and Einstein diffusion',()=>{
  const c={...DEFAULT_TRANSPORT,magneticT:0,electricVM:20,collisionHz:1e5,temperatureEV:3};
  const a=transport('advection',c),b=transport('mobility',c);
  assert.deepEqual(a.curves,b.curves);
  for(const [name,mass] of [['A',40],['B',84]] as const){
    const mobility=E_CHARGE/(mass*AMU*c.collisionHz);
    close(metric(b,`${name} steady drift`),mobility*c.electricVM);
    close(metric(b,`${name} diffusion coefficient`),c.temperatureEV*mobility);
  }
  const reverse=transport('mobility',{...c,electricVM:-20});
  a.curves.forEach((curve,i)=>curve.y.forEach((y,j)=>close(reverse.curves[i].y[j],-y)));
});

test('cross-field drift vanishes with collisions or electric field and has correct Drude magnetic suppression',()=>{
  const c={...DEFAULT_TRANSPORT,collisionHz:1e4,magneticT:.2};
  const r=transport('advection',c),zeroB=transport('mobility',c);
  const omega=E_CHARGE*c.magneticT/(40*AMU);
  close(metric(r,'A steady drift')/metric(zeroB,'A steady drift'),1/(1+(omega/c.collisionHz)**2));
  assert.equal(metric(transport('advection',{...c,electricVM:0}),'A steady drift'),0);
  const collisionless=transport('diffusion',{...c,collisionHz:0});
  assert.equal(metric(collisionless,'A diffusion coefficient'),0);
  assert.ok(collisionless.curves.every(curve=>curve.y.every(y=>y===1)));
  assert.throws(()=>transport('advection',{...c,collisionHz:0}));
});

test('radial diffusion Green function conserves probability and recovers <r²>=4Dt',()=>{
  const r=transport('diffusion'),dt=DEFAULT_TRANSPORT.duration;
  r.curves.forEach((curve,index)=>{
    assert.equal(curve.y[0],0);assert.ok(curve.y.at(-1)!>1-2e-8);
    assert.ok(curve.y.every((y,i)=>i===0||y>=curve.y[i-1]));
    let moment=0;
    for(let i=1;i<curve.x.length;i++){
      const a=curve.x[i-1],b=curve.x[i];
      moment+=(a*(1-curve.y[i-1])+b*(1-curve.y[i]))*(b-a);
    }
    const exact=4*metric(r,`${['A','B'][index]} diffusion coefficient`)*dt;
    close(moment,exact,.001);
  });
});

test('tutorial heavy-on-light Coulomb collision scaling cancels heavy mass dependence of diffusion',()=>{
  const c={...DEFAULT_TRANSPORT,collisionModel:'coulomb-heavy-light' as const,backgroundMassU:4,densityM3:1e19,temperatureEV:10,magneticT:1};
  const r=transport('diffusion',c);
  close(metric(r,'A collision frequency')/metric(r,'B collision frequency'),84/40);
  close(metric(r,'A diffusion coefficient'),metric(r,'B diffusion coefficient'));
  // Eq.8 rounded CGS coefficient independently checks unit conversion and magnitude.
  const paperD=1.2e-3*(c.densityM3/1e6)*c.coulombLog*Math.sqrt(c.backgroundMassU)/Math.sqrt(c.temperatureEV)/(c.magneticT*1e4)**2*1e-4;
  close(metric(r,'A diffusion coefficient'),paperD,.01);
  assert.throws(()=>transport('diffusion',{...c,chargeB:2}));
  assert.throws(()=>transport('diffusion',{...c,backgroundMassU:40}));
  assert.throws(()=>transport('diffusion',{...c,magneticT:0}));
});

test('prescribed ionization kinetics preserve neutral+ion inventory and have the exact exponential survival law',()=>{
  const c={...DEFAULT_TRANSPORT,densityM3:1e17,ionizationRateA:2e-14,ionizationRateB:0};
  const r=transport('ionization',c);
  r.curves[0].y.forEach((fraction,i)=>{
    close(1-fraction,Math.exp(-c.densityM3*c.ionizationRateA*r.curves[0].x[i]));
    assert.ok(fraction>=0&&fraction<=1);
  });
  assert.ok(r.curves[1].y.every(y=>y===0));
  const zero=transport('ionization',{...c,densityM3:0});assert.ok(zero.curves.every(curve=>curve.y.every(y=>y===0)));
  const same=transport('ionization',{...c,ionizationRateB:c.ionizationRateA});assert.deepEqual(same.curves[0].y,same.curves[1].y);
});

test('step cross-section ionization rate matches independent Maxwellian energy quadrature',()=>{
  const temperature=5,threshold=15.76,sigma=1e-20,me=9.1093837139e-31,N=10000;
  const h=40*temperature/N;
  const integrand=(energy:number)=>sigma*Math.sqrt(2*E_CHARGE*energy/me)*2*Math.sqrt(energy)/(Math.sqrt(Math.PI)*temperature**1.5)*Math.exp(-energy/temperature);
  let integral=0;
  for(let i=0;i<=N;i++)integral+=integrand(threshold+i*h)*(i===0||i===N?1:i%2?4:2);
  integral*=h/3;
  close(stepIonizationRate(temperature,threshold,sigma),integral,1e-9);
  assert.equal(stepIonizationRate(temperature,threshold,0),0);
  assert.ok(stepIonizationRate(10,threshold,sigma)>stepIonizationRate(2,threshold,sigma));
  const c={ionizationModel:'step-cross-section' as const,thresholdAEV:threshold,thresholdBEV:threshold,ionizationCrossSectionA:sigma,ionizationCrossSectionB:sigma};
  const r=transport('ionization',c);assert.deepEqual(r.curves[0].y,r.curves[1].y);
});

test('fixed-energy TOF follows sqrt(m/E), not m/q, and finite-pulse convolution conserves arrival fraction',()=>{
  const c={...DEFAULT_TRANSPORT,energySpreadFraction:0,pulseWidthS:0};
  const r=transport('transit',c),ta=c.length*Math.sqrt(c.massA*AMU/(2*E_CHARGE*c.beamEV));
  close(metric(r,'A mean arrival time'),ta);
  close(metric(r,'B mean arrival time')/metric(r,'A mean arrival time'),Math.sqrt(84/40));
  assert.deepEqual(transport('transit',{...c,chargeA:3}).curves,r.curves);
  assert.equal(transitCDF(ta*.99,40,c.length,c.beamEV,0,0),0);
  assert.equal(transitCDF(ta*1.01,40,c.length,c.beamEV,0,0),1);
  const width=2e-5,spread=.2,time=ta;
  const exact=transitCDF(time,40,c.length,c.beamEV,spread,width);
  let numerical=0;const N=10000;
  for(let i=0;i<N;i++)numerical+=transitCDF(time-width*(i+.5)/N,40,c.length,c.beamEV,spread,0)/N;
  close(exact,numerical,1e-7);
  const finite=transport('transit',{...c,energySpreadFraction:spread,pulseWidthS:width});
  finite.curves.forEach(curve=>{assert.equal(curve.y[0],0);close(curve.y.at(-1)!,1);assert.ok(curve.y.every((y,i)=>i===0||y>=curve.y[i-1]-1e-12));});
});

test('invalid domains are explicit errors rather than fabricated finite predictions',()=>{
  for(const mode of ['advection','diffusion','mobility','ionization','transit'] as TransportMode[]){
    assert.throws(()=>transport(mode,{massA:0}));assert.throws(()=>transport(mode,{duration:NaN}));
    assert.throws(()=>transport(mode,{chargeA:1.5}));assert.throws(()=>transport(mode,{energySpreadFraction:1}));
  }
  assert.throws(()=>transport('mobility',{collisionHz:0}));
  assert.throws(()=>transport('diffusion',{collisionHz:0,magneticT:0}));
  assert.throws(()=>stepIonizationRate(0,2,1e-20));
});

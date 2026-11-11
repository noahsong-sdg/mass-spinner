import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,FUEL_PAIRS,idealCascade,lithiumVaporPressurePa,radialCDF,radialPDF,rotorResponse,simulateFuelCentrifuge,type FuelConfig} from '../src/fuel-centrifuge.js';

const U=1.66053906892e-27,K=1.380649e-23,E=1.602176634e-19;
function close(actual:number,expected:number,relative=1e-9,absolute=1e-12){
 assert.ok(Number.isFinite(actual)&&Number.isFinite(expected),`nonfinite comparison: ${actual}, ${expected}`);
 assert.ok(Math.abs(actual-expected)<=absolute+relative*Math.abs(expected),`${actual} != ${expected}`);
}
function quad(f:(x:number)=>number,a=0,b=1,n=8000){
 let sum=f(a)+f(b);
 for(let i=1;i<n;i++)sum+=(i%2?4:2)*f(a+(b-a)*i/n);
 return sum*(b-a)/(3*n);
}

// Independent time-domain oracle: direct RK4 of angular velocities plus cumulative
// drive work and each physical dissipation channel. No production eigen/phi code.
function rk4(ii:number,nn:number,gamma:number,drag:number,torque:number,time:number,n=16000){
 const rhs=(y:number[])=>{
  const slip=y[0]-y[1];
  return [(torque-gamma*slip)/ii,(gamma*slip-drag*y[1])/nn,
   torque*y[0],gamma*slip**2,drag*y[1]**2];
 };
 let y=[0,0,0,0,0];const h=time/n;
 for(let j=0;j<n;j++){
  const a=rhs(y),b=rhs(y.map((v,i)=>v+h*a[i]/2)),c=rhs(y.map((v,i)=>v+h*b[i]/2)),d=rhs(y.map((v,i)=>v+h*c[i]));
  y=y.map((v,i)=>v+h*(a[i]+2*b[i]+2*c[i]+d[i])/6);
 }
 return y;
}

test('independent time-domain integration agrees with the exact driven rotor and cumulative energy',()=>{
 const ii=.3,nn=7,gamma=.8,drag=2,torque=1.3;
 for(const time of [.001,.7,6]){
  const [ion,neutral,work,slipHeat,external]=rk4(ii,nn,gamma,drag,torque,time);
  const exact=rotorResponse(ii,nn,gamma,drag,torque,time);
  close(exact.ion,ion,2e-10);close(exact.neutral,neutral,2e-10);
  const kinetic=.5*(ii*exact.ion**2+nn*exact.neutral**2);
  close(work,kinetic+slipHeat+external,3e-10);
  assert.ok(slipHeat>=0&&external>=0);
 }
});

test('undamped reciprocal friction has the independently derived accelerating common mode',()=>{
 const ii=.2,nn=5,gamma=.7,torque=.9;
 for(const time of [0,1e-9,.3,8]){
  const lambda=gamma*(1/ii+1/nn),slip=torque/ii*(-Math.expm1(-lambda*time))/lambda;
  const mean=torque*time/(ii+nn),expectedIon=mean+nn/(ii+nn)*slip,expectedNeutral=mean-ii/(ii+nn)*slip;
  const r=rotorResponse(ii,nn,gamma,0,torque,time);
  close(r.ion,expectedIon);close(r.neutral,expectedNeutral);
  close(ii*r.ion+nn*r.neutral,torque*time);
  const reverse=rotorResponse(ii,nn,gamma,0,-torque,time);
  close(reverse.ion,-r.ion);close(reverse.neutral,-r.neutral);
 }
});

test('zero-coupling, zero-loss and stiff driven limits remain finite and nonoscillatory',()=>{
 for(const drag of [0,3]){
  const r=rotorResponse(.2,5,0,drag,.9,4);
  close(r.ion,18);close(r.neutral,0);
 }
 const off=rotorResponse(.2,5,.7,3,0,4);close(off.ion,0);close(off.neutral,0);
 const ii=.03,nn=3,gamma=1e9,drag=6,torque=2;
 let previousIon=0,previousNeutral=0;
 for(const time of [0,1e-14,1e-10,1e-6,.01,1,20]){
  const r=rotorResponse(ii,nn,gamma,drag,torque,time);
  assert.ok(Number.isFinite(r.ion)&&Number.isFinite(r.neutral));
  assert.ok(r.ion>=previousIon-1e-12&&r.neutral>=previousNeutral-1e-12&&r.ion>=r.neutral-1e-12);
  previousIon=r.ion;previousNeutral=r.neutral;
 }
 const steady=rotorResponse(ii,nn,gamma,drag,torque,20);
 close(steady.neutral,torque/drag,2e-7);close(steady.ion,torque/drag+torque/gamma,2e-7);
});

test('reported instantaneous angular and energy powers close with reciprocal torque transfer',()=>{
 const r=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA:.02});
 const {ii,nn,gamma,drag,torque}=r.mechanics;
 for(const p of r.samples){
  const slip=p.ionRadS-p.neutralRadS,di=(torque-gamma*slip)/ii,dn=(gamma*slip-drag*p.neutralRadS)/nn;
  close(ii*di+nn*dn,torque-drag*p.neutralRadS,1e-9,1e-16);
  close(p.mechanicalW,p.slipW+p.dragW+ii*p.ionRadS*di+nn*p.neutralRadS*dn,1e-9,1e-12);
  close(p.energyResidualW,0,0,1e-10);close(p.angularResidualNm,0,0,1e-15);
  close(p.totalInputW,p.mechanicalW+p.ohmicW);assert.ok(p.slipW>=0&&p.dragW>=0);
 }
});

test('radial normalization and cuts agree with independent Boltzmann quadrature through the weak and strong limits',()=>{
 for(const beta of [0,1e-9,.5,9,100]){
  const weight=(y:number)=>Math.exp(beta*(y-1)),normalizer=quad(weight);
  close(quad(y=>radialPDF(beta,y)),1,2e-9);
  for(const y of [.1,.65,.95]){
   close(radialCDF(beta,y),quad(weight,0,y)/normalizer,2e-9);
   close(radialPDF(beta,y),weight(y)/normalizer,2e-9);
  }
  assert.equal(radialCDF(beta,0),0);assert.equal(radialCDF(beta,1),1);
 }
 for(const beta of [1e3,1e7]){
  assert.ok(Number.isFinite(radialPDF(beta,1))&&radialPDF(beta,1)>0);
  const y=1-1/beta;
  close(radialCDF(beta,y),Math.exp(-1),2e-8);
 }
});

test('neutral finite-volume collection uses bulk abundance and conserves both isotopes',()=>{
 const c={...DEFAULT_FUEL_CENTRIFUGE,currentA:.02,durationS:3,cutFraction:.6};
 const r=simulateFuelCentrifuge(c),speed=r.samples.at(-1)!.neutralMS;
 const probabilities=FUEL_PAIRS[c.pair].masses.map(m=>{
  const weight=(radius:number)=>radius*Math.exp(m*U*speed**2*(radius/c.radiusM)**2/(2*K*c.gasK));
  return quad(weight,0,c.radiusM*c.cutFraction)/quad(weight,0,c.radiusM);
 });
 const [l,h]=probabilities,x=c.lightFraction,cut=x*l+(1-x)*h;
 close(r.collection.innerFraction,cut);close(r.collection.innerLightPurity!,x*l/cut);
 close(r.collection.lightRecovery,l);close(r.collection.outerHeavyPurity!,(1-x)*(1-h)/(1-cut));
 assert.ok(r.collection.innerLightPurity!>x&&r.collection.outerHeavyPurity!>1-x);
 close(cut*r.collection.innerLightPurity!+(1-cut)*(1-r.collection.outerHeavyPurity!),x);
 let recovery=-1;
 for(const row of r.cuts){assert.ok(row.lightRecovery>=recovery);recovery=row.lightRecovery;}
});

test('no rotation and empty radial outlets preserve undefined purity instead of inventing enrichment',()=>{
 const c={...DEFAULT_FUEL_CENTRIFUGE,currentA:0};
 const r=simulateFuelCentrifuge(c);
 close(r.collection.innerLightPurity!,c.lightFraction);close(r.collection.lightRecovery,c.cutFraction**2);
 close(r.collection.logHeavyLightSeparation,0);
 for(const p of r.profiles)close(p.lightFraction!,c.lightFraction);
 const none=simulateFuelCentrifuge({...c,cutFraction:0}),all=simulateFuelCentrifuge({...c,cutFraction:1});
 assert.equal(none.collection.innerLightPurity,null);assert.equal(none.collection.lightRecovery,0);
 assert.equal(all.collection.outerHeavyPurity,null);assert.equal(all.collection.lightRecovery,1);
 assert.equal(none.cascade.productLightPurity,null);close(none.cascade.light.tails,1);
 close(all.cascade.productFraction,1);close(all.cascade.light.product,1);
});

// Independent absorbing random walk, rather than another tridiagonal solve.
function route(p:number,n:number,feed:number){
 let population=Array(n).fill(0);population[feed-1]=1;
 const visits=Array(n).fill(0);let product=0,tails=0;
 for(let step=0;step<20000;step++){
  const next=Array(n).fill(0);
  population.forEach((amount,j)=>{
   visits[j]+=amount;
   if(j===0)tails+=(1-p)*amount;else next[j-1]+=(1-p)*amount;
   if(j===n-1)product+=p*amount;else next[j+1]+=p*amount;
  });
  population=next;
  if(population.reduce((a,b)=>a+b,0)<1e-15)return {product,tails,visits};
 }
 throw new Error('Independent routing reference did not exhaust its transient population.');
}

test('countercurrent cascade agrees with independent absorbing-path balances including deterministic limits',()=>{
 for(const p of [0,.01,.2,.5,.8,.99,1])for(const n of [1,3,8])for(const feed of new Set([1,Math.ceil(n/2),n])){
  const actual=idealCascade(p,n,feed),expected=route(p,n,feed);
  close(actual.product,expected.product,1e-10);close(actual.tails,expected.tails,1e-10);
  actual.visits.forEach((v,i)=>close(v,expected.visits[i],1e-10));
  close(actual.product+actual.tails,1);
  if(p===.5){close(actual.product,feed/(n+1));close(actual.visits.reduce((a,b)=>a+b,0),feed*(n+1-feed));}
 }
});

test('binary cascade retains both isotope exits and respects pure-feed limits',()=>{
 for(const lightFraction of [0,.0759,.5,1]){
  const r=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA:.02,lightFraction});
  const lightProduct=lightFraction*r.cascade.light.product,heavyProduct=(1-lightFraction)*r.cascade.heavy.product;
  close(r.cascade.productFraction,lightProduct+heavyProduct);
  close(lightProduct+lightFraction*r.cascade.light.tails,lightFraction);
  close(heavyProduct+(1-lightFraction)*r.cascade.heavy.tails,1-lightFraction);
  close(r.cascade.lightBalance,0,0,1e-12);close(r.cascade.heavyBalance,0,0,1e-12);
  if(lightFraction===0||lightFraction===1)close(r.cascade.productLightPurity!,lightFraction);
 }
});

test('conditional pumping reduces to series conductances and scales consistently at fixed rotation',()=>{
 const c=DEFAULT_FUEL_CENTRIFUGE,off=simulateFuelCentrifuge({...c,currentA:0});
 close(off.pumping.axisPa,c.pressurePa);close(off.pumping.wallPa,c.pressurePa);
 close(off.pumping.effectiveSpeedM3S!,c.pumpSpeedM3S*c.conductanceM3S/(c.pumpSpeedM3S+c.conductanceM3S));
 const a=simulateFuelCentrifuge({...c,currentA:.02}),b=simulateFuelCentrifuge({...c,pressurePa:c.pressurePa*2,currentA:.04});
 close(b.samples.at(-1)!.neutralRadS,a.samples.at(-1)!.neutralRadS);
 for(const key of ['axisPa','wallPa','upstreamPa','gasLoadPaM3S'] as const)close(b.pumping[key],2*a.pumping[key]);
 close(b.pumping.effectiveSpeedM3S!,a.pumping.effectiveSpeedM3S!);close(b.pumping.turnoverS!,a.pumping.turnoverS!);
 assert.ok(a.pumping.wallPa>a.pumping.axisPa&&a.pumping.effectiveSpeedM3S!<c.conductanceM3S);
});

test('neutral pressure fixes neutral inertia and pumping inventory independently of prescribed ion fraction',()=>{
 const c=DEFAULT_FUEL_CENTRIFUGE,volume=Math.PI*c.radiusM**2*c.lengthM;
 const neutralNumber=c.pressurePa*volume/(K*c.gasK);
 const [ml,mh]=FUEL_PAIRS[c.pair].masses,meanMass=(c.lightFraction*ml+(1-c.lightFraction)*mh)*U;
 const neutralInertia=neutralNumber*meanMass*c.radiusM**2/2;
 for(const ionFraction of [.01,.2,.5]){
  const r=simulateFuelCentrifuge({...c,ionFraction,durationS:100});
  close(r.mechanics.nn,neutralInertia,1e-12,1e-24);
  close(r.mechanics.ii/neutralInertia,ionFraction/(1-ionFraction));
  close(r.mechanics.gamma/r.mechanics.ii,c.collisionHz);
  close(r.pumping.turnoverS!*r.pumping.gasLoadPaM3S,c.pressurePa*volume);
  // After the analytic transient decays, ion fraction changes slip/inertia but
  // not the neutral steady speed at fixed neutral inventory, torque and drag.
  close(r.samples.at(-1)!.neutralRadS,r.mechanics.torque/(neutralInertia*c.dragHz),1e-8);
 }
});

test('lithium saturation reference preserves the NIST published coefficients, bar conversion and fit interval',()=>{
 // NIST WebBook/Hicks1963: log10(P/bar)=4.98831−7918.984/(T−9.52),
 // interval298.14–1599.99K. Inverse isobars check units/sign independently
 // of the production forward evaluation; these are fit checks, not calibration.
 // https://webbook.nist.gov/cgi/cbook.cgi?ID=C7439932&Mask=4
 for(const [logBar,pressurePa] of [[-6,.1],[-3,100],[0,100000]]){
  const temperatureK=9.52+7918.984/(4.98831-logBar);
  close(lithiumVaporPressurePa(temperatureK)!,pressurePa,2e-12);
 }
 for(const temperatureK of [298.14,1599.99])assert.ok(lithiumVaporPressurePa(temperatureK)!>0);
 for(const temperatureK of [298.139,1600,0,NaN,Infinity])assert.equal(lithiumVaporPressurePa(temperatureK),null);
 const hot=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,linerK:1000});
 close(hot.lithium.wallSaturationRatio!,hot.pumping.wallPa/lithiumVaporPressurePa(1000)!);
 close(hot.lithium.gasVaporPressurePa!,lithiumVaporPressurePa(DEFAULT_FUEL_CENTRIFUGE.gasK)!);
 const cold=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,linerK:250});
 assert.equal(cold.lithium.wallVaporPressurePa,null);assert.equal(cold.lithium.wallSaturationRatio,null);
 assert.ok(cold.mechanics.linerHeatW<0&&cold.mechanics.requiredCoolingW<0);
 const other=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,pair:'helium',lithiumSeed:true});
 assert.equal(other.lithium.wallVaporPressurePa,null);assert.equal(other.lithium.gasVaporPressurePa,null);
});

test('DT processing inventories have correct burn and loop-delay limits independently of selected gas pair',()=>{
 const c=DEFAULT_FUEL_CENTRIFUGE,r=simulateFuelCentrifuge(c),massT=3.016049282*U;
 const burn=c.fusionMW*1e6/(17.6e6*E);
 close(r.fuelCycle.burnTritonsS,burn);
 close(r.fuelCycle.exhaustTritiumKg,massT*burn*(1-c.burnFraction)/c.burnFraction*c.loopTimeS);
 close(r.fuelCycle.exhaustTritiumKg/r.fuelCycle.grossTritiumKg,1-c.burnFraction);
 const twice=simulateFuelCentrifuge({...c,loopTimeS:c.loopTimeS*2});
 close(twice.fuelCycle.exhaustTritiumKg,2*r.fuelCycle.exhaustTritiumKg);
 const full=simulateFuelCentrifuge({...c,burnFraction:1}),off=simulateFuelCentrifuge({...c,fusionMW:0});
 assert.equal(full.fuelCycle.exhaustTritiumKg,0);assert.equal(off.fuelCycle.grossTritiumKg,0);
 close(simulateFuelCentrifuge({...c,pair:'helium'}).fuelCycle.burnTritonsS,burn);
});

test('invalid and unrepresentable operating points fail instead of exporting nonfinite physics',()=>{
 const patches:Partial<FuelConfig>[]=[{ionFraction:0},{ionFraction:1},{gasK:0},{burnFraction:0},
  {cutFraction:-.1},{cutFraction:1.1},{stages:2,feedStage:3},{stages:1.5},{feedStage:NaN},
  {currentA:Infinity},{gasK:NaN},{conductivitySm:Number.MIN_VALUE},{pressurePa:1e308},
  {radiusM:1e200},{pumpSpeedM3S:1e308},{fusionMW:1e308},{pressurePa:Number.MIN_VALUE}];
 for(const patch of patches)assert.throws(()=>simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,...patch}),RangeError,JSON.stringify(patch));
 assert.throws(()=>idealCascade(NaN,3,2),RangeError);assert.throws(()=>idealCascade(.5,3,4),RangeError);
});

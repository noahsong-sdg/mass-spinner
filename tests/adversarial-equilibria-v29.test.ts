import test from 'node:test';
import assert from 'node:assert/strict';
import {centrifuge} from '../src/centrifuge.js';
import {centrifugeDiagnostics} from '../src/centrifuge-diagnostics.js';
import {gaussianCentrifuge} from '../src/gaussian-centrifuge.js';
import {magneticCentrifuge} from '../src/magnetic-centrifuge.js';
import {geometry,DEFAULT_GEOMETRY} from '../src/geometries.js';

const U=1.66053906660e-27,E=1.602176634e-19,MU0=1.25663706127e-6;
const close=(actual:number,expected:number,relative=1e-10)=>assert.ok(
 Math.abs(actual-expected)<=relative*Math.max(Math.abs(expected),1e-300),`${actual} versus ${expected}`);
const gaussian={radius:.48,rotationRadS:10000,ionTemperatureEV:5,electronTemperatureEV:5,
 magneticT:.1,densityWidthM:.05,axisDensityM3:1e17,bins:1000,
 species:[{massU:40,chargeState:1,axisFraction:.5},{massU:84,chargeState:1,axisFraction:.5}]};

test('narrow Gaussian annuli retain finite populations and composition rather than cancellation to vacuum',()=>{
 for(const cut of [.7,.70321,.95]){
  const result=gaussianCentrifuge(gaussian),d=centrifugeDiagnostics(result,cut);
  const w=gaussian.densityWidthM,a=gaussian.radius;
  const exact=(w/a)**2*(Math.exp(-((cut*a/w)**2))-Math.exp(-((a/w)**2)));
  assert.ok(d.outer.inventory.every(n=>n>0),'finite positive outer density requires finite positive outer inventory');
  close(d.outer.inventory.reduce((a,b)=>a+b),exact,.01);
  assert.ok(d.outer.numberFractions.every(f=>f!==null&&f>0));
  close(d.outer.numberFractions.reduce<number>((s,f)=>s+f!,0),1);
  d.volumeMeanIonDensities.forEach((n,i)=>close(d.inner.inventory[i]+d.outer.inventory[i],n,1e-14));
 }
});

test('a cut crossing a linear density cell partitions the exact cylindrical integral',()=>{
 const cut=.7,result={species:gaussian.species,referenceSpeciesIndex:0,maxRelativeChargeResidual:0,
  profiles:[{radius:0,ionDensities:[2,1]},{radius:.4,ionDensities:[3,2]},{radius:1,ionDensities:[1,4]}]
   .map(p=>({...p,electronDensity:p.ionDensities[0]+p.ionDensities[1],effectivePotentialV:0,logSeparationFactors:[0,0]}))};
 const d=centrifugeDiagnostics(result,cut);
 const expected=[13/3*(1-cut**2)-20/9*(1-cut**3),2/3*(1-cut**2)+20/9*(1-cut**3)];
 expected.forEach((n,i)=>close(d.outer.inventory[i],n,1e-14));
 d.volumeMeanIonDensities.forEach((n,i)=>close(d.inner.inventory[i]+d.outer.inventory[i],n,1e-14));
});

test('direct annular inventory converges to the analytic Gaussian tail under radial refinement',()=>{
 const cut=.7,w=gaussian.densityWidthM,a=gaussian.radius;
 const exact=(w/a)**2*(Math.exp(-((cut*a/w)**2))-Math.exp(-((a/w)**2)));
 const errors=[400,800,1600].map(bins=>{
  const d=centrifugeDiagnostics(gaussianCentrifuge({...gaussian,bins}),cut);
  return Math.abs(d.outer.inventory.reduce((a,b)=>a+b)-exact)/exact;
 });
 assert.ok(errors[0]>errors[1]&&errors[1]>errors[2],JSON.stringify(errors));
 assert.ok(errors[0]/errors[1]>3.8&&errors[1]/errors[2]>3.8,JSON.stringify(errors));
});

test('gyro loci retain their transverse extent and resolved chords at UI-accessible charge/mass aliases',()=>{
 for(const input of [{massA:1,chargeA:2,massB:125,chargeB:1},{massA:4,chargeA:2,massB:200,chargeB:1},{massA:1,chargeA:3,massB:200,chargeB:1}]){
  const c={...DEFAULT_GEOMETRY,...input},result=geometry('gyro',c);
  result.curves.forEach((curve,i)=>{
   const mass=i?c.massB:c.massA,z=i?c.chargeB:c.chargeA;
   const rho=Math.sqrt(2*E*c.temperatureEV/(mass*U))/(z*E*c.magneticT/(mass*U));
   const xSpan=Math.max(...curve.x)-Math.min(...curve.x);
   const ySpan=Math.max(...curve.y)-Math.min(...curve.y);
   assert.ok(xSpan>1.99*rho&&ySpan>1.99*rho,'a completed circular locus cannot collapse into a line');
   assert.ok(curve.x.length<=2001,'preserve the bounded display budget');
   for(let j=1;j<curve.x.length;j++)assert.ok(Math.hypot(curve.x[j]-curve.x[j-1],curve.y[j]-curve.y[j-1])<.02*rho,
    'stored chords must resolve the fast species too');
  });
 }
});

test('sub-period gyro plots preserve the physically observed partial arc',()=>{
 const c={...DEFAULT_GEOMETRY,duration:1e-8},result=geometry('gyro',c);
 result.curves.forEach((curve,i)=>{
  const mass=i?c.massB:c.massA,z=i?c.chargeB:c.chargeA;
  const omega=z*E*c.magneticT/(mass*U),rho=Math.sqrt(2*E*c.temperatureEV/(mass*U))/omega;
  close(curve.x.at(-1)!,rho*Math.sin(omega*c.duration));
  close(curve.y.at(-1)!,rho*(Math.cos(omega*c.duration)-1));
 });
});

test('three unequal-charge corotating species match independent unscaled Newton force closure',()=>{
 const c={radius:.15,rotationRadS:25000,ionTemperatureEV:7,electronTemperatureEV:3,bins:400,
  species:[{massU:10,chargeState:1,axisFraction:.2},{massU:40,chargeState:2,axisFraction:.3},{massU:70,chargeState:3,axisFraction:.5}]};
 const r=centrifuge(c),Q=c.species.reduce((s,i)=>s+i.chargeState*i.axisFraction,0),tau=c.ionTemperatureEV/c.electronTemperatureEV;
 for(const j of [0,40,160,280,400]){
  const p=r.profiles[j],alpha=c.species.map(s=>s.massU*U*(c.rotationRadS*p.radius)**2/(2*E*c.ionTemperatureEV));
  let y=0;
  for(let k=0;k<20;k++){
   const ions=c.species.map((s,i)=>s.axisFraction*Math.exp(alpha[i]-s.chargeState*y));
   const electron=Q*Math.exp(tau*y);
   const f=ions.reduce((sum,n,i)=>sum+c.species[i].chargeState*n,0)-electron;
   const derivative=-ions.reduce((sum,n,i)=>sum+c.species[i].chargeState**2*n,0)-tau*electron;
   y-=f/derivative;
  }
  close(p.effectivePotentialV,c.ionTemperatureEV*y,1e-12);
  p.ionDensities.forEach((n,i)=>close(n,c.species[i].axisFraction*Math.exp(alpha[i]-c.species[i].chargeState*y),1e-12));
 }
});

test('zero-rotation coupled magnetic column conserves total magnetic plus plasma pressure for Z=3',()=>{
 const c={...gaussian,radius:.2,densityWidthM:.1,rotationRadS:0,magneticT:-.06,
  axisDensityM3:1e19,bins:400,magneticBoundary:'axis' as const,species:gaussian.species.map(s=>({...s,chargeState:3}))};
 const result=magneticCentrifuge(c),thermal=E*(c.ionTemperatureEV+3*c.electronTemperatureEV);
 const pressure=c.magneticT**2/(2*MU0)+c.axisDensityM3*thermal;
 for(const p of result.gaussianProfiles){
  close(p.magneticFieldT**2/(2*MU0)+p.totalIonDensityM3*thermal,pressure,1e-11);
  close(p.currentDensityAM2,3*E*p.totalIonDensityM3*(p.ionVelocityMS-p.electronVelocityMS),1e-12);
 }
});

test('equal-charge enrichment is independent of electron temperature while total corotating density is not',()=>{
 const c={...gaussian,ionTemperatureEV:5,bins:100};
 const low=centrifuge({...c,electronTemperatureEV:1}),high=centrifuge({...c,electronTemperatureEV:50});
 low.profiles.forEach((p,i)=>{
  const expected=(84-40)*U*(c.rotationRadS*p.radius)**2/(2*E*c.ionTemperatureEV);
  close(p.logSeparationFactors[1]!,expected,1e-12);
  close(high.profiles[i].logSeparationFactors[1]!,expected,1e-12);
 });
 assert.notEqual(low.profiles.at(-1)!.electronDensity,high.profiles.at(-1)!.electronDensity);
});

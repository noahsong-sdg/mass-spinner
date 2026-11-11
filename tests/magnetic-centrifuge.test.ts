import test from 'node:test';
import assert from 'node:assert/strict';
import {magneticCentrifuge,type MagneticCentrifugeConfig} from '../src/magnetic-centrifuge.js';
import {gaussianCentrifuge} from '../src/gaussian-centrifuge.js';
import {AMU,E_CHARGE} from '../src/physics.js';
import {centrifugeDiagnostics} from '../src/centrifuge-diagnostics.js';

const MU0=1.25663706127e-6;
const c:MagneticCentrifugeConfig={radius:.2,densityWidthM:.1,axisDensityM3:1e19,
 rotationRadS:20000,ionTemperatureEV:5,electronTemperatureEV:5,magneticT:.06,
 magneticBoundary:'axis',bins:400,
 species:[{massU:40,chargeState:1,axisFraction:.6},{massU:84,chargeState:1,axisFraction:.4}]};
const close=(actual:number,expected:number,relative=1e-9)=>
 assert.ok(Math.abs(actual-expected)<relative*Math.max(1e-30,Math.abs(expected)),`${actual} != ${expected}`);

test('single-species magnetic pressure has an independent exact radial integral for either signed boundary',()=>{
 for(const chargeState of [1,2])for(const magneticT of [.06,-.06])for(const boundary of ['axis','wall'] as const){
  const input={...c,magneticT,magneticBoundary:boundary,species:[{...c.species[0],chargeState}]};
  const r=magneticCentrifuge(input);
  const force=40*AMU*c.rotationRadS**2+2*E_CHARGE*(c.ionTemperatureEV+chargeState*c.electronTemperatureEV)/c.densityWidthM**2;
  const rise=(x:number)=>MU0*c.axisDensityM3*force*c.densityWidthM**2*(1-Math.exp(-((x/c.densityWidthM)**2)));
  const axis2=magneticT**2-(boundary==='wall'?rise(c.radius):0);
  for(const p of r.gaussianProfiles)close(p.magneticFieldT,Math.sign(magneticT)*Math.sqrt(axis2+rise(p.radius)),1e-11);
  close(boundary==='axis'?r.axisMagneticT:r.wallMagneticT,magneticT,1e-14);
  close(r.requiredMagneticPressureRisePa,rise(c.radius)/(2*MU0),1e-11);
 }
});

test('independent finite differences satisfy ion/electron force balance and Ampere on the solved field',()=>{
 const r=magneticCentrifuge({...c,bins:2000}),h=c.radius/2000;
 for(const j of [100,500,1000,1500,1900]){
  const p=r.gaussianProfiles[j],b=p.magneticFieldT;
  const phiPrime=(r.gaussianProfiles[j+1].laboratoryPotentialV-r.gaussianProfiles[j-1].laboratoryPotentialV)/(2*h);
  const bPrime=(r.gaussianProfiles[j+1].magneticFieldT-r.gaussianProfiles[j-1].magneticFieldT)/(2*h);
  close(phiPrime,-p.electricFieldVM,3e-7);
  close(bPrime,-MU0*p.currentDensityAM2,3e-6);
  for(let i=0;i<2;i++){
   const pressure=E_CHARGE*c.ionTemperatureEV*(Math.log(r.profiles[j+1].ionDensities[i])-Math.log(r.profiles[j-1].ionDensities[i]))/(2*h);
   const force=c.species[i].massU*AMU*c.rotationRadS**2*p.radius-E_CHARGE*phiPrime+E_CHARGE*c.rotationRadS*p.radius*b;
   close(force,pressure,3e-6);
  }
  const electronPressure=-2*E_CHARGE*c.electronTemperatureEV*p.radius/c.densityWidthM**2;
  close(E_CHARGE*(phiPrime-p.electronVelocityMS*b),electronPressure,3e-6);
  close(p.currentDensityAM2,E_CHARGE*p.totalIonDensityM3*(p.ionVelocityMS-p.electronVelocityMS),1e-12);
 }
 assert.ok(r.maxRelativeChargeResidual<1e-14);
 assert.ok(r.maxRelativeForceBalanceResidual<1e-14);
 assert.ok(r.maxRelativeAmpereResidual<1e-6);
});

test('low density recovers the imposed-field closure while dense field feedback is not a posthoc estimate',()=>{
 const low={...c,axisDensityM3:1e8},a=magneticCentrifuge(low),b=gaussianCentrifuge(low);
 for(let j=0;j<a.profiles.length;j++){
  assert.deepEqual(a.profiles[j],b.profiles[j]);
  close(a.gaussianProfiles[j].magneticFieldT,c.magneticT,1e-12);
  if(j)close(a.gaussianProfiles[j].laboratoryPotentialV,b.gaussianProfiles[j].laboratoryPotentialV,1e-12);
 }
 const high={...c,axisDensityM3:2e20};
 const coupled=magneticCentrifuge(high),imposed=gaussianCentrifuge(high);
 assert.ok(coupled.maxRelativeMagneticPerturbation>.1);
 assert.ok(Math.abs(coupled.wallMagneticT-(high.magneticT+imposed.gaussianProfiles.at(-1)!.magneticPerturbationT))>1e-4);
 assert.notEqual(coupled.gaussianProfiles.at(-1)!.currentDensityAM2,imposed.gaussianProfiles.at(-1)!.currentDensityAM2);
});

test('zero rotation, equal masses, absent species and sign reversal preserve density and composition invariants',()=>{
 const zero=magneticCentrifuge({...c,rotationRadS:0});
 for(const p of zero.profiles)close(p.ionDensities[1]/p.ionDensities[0],2/3);
 assert.ok(zero.gaussianProfiles.at(-1)!.electronVelocityMS>0,'Pressure current remains at zero ion rotation.');
 const same=magneticCentrifuge({...c,species:c.species.map(s=>({...s,massU:40}))});
 for(const p of same.profiles)assert.deepEqual(p.logSeparationFactors,[0,0]);
 const absent=magneticCentrifuge({...c,species:c.species.map((s,i)=>({...s,axisFraction:i}))});
 for(const p of absent.profiles){assert.equal(p.ionDensities[0],0);assert.equal(p.logSeparationFactors[0],null);}
 const a=magneticCentrifuge(c),b=magneticCentrifuge({...c,magneticT:-c.magneticT}),reverse=magneticCentrifuge({...c,rotationRadS:-c.rotationRadS});
 a.gaussianProfiles.forEach((p,j)=>{
  assert.deepEqual(a.profiles[j],b.profiles[j]);assert.deepEqual(a.profiles[j],reverse.profiles[j]);
  close(p.magneticFieldT,-b.gaussianProfiles[j].magneticFieldT);
  close(p.currentDensityAM2,-b.gaussianProfiles[j].currentDensityAM2);
  close(p.magneticFieldT,reverse.gaussianProfiles[j].magneticFieldT);
 });
 close(centrifugeDiagnostics(a).bulkNumberFractions[1]!,centrifugeDiagnostics(b).bulkNumberFractions[1]!);
});

test('axis and wall specifications describe the same equilibrium when their boundary values match',()=>{
 const axis=magneticCentrifuge(c),wall=magneticCentrifuge({...c,magneticBoundary:'wall',magneticT:axis.wallMagneticT});
 for(let j=0;j<axis.gaussianProfiles.length;j++){
  close(axis.gaussianProfiles[j].magneticFieldT,wall.gaussianProfiles[j].magneticFieldT,1e-14);
  if(j)close(axis.gaussianProfiles[j].laboratoryPotentialV,wall.gaussianProfiles[j].laboratoryPotentialV,1e-14);
 }
});

test('quadrature and independent Ampere defects decrease under radial refinement',t=>{
 const results=[25,50,100,200].map(bins=>magneticCentrifuge({...c,bins}));
 const exact=magneticCentrifuge({...c,bins:2000}).wallMagneticT;
 const errors=results.map(r=>Math.abs(r.wallMagneticT-exact));
 const defects=results.map(r=>r.maxRelativeAmpereResidual);
 t.diagnostic(JSON.stringify({bins:[25,50,100,200],wallFieldErrorsT:errors,relativeAmpereDefects:defects}));
 assert.ok(errors[0]/errors[1]>15&&errors[1]/errors[2]>15);
 assert.ok(defects[0]/defects[1]>3.9&&defects[1]/defects[2]>3.9);
});

test('incompatible wall pressure and undefined boundary fail explicitly without clipping B or changing density',()=>{
 assert.throws(()=>magneticCentrifuge({...c,magneticBoundary:'wall',axisDensityM3:1e23}),/No regular nonzero-B/);
 assert.throws(()=>magneticCentrifuge({...c,magneticBoundary:'unknown' as 'axis'}),/axis or wall/);
 assert.throws(()=>magneticCentrifuge({...c,magneticT:0}),/nonzero B/);
 assert.throws(()=>magneticCentrifuge({...c,species:[c.species[0],{...c.species[1],chargeState:2}]}),/equal ion charge/);
});

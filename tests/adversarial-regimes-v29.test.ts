import test from 'node:test';
import assert from 'node:assert/strict';
import {AMU,E_CHARGE,type Vec} from '../src/physics.js';
import {EPSILON_0} from '../src/coulomb.js';
import {DEFAULT_DOUBLEWELL,validateDoublewell,simulateDoublewell} from '../src/doublewell-dynamics.js';
import {inspectDoublewellRegime} from '../src/doublewell-regime.js';
import {quarticPotential} from '../src/doublewell-orbits.js';
import {DEFAULT_FAILURE_BUDGETS,failureBudgets} from '../src/failure-budgets.js';
import {section3Coverage} from '../src/failure-catalog.js';

const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<=1e-10*Math.max(Math.abs(a),Math.abs(b),1e-20),`${a} != ${b}`);
function thermal(massU:number,temperatureEV:number){
 const v=Math.sqrt(5*E_CHARGE*temperatureEV/(2*AMU*massU));
 return [0,1,2].flatMap(axis=>[-1,1].map(sign=>({massU,chargeState:1,
  velocity:[0,1,2].map(k=>k===axis?sign*v:0) as Vec})));
}

test('independent SI screening and coupling checks cover default and UI extreme states',()=>{
 for(const n of [1e16,1e18,1e20])for(const te of [1,5,30])for(const b of [.01,.06,.2]){
  const c={...DEFAULT_DOUBLEWELL,densityM3:n,electronTemperatureEV:te,magneticT:b};
  const r=inspectDoublewellRegime(c,[{densityM3:n,ions:[...thermal(40,5),...thermal(84,5)]}]);
  const debye=Math.sqrt(EPSILON_0*te/(n*E_CHARGE));
  close(r.reference.debyeM,debye);
  close(r.reference.debyePopulation,4*Math.PI/3*n*debye**3);
  close(r.reference.maxCoupling!,E_CHARGE/(4*Math.PI*EPSILON_0*Math.cbrt(3/(4*Math.PI*n))*5));
  const unmagnetized=r.reference.maxEncounterMagnetization!<.1;
  assert.equal(r.status,'within-supported-domain',`Unexpected state n=${n}, Te=${te}, B=${b}; magnetization=${unmagnetized}`);
 }
 const c=DEFAULT_DOUBLEWELL,r=inspectDoublewellRegime(c,[]).reference;
 const orbitScales=c.species.map(s=>{
  const omega=s.chargeState*E_CHARGE*c.magneticT/(s.massU*AMU);
  const thermalSpeed=Math.sqrt(2*E_CHARGE*c.ionTemperatureEV/(s.massU*AMU));
  return {massU:s.massU,gyroAngularFrequencyS:omega,thermalGyroradiusM:thermalSpeed/omega,
   rhoOverDeviceRadius:thermalSpeed/omega/c.radius,gyroperiodsPerRun:omega*c.duration/(2*Math.PI)};
 });
 const bohmBenchmarkM2S=6e6*c.electronTemperatureEV/(c.magneticT*1e4)*1e-4;
 console.log('V29_DEFAULT_SCALES',JSON.stringify({debyeM:r.debyeM,debyeOverRadius:r.debyeM/c.radius,
  debyePopulation:r.debyePopulation,coupling:r.maxCoupling,estimatedCoulombLog:r.minEstimatedCoulombLog,
  encounterMagnetization:r.maxEncounterMagnetization,orbitScales,bohmBenchmarkM2S,
  assumedBohmRMSM:Math.sqrt(4*bohmBenchmarkM2S*c.duration),
  assumedBohmRMSOverSource:Math.sqrt(4*bohmBenchmarkM2S*c.duration)/c.sourceRadius}));
});

test('API-only dilute case: passing screened encounters do not prove a self-consistent plasma field',()=>{
 const c={...DEFAULT_DOUBLEWELL,radius:.05,sourceRadius:.025,voltage:200,quadraticShape:2,
  densityM3:1e13,electronTemperatureEV:1,magneticT:.01,dt:25e-9,duration:100e-9,particlesPerSpecies:128};
 validateDoublewell(c);
 const regime=inspectDoublewellRegime(c,[{densityM3:c.densityM3,ions:[...thermal(40,5),...thermal(84,5)]}]);
 assert.equal(regime.status,'within-supported-domain');
 // Poisson: rho=-eps0 laplacian(phi)=e(ni-ne), no other volume charge.
 // Quartic phi=V[(r/a)^4-k(r/a)^2], hence laplacian(phi)|axis=-4kV/a^2.
 const axisLaplacian=-4*c.quadraticShape*c.voltage/c.radius**2;
 const neededElectronDensity=c.densityM3+EPSILON_0*axisLaplacian/E_CHARGE;
 assert.ok(neededElectronDensity<0);
 // The UI's minimum density is 1e16: this witness is deliberately API-only.
 assert.ok(1e16+EPSILON_0*axisLaplacian/E_CHARGE>0);
 // Independently reconstruct the Cartesian Laplacian from the public potential.
 const h=1e-6,phi0=quarticPotential([0,0,0],c);
 const fd=([0,1] as const).reduce((sum,k)=>{
  const p=[0,0,0] as Vec,m=[0,0,0] as Vec;p[k]=h;m[k]=-h;
  return sum+(quarticPotential(p,c)-2*phi0+quarticPotential(m,c))/h**2;
 },0);
 assert.ok(Math.abs(fd/axisLaplacian-1)<1e-8);
 const result=simulateDoublewell(c);
 assert.equal(result.regimeHistory[0].assessment.reference.reasons.length,0);
 assert.ok(result.history.length>0);
 console.log('V29_POISSON_WITNESS',JSON.stringify({radiusM:c.radius,voltageV:c.voltage,quadraticShape:c.quadraticShape,
  densityM3:c.densityM3,axisLaplacianVPerM2:axisLaplacian,requiredElectronDensityM3:neededElectronDensity,
  debyeM:regime.reference.debyeM,debyePopulation:regime.reference.debyePopulation,
  coupling:regime.reference.maxCoupling,coulombLog:regime.reference.minEstimatedCoulombLog,
  encounterMagnetization:regime.reference.maxEncounterMagnetization,screenedEncounterStatus:regime.status,
  engineRegimeStatus:result.regimeSummary.status}));
});

test('III failure estimates disclose the absence of coupled transport and energy evolution',()=>{
 assert.equal(section3Coverage.length,11);
 assert.ok(section3Coverage.every(issue=>['partial','diagnostic','omitted'].includes(issue.status)));
 for(const section of ['III D','III H','III I'])assert.equal(section3Coverage.find(x=>x.subsection===section)!.status,'omitted');
 const a=failureBudgets(DEFAULT_FAILURE_BUDGETS);
 const b=failureBudgets({...DEFAULT_FAILURE_BUDGETS,neutralDensityM3:1e21,coolingCoefficientWM3:1e-27});
 close(a.budgets.noChargeExchangeProbability,Math.exp(-.06));
 close(a.budgets.diffusionRMSM,Math.sqrt(.0008));
 assert.ok(b.budgets.noChargeExchangeProbability<1e-20);
 assert.ok(b.budgets.radiatedEVPerInitialIon>1e4);
 assert.match(b.assumptions.join(' '),/not a computed plasma temperature drop/);
 assert.match(b.assumptions.join(' '),/do not modify/);
});

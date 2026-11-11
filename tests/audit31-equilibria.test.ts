import test from 'node:test';
import assert from 'node:assert/strict';
import {centrifuge} from '../src/centrifuge.js';
import {gaussianCentrifuge} from '../src/gaussian-centrifuge.js';
import {magneticCentrifuge} from '../src/magnetic-centrifuge.js';
import {solveEquilibrium} from '../src/equilibrium-model.js';
import {centrifugeDiagnostics} from '../src/centrifuge-diagnostics.js';
import {transport,transitCDF,stepIonizationRate,DEFAULT_TRANSPORT} from '../src/transport.js';
import {geometry,DEFAULT_GEOMETRY} from '../src/geometries.js';

const U=1.66053906660e-27,E=1.602176634e-19,MU=1.25663706127e-6;
const close=(a:number,b:number,rtol=1e-9,atol=1e-13)=>assert.ok(
 Math.abs(a-b)<=atol+rtol*Math.max(Math.abs(a),Math.abs(b)),`${a} versus ${b}`);
const base={radius:.2,rotationRadS:24000,ionTemperatureEV:4,electronTemperatureEV:7,
 magneticT:.08,densityWidthM:.09,axisDensityM3:2e18,bins:800,
 species:[{massU:20,chargeState:2,axisFraction:.65},{massU:120,chargeState:2,axisFraction:.35}]};

test('unequal-charge corotation obeys potential-free electrochemical force differences',()=>{
 const c={...base,species:[{massU:9,chargeState:1,axisFraction:2e-6},
  {massU:30,chargeState:3,axisFraction:.4},{massU:140,chargeState:2,axisFraction:.599998}]};
 const r=centrifuge(c);
 for(const p of r.profiles){
  const logs=p.ionDensities.map((n,i)=>Math.log(n/r.species[i].axisFraction));
  for(let i=1;i<3;i++){
   const expected=(c.species[i].massU/c.species[i].chargeState-c.species[0].massU/c.species[0].chargeState)
    *U*(c.rotationRadS*p.radius)**2/(2*E*c.ionTemperatureEV);
   close(logs[i]/c.species[i].chargeState-logs[0]/c.species[0].chargeState,expected,2e-12);
  }
  close(p.electronDensity,p.ionDensities.reduce((s,n,i)=>s+c.species[i].chargeState*n,0),2e-13);
 }
});

test('coupled magnetic equilibrium satisfies independent integrated centrifugal stress and both field boundaries',()=>{
 for(const sign of [-1,1]){
  const c={...base,magneticT:sign*base.magneticT,magneticBoundary:'axis' as const};
  const axis=magneticCentrifuge(c),g=axis.gaussianProfiles,dr=c.radius/c.bins;
  const integrand=(j:number)=>g[j].radius*g[j].totalIonDensityM3*c.rotationRadS**2
   *axis.profiles[j].ionDensities.reduce((s,n,i)=>s+n*c.species[i].massU*U,0)
   /axis.profiles[j].ionDensities.reduce((s,n)=>s+n,0);
  let centrifugal=0;
  for(let j=0;j<=c.bins;j++)centrifugal+=integrand(j)*(j===0||j===c.bins?1:j%2?4:2)*dr/3;
  const pressure=(j:number)=>g[j].magneticFieldT**2/(2*MU)
   +g[j].totalIonDensityM3*E*(c.ionTemperatureEV+2*c.electronTemperatureEV);
  close(pressure(c.bins)-pressure(0),centrifugal,2e-8);
  const wall=magneticCentrifuge({...c,magneticT:axis.wallMagneticT,magneticBoundary:'wall'});
  for(let j=0;j<g.length;j++){
   close(wall.gaussianProfiles[j].magneticFieldT,g[j].magneticFieldT,1e-12);
   close(wall.gaussianProfiles[j].laboratoryPotentialV,g[j].laboratoryPotentialV,1e-12);
  }
 }
});

test('magnetic Ampere and laboratory-potential finite differences converge independently',()=>{
 const errors=[100,200,400].map(bins=>{
  const r=magneticCentrifuge({...base,bins,magneticBoundary:'axis'}),h=base.radius/bins;
  let ampere=0,potential=0;
  for(let j=1;j<bins;j++){
   const lo=r.gaussianProfiles[j-1],p=r.gaussianProfiles[j],hi=r.gaussianProfiles[j+1];
   ampere=Math.max(ampere,Math.abs((hi.magneticFieldT-lo.magneticFieldT)/(2*h)+MU*p.currentDensityAM2));
   potential=Math.max(potential,Math.abs((hi.laboratoryPotentialV-lo.laboratoryPotentialV)/(2*h)+p.electricFieldVM));
   close(p.currentDensityAM2,2*E*p.totalIonDensityM3*(p.ionVelocityMS-p.electronVelocityMS),2e-12);
  }
  return {ampere,potential};
 });
 for(const key of ['ampere','potential'] as const){
  assert.ok(errors[0][key]/errors[1][key]>3.8,JSON.stringify(errors));
  assert.ok(errors[1][key]/errors[2][key]>3.8,JSON.stringify(errors));
 }
});

test('bulk composition is independently integrated and respects Gaussian magnetic boundary inversion',()=>{
 for(const target of [.01,.5,.99])for(const closure of ['corotating','gaussian','magnetic-gaussian'] as const){
  const c={...base,bins:400,closure,compositionBoundary:'bulk' as const,bulkFractionA:target,magneticBoundary:'wall' as const};
  const result=solveEquilibrium(c),sum=[0,0],p=result.profiles,a=c.radius;
  // Independently integrate linear density in each physical radial cell.
  for(let j=1;j<p.length;j++)for(let i=0;i<2;i++){
   const x=p[j-1].radius,y=p[j].radius,h=y-x,n0=p[j-1].ionDensities[i],n1=p[j].ionDensities[i];
   sum[i]+=h/(3*a*a)*((2*x+y)*n0+(x+2*y)*n1);
  }
  close(sum[0]/(sum[0]+sum[1]),target,2e-10);
  close(centrifugeDiagnostics(result).bulkNumberFractions[0]!,target,2e-10);
 }
});

test('imposed and coupled Gaussian closures retain the same composition but different magnetic stress',()=>{
 const imposed=gaussianCentrifuge(base),coupled=magneticCentrifuge({...base,magneticBoundary:'axis'});
 assert.deepEqual(imposed.profiles,coupled.profiles);
 assert.notEqual(imposed.gaussianProfiles.at(-1)!.currentDensityAM2,coupled.gaussianProfiles.at(-1)!.currentDensityAM2);
 assert.ok(coupled.wallMagneticT>coupled.axisMagneticT);
 assert.ok(coupled.maxRelativeMagneticPerturbation>0);
});

test('ionization step surrogate matches independent electron-energy quadrature across thresholds',()=>{
 for(const x of [0,.2,1,5,20]){
  const temperature=3.7,sigma=2e-20,intervals=20000,h=80/intervals;
  let integral=0;
  for(let j=0;j<=intervals;j++){
   const energy=x+j*h;
   integral+=energy*Math.exp(-energy)*(j===0||j===intervals?1:j%2?4:2)*h/3;
  }
  const reference=sigma*Math.sqrt(8*E*temperature/(Math.PI*9.1093837139e-31))*integral;
  close(stepIonizationRate(temperature,x*temperature,sigma),reference,3e-10,1e-30);
 }
});

test('transit convolution matches independent energy-packet integration and mass scaling',()=>{
 const m=84,L=2.8,energy=20,spread=.35,pulse=2e-5,N=40000;
 const center=Math.sqrt(m*U*L*L/(2*E*energy));
 for(const t of [center*.8,center,center+Math.min(pulse,center*.2),center+pulse,center*1.4+pulse]){
  let expected=0;
  for(let j=0;j<N;j++){
   const e=energy*(1-spread+2*spread*(j+.5)/N),flight=Math.sqrt(m*U*L*L/(2*E*e));
   expected+=Math.max(0,Math.min(1,(t-flight)/pulse))/N;
  }
  close(transitCDF(t,m,L,energy,spread,pulse),expected,2e-7);
 }
 const a=transport('diffusion',{...DEFAULT_TRANSPORT,collisionModel:'coulomb-heavy-light'});
 const values=a.metrics.filter(m=>m.label.includes('diffusion coefficient')).map(m=>m.value);
 close(values[0],values[1],1e-14);
});

test('signed quartic global minimum beats an independent dense physical-domain scan regardless of plot crop',()=>{
 for(const voltage of [-200,-2,0,2,200])for(const quadraticShape of [-3,-1,1,3]){
  const c={...DEFAULT_GEOMETRY,radius:.2,magneticT:.06,canonicalMomentum:0,voltage,quadraticShape};
  const full=geometry('doublewell',c),cropped=geometry('doublewell',{...c,plotInnerFraction:.85});
  for(const [label,mass,z]of [['A',c.massA,c.chargeA],['B',c.massB,c.chargeB]] as const){
   const minimum=full.metrics.find(m=>m.label===`${label} minimum radius`)!.value;
   assert.equal(cropped.metrics.find(m=>m.label===`${label} minimum radius`)!.value,minimum);
   assert.ok(minimum>=0&&minimum<=c.radius);
   const energy=(r:number)=>z*z*E*c.magneticT**2*r*r/(8*mass*U)
    +z*voltage*((r/c.radius)**4-quadraticShape*(r/c.radius)**2);
   let sampledMinimum=Infinity;
   for(let j=0;j<=10000;j++)sampledMinimum=Math.min(sampledMinimum,energy(c.radius*j/10000));
   assert.ok(energy(minimum)<=sampledMinimum+1e-10,
    JSON.stringify({voltage,quadraticShape,label,minimum,sampledMinimum,actual:energy(minimum)}));
  }
 }
});

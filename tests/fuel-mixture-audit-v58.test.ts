import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {DEFAULT_FUEL_THERMAL,simulateFuelOperation,type FuelOperation} from '../src/fuel-operation.js';
import {sampleFuelTransport,type FuelTransportResult,type FuelTransportSnapshot} from '../src/fuel-transport.js';
import {advanceFuelGasMass} from '../src/fuel-gas.js';

// Independent ideal-gas thermodynamic formulae. No production gas/thermal helper
// is used to reconstruct energy, entropy, pressure, inertia or face transport.
const K=1.380649e-23,U=1.66053906892e-27;
const sum=(a:readonly number[])=>a.reduce((x,y)=>x+y,0);
const last=<T>(a:readonly T[])=>a[a.length-1];
const config={...DEFAULT_FUEL_CENTRIFUGE,pair:'dt' as const,lightFraction:.4,currentA:.04,collisionHz:30,
 ionFraction:.05,dragHz:.7,pressurePa:8,gasK:500,linerK:500,durationS:.2,radialDiffusivityM2S:.008};
const thermal={...DEFAULT_FUEL_THERMAL,enabled:true,gasWallWK:0,coolingWK:0,coolantK:500,
 spatial:{material:'tungsten' as const,thicknessM:.001,cells:8},gas:{conductivityWMK:.03}};
const operation:FuelOperation={schemaVersion:1,events:[{timeS:.075,currentA:0},{timeS:.15,currentA:.025}],thermal};
const volume=Math.PI*config.radiusM**2*config.lengthM;
const number=config.pressurePa*volume/(K*config.gasK);
const fractions=[config.lightFraction,1-config.lightFraction];
function close(a:number,b:number,scale:number,tol=2e-9){
 assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=tol*Math.max(Math.abs(scale),1e-300),`${a} != ${b}; scale ${scale}`);
}
function counts(s:FuelTransportSnapshot){return [s.lightMass,s.heavyMass].map((row,species)=>row.map(p=>p*fractions[species]));}
function entropy(s:FuelTransportSnapshot){
 const ns=counts(s),t=s.thermal!.gas!.temperatureK,dv=volume/t.length;
 return sum(ns.flatMap(row=>row.map((p,i)=>p>0?p*(1.5*Math.log(t[i])-Math.log(p/dv)):0)));
}
function tangentEntropy(a:FuelTransportSnapshot,b:FuelTransportSnapshot){
 const before=counts(a),after=counts(b),g=b.thermal!.gas!,dv=volume/g.temperatureK.length;
 return sum(g.cellEnergyJ.map((e,i)=>(e-a.thermal!.gas!.cellEnergyJ[i])/(K*number*g.temperatureK[i])))+
  sum(after.flatMap((row,species)=>row.map((p,i)=>(p-before[species][i])*(1.5*Math.log(g.temperatureK[i])-Math.log(p/dv)-2.5))));
}
function faceEntropy(a:FuelTransportSnapshot,b:FuelTransportSnapshot,masses:readonly number[]){
 const before=counts(a),after=counts(b),t=b.thermal!.gas!.temperatureK,n=t.length;
 let total=0,minimum=Infinity;
 for(let species=0;species<2;species++){
  let flux=0;
  for(let i=0;i<n-1;i++){
   flux+=before[species][i]-after[species][i];
   const z=masses[species]*b.neutralRadS**2*config.radiusM**2/(2*K*n)*(.5/t[i]+.5/t[i+1]);
   const force=Math.log(after[species][i]*t[i]/(after[species][i+1]*t[i+1]))+z;
   const production=flux*force;minimum=Math.min(minimum,production);total+=production;
  }
 }
 return {total,minimum};
}

test('independent spatial mixture entropy, species transport and rotor work close at every accepted knot',()=>{
 const rotor=simulateFuelCentrifuge(config),model=simulateFuelOperation(rotor,operation,{cells:12,steps:128});
 const states=model.checkpoints??model.snapshots,masses=rotor.pair.masses.map(m=>m*U),initial=states[0].thermal!;
 let maximumRedistribution=0,minimumProduction=Infinity,minimumEntropyStep=Infinity;
 for(let j=0;j<states.length;j++){
  const s=states[j] as FuelTransportSnapshot,g=s.thermal!.gas!,ns=counts(s),n=g.temperatureK.length,e=s.energy;
  assert.equal(n,12);assert.ok(g.temperatureK.every(t=>Number.isFinite(t)&&t>0));
  close(sum(s.lightMass),1,1,2e-10);close(sum(s.heavyMass),1,1,2e-10);
  for(let i=0;i<n;i++){
   const particles=number*(ns[0][i]+ns[1][i]);
   close(g.cellEnergyJ[i],1.5*K*particles*g.temperatureK[i],g.cellEnergyJ[i],2e-12);
   close(g.pressurePa[i],K*particles*g.temperatureK[i]/(volume/n),g.pressurePa[i],2e-12);
   close(sum(g.speciesEnergyJ.map(row=>row[i])),g.cellEnergyJ[i],g.cellEnergyJ[i],2e-12);
   for(let species=0;species<2;species++)close(g.speciesEnergyJ[species][i],1.5*K*number*ns[species][i]*g.temperatureK[i],g.cellEnergyJ[i],2e-12);
  }
  close(e.kineticJ+s.thermal!.gasEnergyJ+s.thermal!.linerEnergyJ+e.numericalDissipationJ,
   initial.gasEnergyJ+initial.linerEnergyJ+e.driveWorkJ+s.thermal!.ohmicEnergyJ-s.thermal!.coolingEnergyJ,
   initial.gasEnergyJ+initial.linerEnergyJ+Math.abs(e.driveWorkJ));
  close(s.ionAngularMomentumKgM2S+s.neutralAngularMomentumKgM2S+s.angularMomentum.dragImpulseKgM2S,
   s.angularMomentum.driveImpulseKgM2S,Math.abs(s.angularMomentum.driveImpulseKgM2S),2e-10);
  if(j===0)continue;
  const a=states[j-1] as FuelTransportSnapshot,old=counts(a),dI=number*config.radiusM**2*sum(ns.flatMap((row,species)=>row.map((p,i)=>masses[species]*(p-old[species][i])*(i+.5)/n)));
  const work=.5*s.neutralRadS**2*dI,recorded=e.redistributionWorkJ-a.energy.redistributionWorkJ;
  maximumRedistribution=Math.max(maximumRedistribution,Math.abs(recorded));
  close(recorded,work,Math.max(Math.abs(work),initial.gasEnergyJ),2e-10);
  const ds=entropy(s)-entropy(a),bound=tangentEntropy(a,s),face=faceEntropy(a,s,masses);
  minimumEntropyStep=Math.min(minimumEntropyStep,ds);minimumProduction=Math.min(minimumProduction,face.minimum);
  assert.ok(face.minimum>=-2e-12,`SG face entropy production negative: ${face.minimum}`);
  assert.ok(ds>=-2e-10,`Isolated gas entropy decreased: ${ds}`);
  assert.ok(ds-bound>=-2e-10,`Ideal-gas entropy concavity violated: ${ds-bound}`);
  assert.ok(bound-face.total>=-2e-9,`Energy/enthalpy/centrifugal work missed the entropy lower bound: ${bound-face.total}`);
 }
 assert.ok(maximumRedistribution>1e-9,'Must exercise rotor work, rather than a static zero-rotation limit.');
 console.log('v58 independent entropy/work audit',JSON.stringify({knots:states.length,maximumRedistribution,minimumProduction,minimumEntropyStep}));
});

function commonHistoryDistance(a:FuelTransportResult,b:FuelTransportResult){
 let error=0;
 for(let k=0;k<=24;k++){
  const time=config.durationS*k/24,aa=sampleFuelTransport(a,time),bb=sampleFuelTransport(b,time);
  const radialCDF=(p:number[],y:number)=>{const index=y*p.length,i=Math.min(p.length-1,Math.floor(index));return sum(p.slice(0,i))+(index-i)*p[i];};
  const gasMoment=(s:FuelTransportSnapshot,power:number)=>sum(s.thermal!.gas!.cellEnergyJ.map((u,i)=>u*((i+.5)/s.lightMass.length)**power))/(K*number*config.gasK);
  for(let i=0;i<=16;i++)for(const key of ['lightMass','heavyMass'] as const)error=Math.max(error,Math.abs(radialCDF(aa[key],i/16)-radialCDF(bb[key],i/16)));
  for(const power of [0,1,2])error=Math.max(error,Math.abs(gasMoment(aa,power)-gasMoment(bb,power)));
  error=Math.max(error,Math.abs(aa.neutralRadS-bb.neutralRadS)/Math.max(1,Math.abs(bb.neutralRadS)),Math.abs(aa.ionRadS-bb.ionRadS)/Math.max(1,Math.abs(bb.ionRadS)));
 }
 return error;
}

test('independent whole-history space and time refinement reduces distribution, thermal moments and rotor errors',()=>{
 const rotor=simulateFuelCentrifuge(config);
 // The early ion/neutral spin-up is the limiting relative-error observable.
 // Keep those early common-time samples and refine time, rather than weakening
 // the 3% gate or accepting a conserved but under-resolved trajectory.
 const temporal=[256,512,1024].map(steps=>simulateFuelOperation(rotor,operation,{cells:12,steps}));
 const timeErrors=[commonHistoryDistance(temporal[0],temporal[2]),commonHistoryDistance(temporal[1],temporal[2])];
 assert.ok(timeErrors[1]<.8*timeErrors[0],`Whole-history timestep refinement failed: ${timeErrors}`);
 const spatial=[8,16,32].map(cells=>simulateFuelOperation(rotor,operation,{cells,steps:1024}));
 const spaceErrors=[commonHistoryDistance(spatial[0],spatial[2]),commonHistoryDistance(spatial[1],spatial[2])];
 assert.ok(spaceErrors[1]<.8*spaceErrors[0],`Whole-history spatial refinement failed: ${spaceErrors}`);
 assert.ok(timeErrors[1]<.03&&spaceErrors[1]<.03,`Unresolved conditional case: ${JSON.stringify({timeErrors,spaceErrors})}`);
 console.log('v58 independent whole-history refinement',JSON.stringify({timeErrors,spaceErrors,metric:'max common-time CDF / normalized thermal moment / rotor relative difference'}));
});

test('independent nonisothermal centrifugal hydrostatics approach the continuum power-law equilibrium',()=>{
 // T(y)=T0(1+a y), dp/dy=(mΩ²R²/2kBT)p gives
 // n(y) proportional to (1+a y)^[mΩ²R²/(2kBT0 a)−1].
 // This analytic continuum solution does not reuse the SG face quadrature.
 const t0=400,a=1.2,m=3*U,omega=8000,radius=.12,exponent=m*omega**2*radius**2/(2*K*t0*a)-1;
 const errors=[16,32,64].map(n=>{
  const temperatures=Array.from({length:n},(_,i)=>t0*(1+a*(i+.5)/n));
  const raw=temperatures.map(t=>(t/t0)**exponent),exact=raw.map(v=>v/sum(raw));
  const actual=advanceFuelGasMass(Array(n).fill(1/n),temperatures,m,omega,radius,.02,1e8).mass;
  return sum(actual.map((v,i)=>Math.abs(v-exact[i])));
 });
 assert.ok(errors[1]<.35*errors[0]&&errors[2]<.35*errors[1],`Centrifugal pressure-law spatial consistency failed: ${errors}`);
 assert.ok(errors[2]<2e-5,`Nonisothermal hydrostatic profile unresolved: ${errors}`);
 console.log('v58 independent nonisothermal hydrostatic L1 errors',JSON.stringify(errors));
});

/** Independent direct-flux method-of-lines oracle. Explicit RK4 evolves species,
 * cell internal energies and two rotor momenta, with no production time-step,
 * temperature inversion, face-temperature or rotor helper. The wall is insulated
 * from gas, so its separately evolving drag heat cannot influence this system. */
function directOracle(steps:number){
 const n=8,c=config,x=c.lightFraction,masses=[2.014101778*U,3.016049282*U],meanMass=x*masses[0]+(1-x)*masses[1];
 const ii=.5*number*meanMass*c.radiusM**2*c.ionFraction/(1-c.ionFraction),gamma=ii*c.collisionHz;
 // Cell temperatures are equal-volume averages on uniform y=r²/R².
 // Fourier power is -4πLκ y dT/dy. A face at y=f/n and
 // center spacing 1/n therefore has conductance 4πLκ f.
 const links=Array.from({length:n-1},(_,i)=>4*Math.PI*c.lengthM*thermal.gas.conductivityWMK*(i+1));
 const oldEnergy=1.5*number*K*c.gasK/n;
 let s=[...Array(n).fill(1/n),...Array(n).fill(1/n),...Array(n).fill(oldEnergy),0,0];
 function derivative(v:number[],current:number){
  const d=Array<number>(v.length).fill(0),counts=Array.from({length:n},(_,i)=>number*(x*v[i]+(1-x)*v[n+i]));
  const t=counts.map((ns,i)=>v[2*n+i]/(1.5*K*ns));
  const inertia=number*c.radiusM**2*sum(Array.from({length:n},(_,i)=>(x*masses[0]*v[i]+(1-x)*masses[1]*v[n+i])*(i+.5)/n));
  const wi=v[3*n]/ii,wn=v[3*n+1]/inertia,slip=wi-wn;
  const heat=gamma*slip**2+current**2*Math.log(1/c.driveInnerFraction)/(2*Math.PI*c.lengthM*c.conductivitySm);
  for(let i=0;i<n;i++)d[2*n+i]=heat*counts[i]/number;
  for(let i=0;i<n-1;i++){
   const fluxes=masses.map((m,species)=>{
    const z=m*wn**2*c.radiusM**2/(2*K*n)*(.5/t[i]+.5/t[i+1]);
    const b=Math.abs(z)<1e-6?1-z/2+z*z/12:z/Math.expm1(z);
    const rate=4*c.radialDiffusivityM2S/c.radiusM**2*(i+1)*n*(.5/t[i]+.5/t[i+1]);
    const flux=rate*((b+z)*t[i]*v[species*n+i]-b*t[i+1]*v[species*n+i+1]);
    d[species*n+i]-=flux;d[species*n+i+1]+=flux;return flux;
   });
   const faceT=t[i]===t[i+1]?t[i]:t[i+1]*Math.log1p((t[i+1]-t[i])/t[i])/((t[i+1]-t[i])/t[i]);
   const enthalpy=2.5*K*number*(x*fluxes[0]+(1-x)*fluxes[1])*faceT;
   const conduction=links[i]*(t[i]-t[i+1]);
   const work=.5*wn**2*c.radiusM**2/n*number*(x*masses[0]*fluxes[0]+(1-x)*masses[1]*fluxes[1]);
   d[2*n+i]+=-enthalpy-conduction+work/2;d[2*n+i+1]+=enthalpy+conduction+work/2;
  }
  d[3*n]=current*c.magneticT*c.radiusM**2*(1-c.driveInnerFraction**2)/2-gamma*slip;
  d[3*n+1]=gamma*slip-c.dragHz*v[3*n+1];return d;
 }
 let time=0,event=0,current=c.currentA;
 const shifted=(v:number[],d:number[],h:number)=>v.map((a,i)=>a+h*d[i]);
 for(let step=1;step<=steps;step++){
  const target=step===steps?c.durationS:c.durationS*step/steps;
  while(time<target){
   while(event<operation.events.length&&operation.events[event].timeS<=time)current=operation.events[event++].currentA;
   const endpoint=Math.min(target,operation.events[event]?.timeS??target),h=endpoint-time;
   const a=derivative(s,current),b=derivative(shifted(s,a,h/2),current),cc=derivative(shifted(s,b,h/2),current),d=derivative(shifted(s,cc,h),current);
   s=s.map((v,i)=>v+h*(a[i]+2*b[i]+2*cc[i]+d[i])/6);time=endpoint;
  }
 }
 assert.ok(s.every(Number.isFinite)&&s.slice(0,3*n).every(v=>v>0),'Independent RK4 oracle left its stable physical domain.');
 return s;
}

test('independent direct-flux RK4 validates finite-time coupled species energy and rotor evolution',()=>{
 const n=8,reference=directOracle(16384),half=directOracle(8192),energyScale=1.5*number*K*config.gasK;
 const distance=(v:readonly number[])=>sum(v.slice(0,2*n).map((p,i)=>Math.abs(p-reference[i])))+
  sum(v.slice(2*n,3*n).map((u,i)=>Math.abs(u-reference[2*n+i])))/energyScale+
  Math.abs(v[3*n]-reference[3*n])/Math.abs(reference[3*n])+Math.abs(v[3*n+1]-reference[3*n+1])/Math.abs(reference[3*n+1]);
 assert.ok(distance(half)<1e-7,`RK4 oracle is not time-converged: ${distance(half)}`);
 const rotor=simulateFuelCentrifuge(config),errors=[128,256,512].map(steps=>{
  const s=last(simulateFuelOperation(rotor,operation,{cells:n,steps}).snapshots);
  return distance([...s.lightMass,...s.heavyMass,...s.thermal!.gas!.cellEnergyJ,s.ionAngularMomentumKgM2S,s.neutralAngularMomentumKgM2S]);
 });
 assert.ok(errors[1]<.7*errors[0]&&errors[2]<.7*errors[1],`BE did not approach independent time integrator: ${errors}`);
 assert.ok(errors[2]<.03,`Coupled endpoint differs from independent direct-flux evolution: ${errors}`);
 console.log('v58 independent coupled RK4 errors',JSON.stringify({oracleSelfError:distance(half),errors}));
});

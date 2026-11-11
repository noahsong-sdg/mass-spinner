import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,rotorResponse,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {advanceFuelCoupledStep,sampleFuelTransport,simulateFuelTransport} from '../src/fuel-transport.js';

const U=1.66053906892e-27,K=1.380649e-23;
const total=(values:readonly number[])=>values.reduce((a,b)=>a+b,0);
const l1=(a:readonly number[],b:readonly number[])=>total(a.map((value,i)=>Math.abs(value-b[i])));
const last=<T>(values:readonly T[])=>values[values.length-1];
const config={...DEFAULT_FUEL_CENTRIFUGE,currentA:.06,collisionHz:40,ionFraction:.05,dragHz:.7,durationS:.4};
type Rotor=ReturnType<typeof simulateFuelCentrifuge>;

/** Independent method-of-lines oracle: direct face flux divergence and explicit
 * RK4 on cell inventories and angular momenta. It does not call the production
 * radial step, nonlinear coupling step, interpolation or inertia helper.
 */
function explicitOracle(rotor:Rotor,n:number,steps:number){
 const c=rotor.config,m=rotor.mechanics,x=c.lightFraction,masses=rotor.pair.masses.map(v=>v*U);
 const weight=x*masses[0]/(x*masses[0]+(1-x)*masses[1]);
 const initial=Array(2*n+2).fill(0);initial.fill(1/n,0,2*n);
 const dt=c.durationS/steps,rate=4*c.radialDiffusivityM2S/c.radiusM**2;
 const inertia=(state:number[])=>2*m.nn*total(Array.from({length:n},(_,i)=>(weight*state[i]+(1-weight)*state[n+i])*(i+.5)/n));
 const derivative=(state:number[])=>{
  const out=Array(state.length).fill(0),ii=m.ii,nn=inertia(state),ion=state[2*n]/ii,neutral=state[2*n+1]/nn;
  for(let species=0;species<2;species++){
   const z=masses[species]*neutral**2*c.radiusM**2/(2*K*c.gasK*n);
   const inward=z===0?1:z/Math.expm1(z),outward=inward+z;
   for(let face=1;face<n;face++){
    const transfer=rate*face*n*(outward*state[species*n+face-1]-inward*state[species*n+face]);
    out[species*n+face-1]-=transfer;out[species*n+face]+=transfer;
   }
  }
  const friction=m.gamma*(ion-neutral);
  out[2*n]=m.torque-friction;out[2*n+1]=friction-c.dragHz*state[2*n+1];
  return out;
 };
 let state=initial;
 for(let step=0;step<steps;step++){
  const a=derivative(state),b=derivative(state.map((value,i)=>value+dt*a[i]/2));
  const cc=derivative(state.map((value,i)=>value+dt*b[i]/2)),d=derivative(state.map((value,i)=>value+dt*cc[i]));
  state=state.map((value,i)=>value+dt*(a[i]+2*b[i]+2*cc[i]+d[i])/6);
 }
 assert.ok(state.every(Number.isFinite),'Independent explicit oracle left its finite domain.');
 assert.ok(state.slice(0,2*n).every(value=>value>=0),'Independent explicit oracle needs a smaller stable time step.');
 return {lightMass:state.slice(0,n),heavyMass:state.slice(n,2*n),ionRadS:state[2*n]/m.ii,neutralRadS:state[2*n+1]/inertia(state)};
}
function discrepancy(a:{lightMass:number[];heavyMass:number[];ionRadS:number;neutralRadS:number},b:typeof a){
 return l1(a.lightMass,b.lightMass)+l1(a.heavyMass,b.heavyMass)+Math.abs(a.ionRadS-b.ionRadS)/Math.max(1,Math.abs(b.ionRadS))+
  Math.abs(a.neutralRadS-b.neutralRadS)/Math.max(1,Math.abs(b.neutralRadS));
}
function coarsen(values:number[],n:number){
 const factor=values.length/n;assert.ok(Number.isInteger(factor));
 return Array.from({length:n},(_,i)=>total(values.slice(i*factor,(i+1)*factor)));
}

test('independent endpoint and interpolation budgets use transported gas inertia and conserved angular momenta',()=>{
 const rotor=simulateFuelCentrifuge(config),model=simulateFuelTransport(rotor,{cells:32,steps:256}),m=rotor.mechanics;
 const x=config.lightFraction,[ml,mh]=rotor.pair.masses,weight=x*ml/(x*ml+(1-x)*mh);
 const times=[...model.snapshots.map(p=>p.timeS),.000031,.02731,.13721,.39891];
 for(const time of times){
  const state=sampleFuelTransport(model,time),n=state.lightMass.length;
  const inertia=2*m.nn*total(state.lightMass.map((mass,i)=>(weight*mass+(1-weight)*state.heavyMass[i])*(i+.5)/n));
  assert.ok(Math.abs(state.neutralInertiaKgM2/inertia-1)<2e-12);
  const actual=m.ii*state.ionRadS+inertia*state.neutralRadS;
  const expected=m.torque*time-state.angularMomentum.dragImpulseKgM2S;
  assert.ok(Math.abs(actual-expected)<1e-11*Math.max(m.torque*config.durationS,1e-30),`Angular momentum budget at ${time}: ${actual} vs ${expected}`);
  assert.ok(Math.abs(state.ionAngularMomentumKgM2S-m.ii*state.ionRadS)<1e-13*Math.max(Math.abs(actual),1e-30));
  assert.ok(Math.abs(state.neutralAngularMomentumKgM2S-inertia*state.neutralRadS)<1e-13*Math.max(Math.abs(actual),1e-30));
 }
 const a=model.snapshots[5],b=model.snapshots[6],t=(a.timeS+b.timeS)/2,mid=sampleFuelTransport(model,t);
 const ionL=(a.ionAngularMomentumKgM2S+b.ionAngularMomentumKgM2S)/2;
 const neutralL=(a.neutralAngularMomentumKgM2S+b.neutralAngularMomentumKgM2S)/2;
 assert.ok(Math.abs(mid.ionAngularMomentumKgM2S-ionL)<1e-13*Math.max(Math.abs(ionL),1e-30));
 assert.ok(Math.abs(mid.neutralAngularMomentumKgM2S-neutralL)<1e-13*Math.max(Math.abs(neutralL),1e-30));
});

test('independent torque-free redistribution conserves each rotor momentum and reduces neutral angular speed',()=>{
 const rotor=simulateFuelCentrifuge(config),m=rotor.mechanics,n=32,omega=10000;
 const params={radiusM:config.radiusM,gasK:config.gasK,lightFraction:config.lightFraction,diffusivityM2S:config.radialDiffusivityM2S,
  speciesMassKg:rotor.pair.masses.map(value=>value*U),mechanics:{...m,gamma:0,drag:0,torque:0}};
 const initial={lightMass:Array(n).fill(1/n),heavyMass:Array(n).fill(1/n),ionAngularMomentumKgM2S:m.ii*omega,neutralAngularMomentumKgM2S:m.nn*omega};
 const next=advanceFuelCoupledStep(params,initial,.05);
 assert.equal(next.ionAngularMomentumKgM2S,initial.ionAngularMomentumKgM2S);
 assert.equal(next.neutralAngularMomentumKgM2S,initial.neutralAngularMomentumKgM2S);
 assert.ok(next.neutralInertiaKgM2>m.nn,'Outward transport must increase gas inertia.');
 assert.ok(next.neutralRadS<omega,'At fixed gas angular momentum, outward transport must slow the gas.');
 assert.equal(next.driveImpulseKgM2S,0);assert.equal(next.dragImpulseKgM2S,0);
});

test('independent undriven thermodynamics gate: rotational plus ideal-mixture free energy decreases',()=>{
 const rotor=simulateFuelCentrifuge(config),m=rotor.mechanics,n=32,x=config.lightFraction,omega=10000;
 const masses=rotor.pair.masses.map(value=>value*U),meanMass=x*masses[0]+(1-x)*masses[1];
 const number=2*m.nn/(meanMass*config.radiusM**2);
 const params={radiusM:config.radiusM,gasK:config.gasK,lightFraction:x,diffusivityM2S:config.radialDiffusivityM2S,
  speciesMassKg:masses,mechanics:{...m,gamma:0,drag:0,torque:0}};
 const uniform=Array(n).fill(1/n);
 const initial={lightMass:uniform,heavyMass:[...uniform],ionAngularMomentumKgM2S:m.ii*omega,neutralAngularMomentumKgM2S:m.nn*omega};
 const initialFreeEnergy=.5*(m.ii+m.nn)*omega**2;
 for(const dt of [.0001,.05,1]){
  const state=advanceFuelCoupledStep(params,initial,dt);
  const entropy=(p:number[])=>total(p.map(value=>value===0?0:value*Math.log(n*value)));
  const kinetic=.5*state.ionAngularMomentumKgM2S**2/m.ii+.5*state.neutralAngularMomentumKgM2S**2/state.neutralInertiaKgM2;
  const freeEnergy=kinetic+number*K*config.gasK*(x*entropy(state.lightMass)+(1-x)*entropy(state.heavyMass));
  assert.ok(freeEnergy<=initialFreeEnergy*(1+2e-12),`Closed isothermal free energy increased at dt=${dt}: ${initialFreeEnergy} -> ${freeEnergy}`);
 }
});

test('independent stiff-friction and large-step gate preserves the endpoint torque impulse budget',()=>{
 const rotor=simulateFuelCentrifuge(config),m=rotor.mechanics,n=32;
 for(const stiffness of [1,1e8])for(const dt of [1e-8,.005,10]){
  const params={radiusM:config.radiusM,gasK:config.gasK,lightFraction:config.lightFraction,diffusivityM2S:config.radialDiffusivityM2S,
   speciesMassKg:rotor.pair.masses.map(value=>value*U),mechanics:{...m,gamma:m.gamma*stiffness}};
  const state={lightMass:Array(n).fill(1/n),heavyMass:Array(n).fill(1/n),ionAngularMomentumKgM2S:m.ii*7000,neutralAngularMomentumKgM2S:m.nn*1000};
  const next=advanceFuelCoupledStep(params,state,dt),initialL=state.ionAngularMomentumKgM2S+state.neutralAngularMomentumKgM2S;
  const finalL=next.ionAngularMomentumKgM2S+next.neutralAngularMomentumKgM2S;
  const target=initialL+next.driveImpulseKgM2S-next.dragImpulseKgM2S;
  const scale=initialL+Math.abs(next.driveImpulseKgM2S)+Math.abs(next.dragImpulseKgM2S);
  assert.ok(Math.abs(finalL-target)<2e-12*scale,`Stiff impulse budget failed: gamma multiplier ${stiffness}, dt=${dt}`);
  assert.ok(next.lightMass.every(value=>Number.isFinite(value)&&value>=0));
  assert.ok(next.heavyMass.every(value=>Number.isFinite(value)&&value>=0));
  assert.ok(Math.abs(total(next.lightMass)-1)<2e-10&&Math.abs(total(next.heavyMass)-1)<2e-10);
  assert.ok(Number.isFinite(next.ionRadS)&&Number.isFinite(next.neutralRadS));
 }
});

test('independent coupled time convergence agrees with direct-flux RK4, not a shared implicit solver',()=>{
 const rotor=simulateFuelCentrifuge(config),n=12;
 const reference=explicitOracle(rotor,n,8192),halfReference=explicitOracle(rotor,n,4096);
 assert.ok(discrepancy(reference,halfReference)<1e-7,'Explicit RK4 reference is not itself converged.');
 const errors=[64,128,256].map(steps=>discrepancy(last(simulateFuelTransport(rotor,{cells:n,steps}).snapshots),reference));
 assert.ok(errors[1]<.68*errors[0]&&errors[2]<.68*errors[1],`Coupled dt convergence: ${errors}`);
 assert.ok(errors[2]<.02,`Coupled distribution/velocity agreement: ${errors}`);
 console.log('v48 independent direct-flux RK4 errors',JSON.stringify(errors));
});

test('independent fixed-inertia limit approaches the exact affine two-rotor solution',()=>{
 const c={...config,radialDiffusivityM2S:1e-24,collisionHz:4},rotor=simulateFuelCentrifuge(c),m=rotor.mechanics;
 const exact=rotorResponse(m.ii,m.nn,m.gamma,m.drag,m.torque,c.durationS);
 const errors=[64,128,256].map(steps=>{
  const state=last(simulateFuelTransport(rotor,{cells:16,steps}).snapshots);
  assert.ok(l1(state.lightMass,Array(16).fill(1/16))<1e-12);
  assert.ok(l1(state.heavyMass,Array(16).fill(1/16))<1e-12);
  assert.ok(Math.abs(state.neutralInertiaRatio-1)<1e-12);
  return Math.abs(state.ionRadS-exact.ion)/exact.ion+Math.abs(state.neutralRadS-exact.neutral)/exact.neutral;
 });
 assert.ok(errors[1]<.68*errors[0]&&errors[2]<.68*errors[1],`Fixed-inertia dt convergence: ${errors}`);
 assert.ok(errors[2]<.01,`Fixed-inertia analytic agreement: ${errors}`);
 console.log('v48 independent fixed-inertia exact-solution errors',JSON.stringify(errors));
});

test('independent joint radial/time refinement converges in full distributions and both rotor speeds',()=>{
 const rotor=simulateFuelCentrifuge(config),cache=new Map<string,ReturnType<typeof simulateFuelTransport>['snapshots'][number]>();
 const run=(cells:number,steps:number)=>{
  const key=`${cells}/${steps}`;if(!cache.has(key))cache.set(key,last(simulateFuelTransport(rotor,{cells,steps}).snapshots));
  return cache.get(key)!;
 };
 const reference=run(128,8192);
 const errors=(pairs:number[][])=>pairs.map(([cells,steps])=>{
  const target={...reference,lightMass:coarsen(reference.lightMass,cells),heavyMass:coarsen(reference.heavyMass,cells)};
  return discrepancy(run(cells,steps),target);
 });
 const spatial=errors([[16,8192],[32,8192],[64,8192]]);
 const temporalTarget=run(64,8192),temporal=[128,256,512].map(steps=>discrepancy(run(64,steps),temporalTarget));
 // SG's radial consistency error is second order while backward Euler is first
 // order. dt∝h² keeps their leading ratio fixed; halving both h and dt can
 // temporarily remove cancellation between their signed physical errors.
 const joint=errors([[16,128],[32,512],[64,2048]]);
 const meanY=(p:number[])=>total(p.map((value,i)=>value*(i+.5)/p.length));
 const signed=(state:typeof reference)=>({ionRelative:state.ionRadS/reference.ionRadS-1,
  neutralRelative:state.neutralRadS/reference.neutralRadS-1,
  lightSecondMoment:meanY(state.lightMass)-meanY(reference.lightMass),heavySecondMoment:meanY(state.heavyMass)-meanY(reference.heavyMass)});
 const original=[[16,128],[32,256],[64,512]].map(([cells,steps])=>({cells,steps,error:errors([[cells,steps]])[0],
  combined:signed(run(cells,steps)),spaceOnly:signed(run(cells,8192)),timeOnly:signed(run(128,steps))}));
 console.log('v48 independent refinement diagnostics',JSON.stringify({spatial,temporal,joint,original}));
 for(const [name,values] of [['radial',spatial],['time',temporal],['joint',joint]] as const){
  assert.ok(values[1]<.75*values[0]&&values[2]<.75*values[1],`${name} convergence: ${values}`);
  assert.ok(values[2]<.02,`${name} distribution/velocity agreement: ${values}`);
 }
});

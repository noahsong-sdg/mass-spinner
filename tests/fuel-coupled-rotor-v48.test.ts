import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {advanceFuelCoupledStep,sampleFuelTransport,simulateFuelTransport} from '../src/fuel-transport.js';

const U=1.66053906892e-27;
function setup(){
 const rotor=simulateFuelCentrifuge(DEFAULT_FUEL_CENTRIFUGE);
 const parameters={radiusM:rotor.config.radiusM,gasK:rotor.config.gasK,lightFraction:rotor.config.lightFraction,
  diffusivityM2S:rotor.config.radialDiffusivityM2S,speciesMassKg:rotor.pair.masses.map(m=>m*U),mechanics:{...rotor.mechanics}};
 return {rotor,parameters};
}
function close(a:number,b:number,scale:number,tolerance=2e-11){
 assert.ok(Math.abs(a-b)<=tolerance*Math.max(scale,Number.MIN_VALUE),`${a} != ${b} at scale ${scale}`);
}

test('coupled rotor inertia feeds back on speeds instead of reusing the uniform-density trajectory',()=>{
 const {rotor}=setup(),model=simulateFuelTransport(rotor),end=model.snapshots.at(-1)!;
 assert.equal(model.coupling,'angular-momentum-conserving');
 assert.ok(end.neutralInertiaRatio>1.05);
 assert.ok(end.neutralRadS<rotor.samples.at(-1)!.neutralRadS);
 assert.ok(model.maxAngularMomentumRelativeError<2e-11);
 assert.ok(model.maxEnergyRelativeError<2e-11);
 assert.ok(model.maxCouplingIterations<=64);
 const budget=end.angularMomentum;
 close(end.ionAngularMomentumKgM2S+end.neutralAngularMomentumKgM2S,budget.driveImpulseKgM2S-budget.dragImpulseKgM2S,budget.driveImpulseKgM2S);
});

test('redistribution work and temporal dissipation close the rotational energy identity separately',()=>{
 const {parameters:p}=setup(),n=24;
 const initial={lightMass:Array(n).fill(1/n),heavyMass:Array(n).fill(1/n),ionAngularMomentumKgM2S:p.mechanics.ii*18000,neutralAngularMomentumKgM2S:p.mechanics.nn*10000};
 const next=advanceFuelCoupledStep(p,initial,.02),e=next.energyIncrement;
 const before=.5*(initial.ionAngularMomentumKgM2S**2/p.mechanics.ii+initial.neutralAngularMomentumKgM2S**2/p.mechanics.nn);
 const after=.5*(next.ionAngularMomentumKgM2S*next.ionRadS+next.neutralAngularMomentumKgM2S*next.neutralRadS);
 close(after-before,e.driveWorkJ-e.slipDissipationJ-e.dragDissipationJ-e.redistributionWorkJ-e.numericalDissipationJ,
  before+after+Math.abs(e.driveWorkJ));
 assert.ok(e.slipDissipationJ>=0&&e.dragDissipationJ>=0&&e.numericalDissipationJ>=0);
 assert.ok(e.redistributionWorkJ>0);
});

test('timeline interpolation conserves angular impulse and labels its energy defect as numerical',()=>{
 const {rotor}=setup(),model=simulateFuelTransport(rotor,{cells:24,steps:128});
 for(const t of [.0001,.0137,.333,.789]){
  const s=sampleFuelTransport(model,t),budget=s.angularMomentum;
  close(s.ionAngularMomentumKgM2S+s.neutralAngularMomentumKgM2S,budget.driveImpulseKgM2S-budget.dragImpulseKgM2S,budget.driveImpulseKgM2S);
  assert.ok(s.energy.relativeResidual<2e-11);
  assert.ok(s.energy.numericalDissipationJ>=0);
  assert.ok(s.ionPhaseRad>=0&&s.neutralPhaseRad>=0);
 }
});

test('zero drive and duration retain exact rest and reject nonphysical coupled-step boundaries',()=>{
 const {rotor,parameters:p}=setup(),rest={lightMass:[.5,.5],heavyMass:[.5,.5],ionAngularMomentumKgM2S:0,neutralAngularMomentumKgM2S:0};
 const off=simulateFuelTransport(simulateFuelCentrifuge({...rotor.config,currentA:0}),{cells:8,steps:16});
 for(const s of off.snapshots){assert.equal(s.ionRadS,0);assert.equal(s.neutralRadS,0);assert.equal(s.angularMomentum.relativeResidual,0);}
 const instant=simulateFuelTransport(simulateFuelCentrifuge({...rotor.config,durationS:0}));
 assert.equal(instant.snapshots.length,1);assert.equal(instant.maxEnergyRelativeError,0);
 assert.throws(()=>advanceFuelCoupledStep(p,{...rest,lightMass:[.6,.6]},.01),RangeError);
 assert.throws(()=>advanceFuelCoupledStep({...p,gasK:0},rest,.01),RangeError);
 assert.throws(()=>advanceFuelCoupledStep({...p,diffusivityM2S:-1},rest,.01),RangeError);
 assert.throws(()=>advanceFuelCoupledStep(p,rest,-1),RangeError);
});

test('physical root bracket honors accepted inventory roundoff without renormalizing the state',()=>{
 const {parameters:p}=setup();p.diffusivityM2S=0;
 Object.assign(p.mechanics,{gamma:0,drag:0,torque:0});
 const inventory=1-1e-10,initial={lightMass:[inventory,0],heavyMass:[inventory,0],
  ionAngularMomentumKgM2S:0,neutralAngularMomentumKgM2S:p.mechanics.nn*10000};
 const next=advanceFuelCoupledStep(p,initial,.1);
 assert.deepEqual(next.lightMass,initial.lightMass);assert.deepEqual(next.heavyMass,initial.heavyMass);
 assert.equal(next.neutralAngularMomentumKgM2S,initial.neutralAngularMomentumKgM2S);
 close(next.neutralInertiaKgM2,p.mechanics.nn*inventory/2,p.mechanics.nn);
});

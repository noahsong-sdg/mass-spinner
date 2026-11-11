import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {DEFAULT_FUEL_THERMAL,simulateFuelOperation,type FuelOperation} from '../src/fuel-operation.js';
import {sampleFuelTransport,type FuelTransportResult} from '../src/fuel-transport.js';

const sum=(a:readonly number[])=>a.reduce((x,y)=>x+y,0);
function close(a:number,b:number,scale:number,tolerance=3e-10){
 assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=tolerance*Math.max(1e-30,Math.abs(scale)),`${a} != ${b}`);
}
const frozen={...DEFAULT_FUEL_CENTRIFUGE,gasK:500,linerK:500,currentA:.03,
 collisionHz:30,ionFraction:.05,dragHz:.7,radialDiffusivityM2S:1e-30,durationS:.04};
const events=[{timeS:.013137,currentA:0},{timeS:.027731,currentA:.02}];
function operation(relativeTolerance:number,temperatureToleranceK:number):FuelOperation{
 return {schemaVersion:1,events,thermal:{...DEFAULT_FUEL_THERMAL,enabled:true,gasWallWK:0,coolingWK:0,
  spatial:{material:'tungsten',thicknessM:.001,cells:4},
  gas:{conductivityWMK:0,accuracy:{relativeTolerance,temperatureToleranceK}}}};
}

/** Independent solution of v'=A v+f by its two spectral projectors.
 * No production rotor-response, phase, transport or thermal-step helper.
 * The tiny positive D obeys the public setup domain and freezes inertia to
 * machine precision over this test; that condition is checked below.
 */
function exactFrozen(time:number){
 const m=simulateFuelCentrifuge(frozen).mechanics,a=m.gamma/m.ii,b=m.gamma/m.nn,d=b+m.drag/m.nn;
 const fast=(a+d+Math.sqrt((a-d)**2+4*a*b))/2,slow=a*(m.drag/m.nn)/fast,gap=fast-slow;
 const phi=(rate:number,t:number)=>-Math.expm1(-rate*t)/rate;
 const response=(torque:number,t:number)=>{
  const steady=[torque/m.drag+torque/m.gamma,torque/m.drag];
  const av=[a*(steady[1]-steady[0]),b*steady[0]-d*steady[1]];
  const low=steady.map((v,i)=>(av[i]+fast*v)/gap),high=steady.map((v,i)=>-(av[i]+slow*v)/gap);
  return {speed:steady.map((v,i)=>v-low[i]*Math.exp(-slow*t)-high[i]*Math.exp(-fast*t)),
   phase:steady.map((v,i)=>v*t-low[i]*phi(slow,t)-high[i]*phi(fast,t))};
 };
 const factor=frozen.magneticT*frozen.radiusM**2*(1-frozen.driveInnerFraction**2)/2;
 const total=response(frozen.currentA*factor,time);let previous=frozen.currentA;
 for(const event of events){
  if(event.timeS>time)break;
  const delta=response((event.currentA-previous)*factor,time-event.timeS);previous=event.currentA;
  for(let i=0;i<2;i++){total.speed[i]+=delta.speed[i];total.phase[i]+=delta.phase[i];}
 }
 return total;
}
function exactCurrentIntegral(time:number,squared=false){
 let previous=0,current=frozen.currentA,total=0;
 for(const event of events){
  if(event.timeS>time)break;
  total+=(event.timeS-previous)*(squared?current**2:current);previous=event.timeS;current=event.currentA;
 }
 return total+(time-previous)*(squared?current**2:current);
}
function frozenError(model:FuelTransportResult){
 const s=model.checkpoints!.at(-1)!,exact=exactFrozen(s.timeS);
 return Math.max(...[s.ionRadS,s.neutralRadS].map((v,i)=>Math.abs(v-exact.speed[i])/Math.max(1,Math.abs(exact.speed[i]))),
  ...[s.ionPhaseRad,s.neutralPhaseRad].map((v,i)=>Math.abs(v-exact.phase[i])/Math.max(.001,Math.abs(exact.phase[i]))));
}

test('independent switched frozen-inertia oracle contracts under tighter temporal tolerances',()=>{
 const r=simulateFuelCentrifuge(frozen),options={cells:8,steps:4};
 const loose=simulateFuelOperation(r,operation(.01,.001),options);
 const tight=simulateFuelOperation(r,operation(.0001,.00001),options);
 const looseError=frozenError(loose),tightError=frozenError(tight);
 assert.ok(tightError<.6*looseError,`${tightError} did not contract from ${looseError}`);
 assert.ok(tightError<.03,`Frozen rotor/phase differs from exact solution by ${tightError}`);
 for(const s of tight.checkpoints!)close(s.neutralInertiaKgM2,r.mechanics.nn,r.mechanics.nn,2e-12);
});

test('accepted fine-half trajectory retains exact phase quadratures, event integrals and all budgets',()=>{
 const model=simulateFuelOperation(simulateFuelCentrifuge(frozen),operation(.0001,.00001),{cells:8,steps:4});
 const rows=model.checkpoints!,control=model.timeControl!;
 assert.equal(control.method,'BE step doubling');assert.equal(model.steps,4);
 assert.ok(control.acceptedPairs>0&&control.maxErrorRatio<=1&&control.maxErrorRatio>=0);
 assert.equal(rows.length,2*control.acceptedPairs+1,'Both halves and no rejected states must be retained.');
 const torqueFactor=frozen.magneticT*frozen.radiusM**2*(1-frozen.driveInnerFraction**2)/2;
 const resistance=Math.log(1/frozen.driveInnerFraction)/(2*Math.PI*frozen.lengthM*frozen.conductivitySm);
 for(let i=0;i<rows.length;i++){
  const s=rows[i];assert.ok(i===0||s.timeS>rows[i-1].timeS);
  close(s.angularMomentum.driveImpulseKgM2S,torqueFactor*exactCurrentIntegral(s.timeS),torqueFactor*frozen.currentA*frozen.durationS);
  close(s.thermal!.ohmicEnergyJ,resistance*exactCurrentIntegral(s.timeS,true),resistance*frozen.currentA**2*frozen.durationS);
  assert.ok(s.thermal!.relativeResidual<2e-8&&s.energy.relativeResidual<2e-8&&s.angularMomentum.relativeResidual<2e-8);
  close(sum(s.lightMass),1,1);close(sum(s.heavyMass),1,1);
  if(i){
   const p=rows[i-1],dt=s.timeS-p.timeS;
   close(s.ionPhaseRad-p.ionPhaseRad,dt*s.ionRadS,Math.max(Math.abs(s.ionPhaseRad),dt*Math.abs(s.ionRadS)));
   close(s.neutralPhaseRad-p.neutralPhaseRad,dt*s.neutralRadS,Math.max(Math.abs(s.neutralPhaseRad),dt*Math.abs(s.neutralRadS)));
  }
 }
 for(const event of events){
  assert.equal(rows.filter(s=>s.timeS===event.timeS).length,1);
  assert.equal(rows.find(s=>s.timeS===event.timeS)!.currentA,event.currentA);
 }
 assert.equal(rows.at(-1)!.timeS,frozen.durationS);
});

test('hot-wall temporal rejection and contraction use the heating signal above the 500 K background',()=>{
 const c={...DEFAULT_FUEL_CENTRIFUGE,currentA:0,durationS:.0001};
 const run=(relativeTolerance:number,temperatureToleranceK:number)=>simulateFuelOperation(simulateFuelCentrifuge(c),
  {schemaVersion:1,events:[],thermal:{...DEFAULT_FUEL_THERMAL,enabled:true,coolingWK:0,
   spatial:{material:'tungsten',thicknessM:.001,cells:4},
   gas:{conductivityWMK:.1,accuracy:{relativeTolerance,temperatureToleranceK}}}},{cells:16,steps:4});
 const loose=run(.01,.001),tight=run(.0003,.00003),reference=run(.00001,.000001);
 assert.ok(tight.timeControl!.rejectedSteps>0,'This control must actually exercise rollback after rejection.');
 const error=(model:FuelTransportResult)=>Math.max(...[1e-7,3e-7,1e-6,1e-5,c.durationS].flatMap(time=>{
  const a=sampleFuelTransport(model,time).thermal!.gas!,b=sampleFuelTransport(reference,time).thermal!.gas!;
  return a.temperatureK.map((t,i)=>Math.abs(t-b.temperatureK[i]));
 }));
 const looseError=error(loose),tightError=error(tight);
 assert.ok(tightError<.75*looseError,`${tightError} did not contract from ${looseError}`);
 assert.ok(tightError<.05,`Same-mesh temporal temperature error ${tightError} K`);
 assert.equal(tight.cells,16,'Explicit scientific mesh wins over the accuracy-mode default.');
});

test('off-knot adaptive continuation preserves a stale metadata-free canonical prefix and rejects tampering',()=>{
 const r=simulateFuelCentrifuge(frozen),op=operation(.001,.0001),options={cells:8,steps:4};
 const source=simulateFuelOperation(r,op,options),stale=structuredClone(source);
 delete stale.timeControl;
 const left=stale.checkpoints![2].timeS,right=stale.checkpoints![3].timeS,time=(left+right)/2;
 const before=sampleFuelTransport(stale,time);
 const resumed=simulateFuelOperation(r,op,options,{transport:stale,timeS:time});
 assert.deepEqual(resumed.checkpoints!.filter(s=>s.timeS<time),stale.checkpoints!.filter(s=>s.timeS<time));
 const at=resumed.checkpoints!.find(s=>s.timeS===time)!;assert.ok(at);
 for(const key of ['lightMass','heavyMass','ionAngularMomentumKgM2S','neutralAngularMomentumKgM2S','ionPhaseRad','neutralPhaseRad','energy','angularMomentum'] as const)
  assert.deepEqual(at[key],before[key]);
 for(const key of ['gasK','linerK','pressurePa','gasEnergyJ','linerEnergyJ','ohmicEnergyJ','coolingEnergyJ','gas','spatial'] as const)
  assert.deepEqual(at.thermal![key],before.thermal![key]);
 const corrupt=structuredClone(stale);corrupt.checkpoints![1].thermal!.gas!.temperatureK[0]+=1;
 assert.throws(()=>simulateFuelOperation(r,op,options,{transport:corrupt,timeS:time}),/Spatial gas continuation/);
 const changed=operation(.002,.0001);
 assert.throws(()=>simulateFuelOperation(r,changed,options,{transport:source,timeS:time}),/same apparatus|thermal setup|accuracy/i);
});

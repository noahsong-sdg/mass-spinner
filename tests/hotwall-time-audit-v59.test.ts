import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge,type FuelConfig} from '../src/fuel-centrifuge.js';
import {DEFAULT_FUEL_THERMAL,simulateFuelOperation,type FuelOperation} from '../src/fuel-operation.js';
import {sampleFuelTransport} from '../src/fuel-transport.js';

const K=1.380649e-23,U=1.66053906892e-27;
// Vanishing positive mobility is within the public domain. Frozen species
// inventories decouple the exact rotor ODE from the evolving hot-wall thermal
// field, isolating integration and interpolation errors from feedback errors.
const config:FuelConfig={...DEFAULT_FUEL_CENTRIFUGE,radialDiffusivityM2S:1e-30};
const thermal={...DEFAULT_FUEL_THERMAL,enabled:true,
 spatial:{material:'tungsten' as const,thicknessM:.001,cells:8},gas:{conductivityWMK:.1}};
const sum=(v:readonly number[])=>v.reduce((a,b)=>a+b,0);

/** Independently derived Laplace resolvent of the two linear rotor equations.
 * No production response, step, inertia or temperature helper is used. A step
 * in current is convolved with the two decaying normal modes; superposition
 * makes current switches exact, including switches off the nominal time grid.
 */
function exact(c:FuelConfig,events:FuelOperation['events'],time:number){
 const number=c.pressurePa*Math.PI*c.radiusM**2*c.lengthM/(K*c.gasK);
 const mass=(c.lightFraction*6.0151228874+(1-c.lightFraction)*7.0160034366)*U;
 const neutralI=.5*number*mass*c.radiusM**2,ionI=neutralI*c.ionFraction/(1-c.ionFraction);
 const a=c.collisionHz,b=a*ionI/neutralI,d=c.dragHz,total=a+b+d;
 const fast=(total+Math.sqrt(total*total-4*a*d))/2,slow=a*d/fast,gap=fast-slow;
 const phi=(rate:number,t:number)=>-Math.expm1(-rate*t)/rate;
 const switches=[{timeS:0,currentA:c.currentA},...events];
 let ion=0,neutral=0,previous=0;
 for(const event of switches){
  const t=time-event.timeS;if(t<=0)break;
  const forcing=(event.currentA-previous)*c.magneticT*c.radiusM**2*(1-c.driveInnerFraction**2)/(2*ionI);
  const slowIntegral=phi(slow,t),fastIntegral=phi(fast,t);
  ion+=forcing*((b+d-slow)*slowIntegral+(fast-b-d)*fastIntegral)/gap;
  neutral+=forcing*b*(slowIntegral-fastIntegral)/gap;previous=event.currentA;
 }
 return {ion,neutral,fast};
}
function offsets(){
 const fast=exact(config,[],1).fast;
 return [...Array.from({length:97},(_,i)=>1e-6*20000**(i/96)),...Array.from({length:40},(_,i)=>(i+1)/(8*fast))];
}
function compare(events:FuelOperation['events'],starts:number[],c=config){
 const operation:FuelOperation={schemaVersion:1,events,thermal};
 const model=simulateFuelOperation(simulateFuelCentrifuge(c),operation,{cells:8,steps:512});
 let ion=0,neutral=0,worstIonTime=0;
 for(const start of starts)for(const delta of offsets()){
  const time=start+delta;if(time>c.durationS)continue;
  const s=sampleFuelTransport(model,time),expected=exact(c,events,time);
  const error=Math.abs(s.ionRadS-expected.ion)/Math.max(1,Math.abs(expected.ion));
  if(error>ion){ion=error;worstIonTime=time;}
  neutral=Math.max(neutral,Math.abs(s.neutralRadS-expected.neutral)/Math.max(1,Math.abs(expected.neutral)));
 }
 for(const s of model.checkpoints!){
  assert.ok(s.lightMass.every(p=>Math.abs(p-1/8)<1e-12),'Frozen-mobility oracle requires unchanged inventories.');
  assert.ok(s.heavyMass.every(p=>Math.abs(p-1/8)<1e-12));
  assert.ok(Math.abs(sum(s.lightMass)-1)<2e-10&&s.angularMomentum.relativeResidual<2e-8);
  assert.ok(s.thermal!.relativeResidual<2e-8&&s.energy.relativeResidual<2e-8);
 }
 return {ion,neutral,worstIonTime,checkpoints:model.checkpoints!.length};
}

test('independent hot-wall startup agrees with exact frozen-inventory rotor modes at live resolution',()=>{
 const result=compare([], [0]);
 console.log('v59 independent exact startup',JSON.stringify(result));
 assert.ok(result.ion<.03&&result.neutral<.03,`Early exact-rotor disagreement: ${JSON.stringify(result)}`);
});

test('late off-grid power switches resolve the same fast rotor mode as startup',()=>{
 const events=[{timeS:.650137,currentA:.03},{timeS:.750137,currentA:0},{timeS:.850137,currentA:.03}];
 const result=compare(events,[.650137,.750137,.850137],{...config,currentA:0});
 console.log('v59 independent exact switched rotor',JSON.stringify(result));
 assert.ok(result.ion<.03&&result.neutral<.03,`Switched exact-rotor disagreement: ${JSON.stringify(result)}`);
});

test('full hot-wall live solution meets the existing rotor gate on dense early times and contracts under refinement',()=>{
 const c=DEFAULT_FUEL_CENTRIFUGE,operation:FuelOperation={schemaVersion:1,events:[],thermal:{...thermal,
  spatial:{material:'tungsten',thicknessM:.001,cells:16}}};
 const rotor=simulateFuelCentrifuge(c),runs=[512,1024,2048].map(steps=>simulateFuelOperation(rotor,operation,{cells:64,steps}));
 // Retain every old comparison time; add samples across the missed fast mode
 // and between accepted knots. Finite-reference differences are not absolute
 // error bounds, so the frozen-inventory analytic controls remain separate.
 const times=[...new Set([...offsets(),...Array.from({length:64},(_,i)=>c.durationS*((i+1)/64)**2)])].sort((a,b)=>a-b);
 const errors=runs.slice(0,2).map((model,index)=>{
  const error={steps:[512,1024][index],ion:0,neutral:0,gasTemperatureK:0,pressureRelative:0,speciesCDF:0};
  for(const time of times){
   const a=sampleFuelTransport(model,time),b=sampleFuelTransport(runs[2],time);
   error.ion=Math.max(error.ion,Math.abs(a.ionRadS-b.ionRadS)/Math.max(1,Math.abs(b.ionRadS)));
   error.neutral=Math.max(error.neutral,Math.abs(a.neutralRadS-b.neutralRadS)/Math.max(1,Math.abs(b.neutralRadS)));
   let light=0,heavy=0;
   for(let i=0;i<64;i++){
    error.gasTemperatureK=Math.max(error.gasTemperatureK,Math.abs(a.thermal!.gas!.temperatureK[i]-b.thermal!.gas!.temperatureK[i]));
    error.pressureRelative=Math.max(error.pressureRelative,Math.abs(a.thermal!.gas!.pressurePa[i]-b.thermal!.gas!.pressurePa[i])/Math.max(...b.thermal!.gas!.pressurePa));
    light+=a.lightMass[i]-b.lightMass[i];heavy+=a.heavyMass[i]-b.heavyMass[i];
    error.speciesCDF=Math.max(error.speciesCDF,Math.abs(light),Math.abs(heavy));
   }
  }
  return error;
 });
 for(const model of runs)for(const s of model.checkpoints!){
  assert.ok(s.thermal!.gas!.minK>0&&s.thermal!.relativeResidual<2e-8);
  assert.ok(s.angularMomentum.relativeResidual<2e-8&&s.energy.relativeResidual<2e-8);
  assert.ok(Math.abs(sum(s.lightMass)-1)<2e-10&&Math.abs(sum(s.heavyMass)-1)<2e-10);
 }
 console.log('v59 independent dense hot-wall refinement',JSON.stringify({commonTimes:times.length,referenceSteps:2048,errors}));
 assert.ok(errors[0].ion<.03&&errors[0].neutral<.03,`Live rotor remains unresolved: ${JSON.stringify(errors)}`);
 for(const key of ['ion','neutral','gasTemperatureK','pressureRelative','speciesCDF'] as const)
  assert.ok(errors[1][key]<.8*errors[0][key],`Hot-wall timestep contraction failed for ${key}: ${JSON.stringify(errors)}`);
});

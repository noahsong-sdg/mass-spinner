import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,rotorResponse,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {DEFAULT_FUEL_THERMAL,simulateFuelOperation,type FuelOperation,type FuelThermalOptions} from '../src/fuel-operation.js';
import {sampleFuelTransport,simulateFuelTransport} from '../src/fuel-transport.js';
import {fuelMotionState} from '../src/fuel-motion.js';

const K=1.380649e-23,U=1.66053906892e-27;
const sum=(a:readonly number[])=>a.reduce((x,y)=>x+y,0);
const l1=(a:readonly number[],b:readonly number[])=>sum(a.map((x,i)=>Math.abs(x-b[i])));
const last=<T>(a:readonly T[])=>a[a.length-1];
const base={...DEFAULT_FUEL_CENTRIFUGE,currentA:.04,collisionHz:30,ionFraction:.05,dragHz:.7,
 pressurePa:8,gasK:500,linerK:500,durationS:.2,radialDiffusivityM2S:.008};
const thermal:FuelThermalOptions={enabled:true,wallCapacityJK:.003,gasWallWK:.003,coolingWK:.001,coolantK:450};
const operation:FuelOperation={schemaVersion:1,events:[{timeS:.075,currentA:0},{timeS:.15,currentA:.025}],thermal};
const capacity=(c:typeof base)=>1.5*c.pressurePa*Math.PI*c.radiusM**2*c.lengthM/c.gasK;
function close(actual:number,expected:number,scale:number,tolerance=1e-9){
 assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<=tolerance*Math.max(Math.abs(scale),1e-300),`${actual} != ${expected}`);
}

/** Independent method-of-lines oracle. Direct face-flux divergence, thermal
 * derivatives, and explicit RK4; no production transport/rotor/thermal step.
 * Current is constant within a step and every step lands on an event.
 */
function oracle(rotor:ReturnType<typeof simulateFuelCentrifuge>,op:FuelOperation,n:number,steps:number){
 const c=rotor.config,m=rotor.mechanics,t=op.thermal!,x=c.lightFraction;
 const masses=rotor.pair.masses.map(v=>v*U),weight=x*masses[0]/(x*masses[0]+(1-x)*masses[1]);
 const cg=1.5*c.pressurePa*Math.PI*c.radiusM**2*c.lengthM/c.gasK;
 const rate=4*c.radialDiffusivityM2S/c.radiusM**2;
 const torquePerA=c.magneticT*c.radiusM**2*(1-c.driveInnerFraction**2)/2;
 const resistance=Math.log(1/c.driveInnerFraction)/(2*Math.PI*c.lengthM*c.conductivitySm);
 const inertia=(s:number[])=>2*m.nn*sum(Array.from({length:n},(_,i)=>(weight*s[i]+(1-weight)*s[n+i])*(i+.5)/n));
 const derivative=(s:number[],current:number)=>{
  const out=Array(s.length).fill(0),ii=m.ii,nn=inertia(s),wi=s[2*n]/ii,wn=s[2*n+1]/nn,tg=s[2*n+2],tw=s[2*n+3];
  for(let species=0;species<2;species++){
   const z=masses[species]*wn**2*c.radiusM**2/(2*K*tg*n);
   const inward=z<1e-7?1-z/2+z*z/12:z/Math.expm1(z),outward=inward+z;
   for(let face=1;face<n;face++){
    const flux=rate*face*n*(outward*s[species*n+face-1]-inward*s[species*n+face]);
    out[species*n+face-1]-=flux;out[species*n+face]+=flux;
   }
  }
  const inertiaRate=2*m.nn*sum(Array.from({length:n},(_,i)=>(weight*out[i]+(1-weight)*out[n+i])*(i+.5)/n));
  const slip=wi-wn,friction=m.gamma*slip,gasWall=t.gasWallWK*(tg-tw);
  out[2*n]=current*torquePerA-friction;
  out[2*n+1]=friction-c.dragHz*s[2*n+1];
  out[2*n+2]=(m.gamma*slip**2+.5*wn**2*inertiaRate+current**2*resistance-gasWall)/cg;
  out[2*n+3]=(c.dragHz*s[2*n+1]*wn+gasWall-t.coolingWK*(tw-t.coolantK))/t.wallCapacityJK;
  return out;
 };
 let s=[...Array(n).fill(1/n),...Array(n).fill(1/n),0,0,c.gasK,c.linerK],time=0,event=0,current=c.currentA;
 const dt=c.durationS/steps;
 const shifted=(a:number[],b:number[],h:number)=>a.map((v,i)=>v+h*b[i]);
 for(let grid=1;grid<=steps;grid++){
  const target=grid===steps?c.durationS:grid*dt;
  while(time<target){
   while(event<op.events.length&&op.events[event].timeS<=time)current=op.events[event++].currentA;
   const endpoint=Math.min(target,op.events[event]?.timeS??target),h=endpoint-time;
   const a=derivative(s,current),b=derivative(shifted(s,a,h/2),current),cc=derivative(shifted(s,b,h/2),current),d=derivative(shifted(s,cc,h),current);
   s=s.map((v,i)=>v+h*(a[i]+2*b[i]+2*cc[i]+d[i])/6);time=endpoint;
  }
 }
 assert.ok(s.every(Number.isFinite)&&s.slice(0,2*n).every(v=>v>=0)&&s[2*n+2]>0&&s[2*n+3]>0,'RK4 oracle left its stable physical domain.');
 return {lightMass:s.slice(0,n),heavyMass:s.slice(n,2*n),ionRadS:s[2*n]/m.ii,neutralRadS:s[2*n+1]/inertia(s),gasK:s[2*n+2],linerK:s[2*n+3]};
}

test('independent analytic wall cooldown and isolated two-node exchange converge without drive',()=>{
 const c={...base,currentA:0,linerK:700,durationS:.3},r=simulateFuelCentrifuge(c),cg=capacity(c);
 const wallOnly={...thermal,gasWallWK:0,coolingWK:.002,coolantK:400};
 const a=last(simulateFuelOperation(r,{schemaVersion:1,events:[],thermal:wallOnly},{cells:4,steps:256}).snapshots).thermal!;
 close(a.gasK,c.gasK,c.gasK,2e-9);
 const exactWall=wallOnly.coolantK+(c.linerK-wallOnly.coolantK)*Math.exp(-wallOnly.coolingWK*c.durationS/wallOnly.wallCapacityJK);
 assert.ok(Math.abs(a.linerK-exactWall)<.03,`Wall cooldown: ${a.linerK} vs ${exactWall}`);
 const exchange={...thermal,gasWallWK:.002,coolingWK:0},common=(cg*c.gasK+exchange.wallCapacityJK*c.linerK)/(cg+exchange.wallCapacityJK);
 const exactGas=common+(c.gasK-common)*Math.exp(-exchange.gasWallWK*(1/cg+1/exchange.wallCapacityJK)*c.durationS);
 const exactLiner=(cg*c.gasK+exchange.wallCapacityJK*c.linerK-cg*exactGas)/exchange.wallCapacityJK;
 const coarse=last(simulateFuelOperation(r,{schemaVersion:1,events:[],thermal:exchange},{cells:4,steps:256}).snapshots).thermal!;
 const b=last(simulateFuelOperation(r,{schemaVersion:1,events:[],thermal:exchange},{cells:4,steps:512}).snapshots).thermal!;
 assert.ok(Math.abs(b.gasK-exactGas)<.6*Math.abs(coarse.gasK-exactGas),'Analytic thermal exchange must improve under timestep refinement.');
 assert.ok(Math.abs(b.gasK-exactGas)<.06&&Math.abs(b.linerK-exactLiner)<.06,`Two-node exchange: ${JSON.stringify({b,exactGas,exactLiner})}`);
 close(cg*b.gasK+exchange.wallCapacityJK*b.linerK,cg*c.gasK+exchange.wallCapacityJK*c.linerK,cg*c.gasK+exchange.wallCapacityJK*c.linerK,2e-9);
});

test('constant-current reference and live operation approach the same continuum with independent time grids',()=>{
 const r=simulateFuelCentrifuge({...base,collisionHz:1e4}),errors=[];
 for(const steps of [1024,2048,4096]){
  const options={cells:8,steps},original=simulateFuelTransport(r,options),operated=simulateFuelOperation(r,{schemaVersion:1,events:[]},options);
  let error=0;
  for(const time of [.01,.05,.1,.2]){
   const a=sampleFuelTransport(original,time),b=sampleFuelTransport(operated,time);
   error=Math.max(error,l1(a.lightMass,b.lightMass)+l1(a.heavyMass,b.heavyMass));
   for(const key of ['ionRadS','neutralRadS','ionPhaseRad','neutralPhaseRad'] as const)
    error=Math.max(error,Math.abs(a[key]-b[key])/Math.max(1,Math.abs(a[key])));
  }
  for(const model of [original,operated]){
   assert.ok(model.maxBalanceError<2e-8&&model.maxAngularMomentumRelativeError<2e-8&&model.maxEnergyRelativeError<2e-8);
   assert.ok(model.snapshots.every(s=>s.balances.minimumMass>=0));
  }
  errors.push(error);
 }
 assert.ok(errors[1]<errors[0]&&errors[2]<errors[1],`Different time grids do not approach the same solution: ${errors}`);
 assert.ok(errors[2]<.01,`Finest time-grid disagreement exceeds 1%: ${errors}`);
});

test('independent fixed-inertia current switching converges to an exact linear superposition',()=>{
 const c={...base,radialDiffusivityM2S:1e-30},r=simulateFuelCentrifuge(c),m=r.mechanics;
 const torquePerA=c.magneticT*c.radiusM**2*(1-c.driveInnerFraction**2)/2;
 const reference=rotorResponse(m.ii,m.nn,m.gamma,m.drag,m.torque,c.durationS);
 let previousCurrent=c.currentA;
 for(const e of operation.events){
  const increment=rotorResponse(m.ii,m.nn,m.gamma,m.drag,(e.currentA-previousCurrent)*torquePerA,c.durationS-e.timeS);
  reference.ion+=increment.ion;reference.neutral+=increment.neutral;previousCurrent=e.currentA;
 }
 const errors=[128,256,512].map(steps=>{
  const s=last(simulateFuelOperation(r,{schemaVersion:1,events:operation.events},{cells:4,steps}).snapshots);
  return Math.abs(s.ionRadS-reference.ion)/Math.abs(reference.ion)+Math.abs(s.neutralRadS-reference.neutral)/Math.abs(reference.neutral);
 });
 assert.ok(errors[1]<.65*errors[0]&&errors[2]<.65*errors[1],`Exact switched-current refinement failed: ${errors}`);
 assert.ok(errors[2]<.01,`Switched-current response differs from exact affine mechanics: ${errors}`);
});

test('independent physical spin-down produces signed inward redistribution without inventing heat',()=>{
 const c={...base,currentA:.08,collisionHz:300,dragHz:3,durationS:1.2,radialDiffusivityM2S:.03};
 const r=simulateFuelCentrifuge(c),t={...thermal,wallCapacityJK:.01,gasWallWK:.2,coolingWK:1,coolantK:c.gasK};
 const model=simulateFuelOperation(r,{schemaVersion:1,events:[{timeS:.3,currentA:0}],thermal:t},{cells:8,steps:384});
 const cg=capacity(c),initial=cg*c.gasK+t.wallCapacityJK*c.linerK;
 const inward=model.snapshots.slice(1).filter((s,i)=>s.timeS>.3&&s.energy.redistributionWorkJ<model.snapshots[i].energy.redistributionWorkJ-1e-9);
 assert.ok(inward.length>0,'Powered enrichment followed by coastdown must exercise inward redistribution.');
 for(const s of inward){
  const th=s.thermal!,e=s.energy;
  close(e.kineticJ+cg*th.gasK+t.wallCapacityJK*th.linerK+e.numericalDissipationJ,
   initial+e.driveWorkJ+th.ohmicEnergyJ-th.coolingEnergyJ,initial+Math.abs(e.driveWorkJ),2e-9);
 }
});

test('independent joint thermal, distribution and rotor timestep study agrees with a direct-flux RK4 oracle',()=>{
 const r=simulateFuelCentrifuge(base),n=8,reference=oracle(r,operation,n,8192),half=oracle(r,operation,n,4096);
 const error=(s:typeof reference)=>l1(s.lightMass,reference.lightMass)+l1(s.heavyMass,reference.heavyMass)+
  Math.abs(s.ionRadS-reference.ionRadS)/Math.max(1,Math.abs(reference.ionRadS))+
  Math.abs(s.neutralRadS-reference.neutralRadS)/Math.max(1,Math.abs(reference.neutralRadS))+
  Math.abs(s.gasK-reference.gasK)/reference.gasK+Math.abs(s.linerK-reference.linerK)/reference.linerK;
 assert.ok(error(half)<1e-7,'RK4 thermal/distribution reference is not converged.');
 const errors=[64,128,256].map(steps=>{
  const s=last(simulateFuelOperation(r,operation,{cells:n,steps}).snapshots);
  return error({...s,gasK:s.thermal!.gasK,linerK:s.thermal!.linerK});
 });
 assert.ok(errors[1]<.7*errors[0]&&errors[2]<.7*errors[1],`Joint temperature/PDF/velocity refinement failed: ${errors}`);
 assert.ok(errors[2]<.035,`Thermal model differs from independent ODE: ${errors}`);
 console.log('v51 independent thermal/current-event RK4 errors',JSON.stringify(errors));
});

test('independent switched-current first law includes signed redistribution and excludes numerical heat',()=>{
 const r=simulateFuelCentrifuge(base),model=simulateFuelOperation(r,operation,{cells:16,steps:128}),cg=capacity(base),initial=cg*base.gasK+thermal.wallCapacityJK*base.linerK;
 let sawNumericalLoss=false;
 for(const s of [...model.snapshots,sampleFuelTransport(model,.123456)]){
  const t=s.thermal!,e=s.energy;
  const stored=e.kineticJ+cg*t.gasK+thermal.wallCapacityJK*t.linerK;
  const supplied=initial+e.driveWorkJ+t.ohmicEnergyJ-t.coolingEnergyJ;
  close(stored+e.numericalDissipationJ,supplied,Math.abs(supplied),2e-9);
  close(t.pressurePa,base.pressurePa*t.gasK/base.gasK,base.pressurePa,2e-12);
  close(t.gasEnergyJ,cg*t.gasK,initial,2e-12);
  if(e.numericalDissipationJ>1e-7){sawNumericalLoss=true;assert.ok(stored<supplied,'Numerical rotational loss was incorrectly restored as heat.');}
  assert.ok(t.gasK>0&&t.linerK>0&&s.lightMass.every(v=>v>=0)&&s.heavyMass.every(v=>v>=0));
  close(sum(s.lightMass),1,1,2e-10);close(sum(s.heavyMass),1,1,2e-10);
 }
 assert.ok(sawNumericalLoss,'Test did not exercise appreciable numerical dissipation.');
 const torquePerA=base.magneticT*base.radiusM**2*(1-base.driveInnerFraction**2)/2;
 for(const time of [.075,.1,.15,.2]){
  const s=sampleFuelTransport(model,time);
  const currentIntegral=base.currentA*Math.min(time,.075)+.025*Math.max(0,time-.15);
  close(s.ionAngularMomentumKgM2S+s.neutralAngularMomentumKgM2S+s.angularMomentum.dragImpulseKgM2S,torquePerA*currentIntegral,torquePerA*base.currentA*base.durationS,2e-10);
  assert.equal(s.currentA,time<.15?0:.025,'Drive event must be right-continuous, never interpolated.');
 }
});

test('independent strong thermal anchoring approaches the matched isothermal trajectory',()=>{
 const c={...base,currentA:.02},r=simulateFuelCentrifuge(c),options={cells:8,steps:128};
 const iso=last(simulateFuelOperation(r,{schemaVersion:1,events:[]},options).snapshots);
 const anchored=last(simulateFuelOperation(r,{schemaVersion:1,events:[],thermal:{...thermal,gasWallWK:100,coolingWK:100,coolantK:c.gasK}},options).snapshots);
 assert.ok(Math.abs(anchored.thermal!.gasK-c.gasK)<.03,'Both thermal conductances should recover the isothermal bath.');
 assert.ok(l1(iso.lightMass,anchored.lightMass)+l1(iso.heavyMass,anchored.heavyMass)<5e-4);
 close(anchored.ionRadS,iso.ionRadS,iso.ionRadS,2e-4);close(anchored.neutralRadS,iso.neutralRadS,iso.neutralRadS,2e-4);
});

test('independent maximum-UI conductance case closes energy despite a hot initial liner',()=>{
 const c={...DEFAULT_FUEL_CENTRIFUGE,durationS:.2},r=simulateFuelCentrifuge(c);
 const t={...DEFAULT_FUEL_THERMAL,enabled:true,gasWallWK:1e6,coolingWK:1e6,coolantK:c.gasK};
 const model=simulateFuelOperation(r,{schemaVersion:1,events:[],thermal:t},{cells:4,steps:32});
 const cg=capacity(c),initial=cg*c.gasK+t.wallCapacityJK*c.linerK;
 for(const s of model.snapshots){
  const th=s.thermal!,e=s.energy;
  assert.ok(th.gasK>0&&th.linerK>0&&Number.isFinite(th.coolingEnergyJ));
  close(e.kineticJ+cg*th.gasK+t.wallCapacityJK*th.linerK+e.numericalDissipationJ,
   initial+e.driveWorkJ+th.ohmicEnergyJ-th.coolingEnergyJ,initial+Math.abs(e.driveWorkJ),2e-10);
 }
 assert.ok(Math.abs(last(model.snapshots).thermal!.gasK-c.gasK)<.001,'Maximum allowed conductance should anchor the gas to the coolant.');
});

test('independent branch at an unsaved cursor preserves thermal state, inventories, phases and momenta',()=>{
 const r=simulateFuelCentrifuge(base),options={cells:8,steps:64},past=simulateFuelOperation(r,operation,options),time=.123456;
 const before=sampleFuelTransport(past,time),branched={...operation,events:[{timeS:.075,currentA:0},{timeS:time,currentA:.02}]};
 const continued=simulateFuelOperation(r,branched,options,{transport:past,timeS:time}),at=continued.snapshots.find(s=>s.timeS===time)!;
 assert.ok(at,'Continuation must retain an exact cursor snapshot.');
 assert.deepEqual(at.lightMass,before.lightMass);assert.deepEqual(at.heavyMass,before.heavyMass);
 for(const key of ['ionAngularMomentumKgM2S','neutralAngularMomentumKgM2S','ionPhaseRad','neutralPhaseRad'] as const)assert.equal(at[key],before[key]);
 for(const key of ['gasK','linerK','ohmicEnergyJ','coolingEnergyJ'] as const)assert.equal(at.thermal![key],before.thermal![key]);
 assert.equal(at.currentA,.02);assert.equal(last(continued.snapshots).currentA,.02);
 assert.deepEqual(continued.snapshots.filter(s=>s.timeS<time),past.snapshots.filter(s=>s.timeS<time));
 close(at.energy.kineticJ, before.energy.kineticJ,before.energy.kineticJ,2e-12);
 assert.deepEqual(simulateFuelOperation(r,branched,options,{transport:past,timeS:time}),continued,'Replaying a branch must be deterministic.');
});

test('independent continuation rejects apparatus edits and histories that rewrite the retained past',()=>{
 const r=simulateFuelCentrifuge(base),options={cells:4,steps:16},past=simulateFuelOperation(r,operation,options),resume={transport:past,timeS:.1};
 for(const edit of [{conductivitySm:2},{linerK:600},{lengthM:base.lengthM*2,pressurePa:base.pressurePa/2},{magneticT:base.magneticT*2}]){
  const changed=simulateFuelCentrifuge({...base,...edit});
  assert.throws(()=>simulateFuelOperation(changed,operation,options,resume),RangeError,`Changed setup accepted: ${JSON.stringify(edit)}`);
 }
 assert.throws(()=>simulateFuelOperation(r,{...operation,events:[{timeS:.075,currentA:.01},{timeS:.1,currentA:.02}]},options,resume),RangeError,'Cannot retain old state while changing an earlier event.');
 const legacy={...past};delete legacy.operation;
 assert.throws(()=>simulateFuelOperation(r,operation,options,{transport:legacy,timeS:.1}),RangeError,'Pre-operation replay has no immutable setup provenance.');
});

test('independent continuation compares physical setup values rather than property insertion order',()=>{
 const r=simulateFuelCentrifuge(base),options={cells:4,steps:16},past=simulateFuelOperation(r,operation,options),time=.1;
 const reordered=Object.fromEntries(Object.entries(base).reverse()) as typeof base;
 const reorderedEvents=operation.events.map(e=>({currentA:e.currentA,timeS:e.timeS}));
 const continued=simulateFuelOperation(simulateFuelCentrifuge(reordered),{...operation,events:reorderedEvents},options,{transport:past,timeS:time});
 const a=sampleFuelTransport(past,time),b=continued.snapshots.find(s=>s.timeS===time)!;
 assert.ok(b);assert.deepEqual(b.lightMass,a.lightMass);assert.deepEqual(b.heavyMass,a.heavyMass);
 assert.equal(b.ionAngularMomentumKgM2S,a.ionAngularMomentumKgM2S);assert.equal(b.neutralAngularMomentumKgM2S,a.neutralAngularMomentumKgM2S);
 assert.equal(b.thermal!.gasK,a.thermal!.gasK);assert.equal(b.thermal!.linerK,a.thermal!.linerK);
});

test('independent zero-field continuation cannot rewrite initial resistive current without an event',()=>{
 const c={...base,magneticT:0},r=simulateFuelCentrifuge(c),op:FuelOperation={schemaVersion:1,events:[],thermal};
 const options={cells:4,steps:16},past=simulateFuelOperation(r,op,options),resume={transport:past,timeS:.1};
 assert.equal(last(past.snapshots).ionRadS,0);assert.ok(last(past.snapshots).thermal!.ohmicEnergyJ>0);
 assert.equal(past.operation!.initialCurrentA,c.currentA);
 assert.throws(()=>simulateFuelOperation(simulateFuelCentrifuge({...c,currentA:.08}),op,options,resume),RangeError,
  'Equal zero torque does not make different initial I²R histories equivalent.');
 assert.doesNotThrow(()=>simulateFuelOperation(r,op,options,resume));
});

test('independent future current event enforces the nonrelativistic domain even from a stationary reference',()=>{
 const r=simulateFuelCentrifuge({...base,currentA:0,magneticT:2,pressurePa:1e-8,collisionHz:0,durationS:.1});
 assert.equal(last(r.samples).ionMS,0,'The constant-current reference cannot detect this future acceleration.');
 assert.throws(()=>simulateFuelOperation(r,{schemaVersion:1,events:[{timeS:.05,currentA:.2}]},{cells:4,steps:8}),
  /nonrelativistic/,'An operating event must not bypass the velocity domain checked at initial setup.');
});

test('independent resolved rotation clock bounds actual event-driven speeds with one common physical scale',()=>{
 const r=simulateFuelCentrifuge({...base,currentA:0}),transport=simulateFuelOperation(r,
  {schemaVersion:1,events:[{timeS:.05,currentA:.12}]},{cells:8,steps:32}),result={...r,transport};
 assert.equal(last(r.samples).ionRadS,0);
 const maximum=Math.max(...transport.snapshots.flatMap(s=>[Math.abs(s.ionRadS),Math.abs(s.neutralRadS)]));
 assert.ok(maximum>100,'The case must rotate substantially faster than its stationary reference.');
 for(const time of [0,.025,.1,.2]){
  const display=fuelMotionState(result,time,'spin'),accepted=sampleFuelTransport(transport,time);
  assert.equal(display.speeds.ion,accepted.ionRadS);assert.equal(display.speeds.neutral,accepted.neutralRadS);
  assert.equal(display.phases.ion,accepted.ionPhaseRad);assert.equal(display.phases.neutral,accepted.neutralPhaseRad);
  assert.ok(maximum*display.secondsPerScreenSecond<=1.8*(1+2e-12),'A future current increase must fit the shared rotation sampling budget.');
 }
});

test('independent thermal domain does not silently apply atomic heat capacity to molecular gas',()=>{
 const r=simulateFuelCentrifuge({...base,pair:'molecular'});
 assert.throws(()=>simulateFuelOperation(r,{schemaVersion:1,events:[],thermal},{cells:4,steps:4}),RangeError);
 const iso=simulateFuelOperation(r,{schemaVersion:1,events:[],thermal:{...DEFAULT_FUEL_THERMAL}},{cells:4,steps:4});
 assert.equal(last(iso.snapshots).thermal,undefined,'Molecular isothermal mode remains available.');
 const absoluteZeroWall=simulateFuelCentrifuge({...base,linerK:0});
 assert.throws(()=>simulateFuelOperation(absoluteZeroWall,{schemaVersion:1,events:[],thermal},{cells:4,steps:4}),RangeError,'An evolving reservoir cannot start at absolute zero.');
 assert.doesNotThrow(()=>simulateFuelOperation(absoluteZeroWall,{schemaVersion:1,events:[]},{cells:4,steps:4}),'The old isothermal reference domain is unchanged.');
});

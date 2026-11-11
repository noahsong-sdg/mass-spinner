import test from 'node:test';
import assert from 'node:assert/strict';
import {AMU,E_CHARGE,type Vec} from '../src/physics.js';
import {PROTON_MASS_U} from '../src/hydrogen-charge-exchange.js';
import {DEFAULT_HYDROGEN_TRACER,hydrogenHelix,uninterruptedHydrogenExit,neutralHydrogenExit,traceHydrogenFirstCapture,simulateHydrogenTracer,validateHydrogenTracer} from '../src/hydrogen-tracer.js';

const mass=PROTON_MASS_U*AMU;
const norm=(v:Vec)=>Math.hypot(...v);
const mechanical=(p:Vec,v:Vec)=>mass*(p[0]*v[1]-p[1]*v[0]);
const magnetic=(p:Vec,b:number)=>E_CHARGE*b*(p[0]**2+p[1]**2)/2;
const config=(changes:any={})=>({...DEFAULT_HYDROGEN_TRACER,...changes});
const relative=(actual:number,expected:number,scale=Math.max(Math.abs(expected),1e-300),tolerance=2e-12)=>assert.ok(Math.abs(actual-expected)<=tolerance*scale,`${actual} ≠ ${expected}`);
// Independently transcribed Eq44/Table9, n=1; keV/u and cm² converted to SI.
const publishedSigma=(energy:number)=>{const e=energy*1e-3;return 1e-20*3.2345*Math.log(2.3588e2/e+2.3713)/(1+3.8371e-2*e+3.8068e-6*Math.pow(e,3.5)+1.1832e-10*Math.pow(e,5.4));};

test('exact helix agrees with independently stepped Lorentz ODE and has the signed-B straight-flight limit',()=>{
 const c=config(),v:Vec=[12000,17000,22000],time=7e-6,steps=4096,h=time/steps,w=E_CHARGE*c.magneticT/mass;
 let state=[0,0,.02*c.lengthM,...v];
 const rhs=(s:number[])=>[s[3],s[4],s[5],w*s[4],-w*s[3],0];
 for(let i=0;i<steps;i++){
  const a=rhs(state),b=rhs(state.map((x,j)=>x+h*a[j]/2)),d=rhs(state.map((x,j)=>x+h*b[j]/2)),e=rhs(state.map((x,j)=>x+h*d[j]));
  state=state.map((x,j)=>x+h*(a[j]+2*b[j]+2*d[j]+e[j])/6);
 }
 const exact=hydrogenHelix(c,v,time);[...exact.position,...exact.velocity].forEach((value,i)=>relative(value,state[i],i<3?1:norm(v),1e-11));
 for(const b of [0,1e-20,-1e-20]){
  const straight=hydrogenHelix(config({magneticT:b}),v,time);
  straight.position.forEach((value,i)=>relative(value,(i===2?.02*c.lengthM:0)+v[i]*time,1,1e-14));
 }
 const positive=hydrogenHelix(c,[v[0],0,v[2]],time),negative=hydrogenHelix(config({magneticT:-c.magneticT}),[v[0],0,v[2]],time);
 relative(positive.position[0],negative.position[0]);relative(positive.position[1],-negative.position[1]);
});

test('charged wall/end intersections and exact CX ties obey absorbing-boundary precedence',()=>{
 const c=config({magneticT:0}),v=traceHydrogenFirstCapture(config({magneticT:0,neutralDensityM3:0}),.3).initialVelocity;
 const exit=uninterruptedHydrogenExit(c,v),wall=c.radiusM/Math.hypot(v[0],v[1]);relative(exit.timeS,wall);assert.equal(exit.destination,'wall');
 const endTime=.98*c.lengthM/v[2],corner=config({magneticT:0,radiusM:Math.hypot(v[0],v[1])*endTime});
 const cornerExit=uninterruptedHydrogenExit(corner,v);relative(cornerExit.wallTimeS,cornerExit.endTimeS);
 assert.equal(cornerExit.destination,'wall');
 const hit=hydrogenHelix(corner,v,cornerExit.timeS);relative(Math.hypot(hit.position[0],hit.position[1]),corner.radiusM);relative(hit.position[2],corner.lengthM);
 const rate=c.neutralDensityM3*publishedSigma(c.energyEVPerU)*norm(v),u=(time:number)=>-Math.expm1(-rate*time);
 assert.equal(traceHydrogenFirstCapture(c,u(exit.timeS)).captured,false);
 assert.equal(traceHydrogenFirstCapture(c,u(exit.timeS*(1-1e-10))).captured,true);
 assert.equal(traceHydrogenFirstCapture(c,u(exit.timeS*(1+1e-10))).captured,false);
 const axial=traceHydrogenFirstCapture(config({pitchDeg:0,neutralDensityM3:0}),.2);assert.equal(axial.destination,'end');relative(axial.exitPosition[2],c.lengthM);
});

test('fast neutral ray intersection remains exact close to the wall, including inward and axial rays',()=>{
 const c=config(),cases:[Vec,Vec][]=[[[c.radiusM*(1-1e-12),0,.1],[10000,3000,1000]],[[.15,0,.1],[-10000,3000,1000]],[[0,0,.1],[0,0,1000]]];
 for(const [position,velocity]of cases){
  const exit=neutralHydrogenExit(c,position,velocity);assert.ok(Number.isFinite(exit.timeS)&&exit.timeS>0);
  exit.position.forEach((value,i)=>relative(value,position[i]+velocity[i]*exit.timeS,1));
  if(exit.destination==='wall')relative(Math.hypot(exit.position[0],exit.position[1]),c.radiusM);else relative(exit.position[2],c.lengthM);
 }
 const boundary:Vec=[c.radiusM*(1+Number.EPSILON),0,.1];
 assert.equal(neutralHydrogenExit(c,boundary,[10000,0,1000]).timeS,0);
 assert.equal(neutralHydrogenExit(c,[0,0,c.lengthM*(1+Number.EPSILON)],[0,0,1000]).timeS,0);
 assert.throws(()=>neutralHydrogenExit(c,[c.radiusM*(1+1e-10),0,.1],[10000,0,1000]),/outside/);
 assert.throws(()=>neutralHydrogenExit(c,[0,0,c.lengthM*(1+1e-10)],[0,0,1000]),/outside/);
 assert.throws(()=>neutralHydrogenExit(c,[0,0,.1],[0,0,0]),/forward/);
});

test('both nuclear products are required for canonical angular closure; mechanical angular exchange equals external B torque',()=>{
 for(const magneticT of [0,.002,-.002,.05,-.05])for(const uniform of [0,.1,.6,.999]){
  const c=config({magneticT}),trace=traceHydrogenFirstCapture(c,uniform,.31),speed=norm(trace.initialVelocity),scale=mass*speed*c.radiusM;
  const kinetic=(v:Vec)=>.5*mass*norm(v)**2;relative(kinetic(trace.exitVelocity),kinetic(trace.initialVelocity));
  trace.ledger.externalMagneticImpulseKGMS.forEach((value,i)=>relative(value,mass*(trace.exitVelocity[i]-trace.initialVelocity[i]),mass*speed));
  const chargedTerminal=trace.capturePosition??trace.exitPosition,fieldAngularImpulse=-magnetic(chargedTerminal,magneticT);
  relative(mechanical(trace.exitPosition,trace.exitVelocity),fieldAngularImpulse,scale);
  relative(trace.ledger.mechanicalAngularChange,fieldAngularImpulse,scale);
  relative(trace.ledger.externalMagneticAngularImpulse,fieldAngularImpulse,scale);
  relative(trace.ledger.mechanicalAngularBalanceError,0,scale);
  let finalCanonical=mechanical(trace.exitPosition,trace.exitVelocity)+(trace.exitChargeState?magnetic(trace.exitPosition,magneticT):0);
  if(trace.captured){
   assert.ok(trace.slowIon);assert.equal(trace.exitChargeState,0);assert.deepEqual(trace.slowIon.velocity,[0,0,0]);assert.equal(trace.slowIon.chargeState,1);
   assert.deepEqual(trace.slowIon.position,trace.capturePosition);assert.equal(trace.slowIon.fate,'retained-field-only');
   finalCanonical+=mechanical(trace.slowIon.position,trace.slowIon.velocity)+magnetic(trace.slowIon.position,magneticT);
  }else assert.equal(trace.slowIon,null);
  relative(finalCanonical,0,scale);relative(trace.ledger.canonicalAngularError,finalCanonical,scale);
  assert.equal(trace.ledger.reactionKineticErrorJ,0);assert.deepEqual(trace.ledger.reactionMomentumErrorKGMS,[0,0,0]);
 }
});

test('stratified first-event probabilities match the published constant hazard without a timestep or large-step clipping',()=>{
 const count=2048;
 for(const magneticT of [0,.002,-.002]){
  const c=config({magneticT}),first=traceHydrogenFirstCapture({...c,neutralDensityM3:0},.5),exit=uninterruptedHydrogenExit(c,first.initialVelocity);
  const rate=c.neutralDensityM3*publishedSigma(c.energyEVPerU)*norm(first.initialVelocity),expected=-Math.expm1(-rate*exit.timeS);
  let captured=0;for(let i=0;i<count;i++)if(traceHydrogenFirstCapture(c,(i+.5)/count).captured)captured++;
  assert.ok(Math.abs(captured/count-expected)<=.5/count+1e-12);
  const simulation=simulateHydrogenTracer({...c,particles:16});relative(simulation.expectedCaptureFraction,expected);
  simulation.curves[0].x.forEach((time,i)=>relative(simulation.curves[0].y[i],Math.exp(-rate*time*1e-6),1));
 }
});

test('physical fit endpoints survive energy/velocity round trips, signed fields and launch azimuths',()=>{
 for(const energyEVPerU of [.1,20])for(const magneticT of [0,.002,-.05])for(const pitchDeg of [0,45,85])for(const azimuth of [0,.31,2.1]){
  const c=config({energyEVPerU,magneticT,pitchDeg});
  for(const uniform of [0,.2,.999])assert.doesNotThrow(()=>traceHydrogenFirstCapture(c,uniform,azimuth));
 }
});

test('population ledgers close while qualification stays restricted to the prescribed first-capture approximation',()=>{
 const c=config({particles:128,neutralDensityM3:1e20}),value=simulateHydrogenTracer(c),l=value.ledger;
 assert.equal(l.incomingTaggedNuclei+l.incomingReservoirNuclei,l.outgoingTaggedNuclei+l.retainedReservoirIons);
 assert.equal(l.incomingChargeE,l.outgoingChargeE+l.retainedChargeE);relative(l.initialNuclearKineticJ,l.finalNuclearKineticJ);
 assert.equal(value.primary.wall+value.primary.end,c.particles);assert.equal(value.primary.remaining,0);assert.ok(l.retainedReservoirIons>0);
 assert.match(value.qualification,/approximation; not full physical transport/);assert.match(value.scope.join(' '),/differential nuclear-scattering/);
 assert.match(value.scope.join(' '),/secondary reactions/);assert.match(value.scope.join(' '),/subsequent atomic kinetics remain unresolved/);
 assert.throws(()=>validateHydrogenTracer(config({electricFieldVM:1})),/E=0/);assert.throws(()=>validateHydrogenTracer(config({atomicIdentity:'Ar-40'})),/H-1/);
});

test('grazing gyro-wall captures and all practical domain corners retain finite bounded event outputs',()=>{
 const base=config(),initial=traceHydrogenFirstCapture({...base,neutralDensityM3:0},.5).initialVelocity;
 const grazing=config({magneticT:2*Math.hypot(initial[0],initial[1])*mass/(E_CHARGE*base.radiusM)});
 const exit=uninterruptedHydrogenExit(grazing,initial),rate=grazing.neutralDensityM3*publishedSigma(grazing.energyEVPerU)*norm(initial);
 for(const delta of [1e-4,1e-8,1e-10,1e-12,1e-14]){
  const trace=traceHydrogenFirstCapture(grazing,-Math.expm1(-rate*exit.timeS*(1-delta)));
  assert.ok(Number.isFinite(trace.exitTimeS));assert.ok(trace.exitPosition.every(Number.isFinite));
  if(trace.captured)assert.ok(trace.exitTimeS>=trace.captureTimeS!);
 }
 for(const radiusM of [.001,2])for(const lengthM of [.01,10])for(const magneticT of [0,.05,-.05])for(const energyEVPerU of [.1,20])for(const pitchDeg of [0,85])for(const neutralDensityM3 of [0,1e20])for(const uniform of [0,.5,.999]){
  const c=config({radiusM,lengthM,magneticT,energyEVPerU,pitchDeg,neutralDensityM3}),trace=traceHydrogenFirstCapture(c,uniform);
  assert.ok(Number.isFinite(trace.exitTimeS)&&trace.exitTimeS>0);assert.ok(trace.exitPosition.every(Number.isFinite));
  assert.ok(Math.hypot(trace.exitPosition[0],trace.exitPosition[1])<=radiusM*(1+1e-10));assert.ok(trace.exitPosition[2]<=lengthM*(1+1e-10));
 }
 assert.throws(()=>validateHydrogenTracer(config({radiusM:Number.MIN_VALUE})),/radius/);
});

test('unresolved many-turn 3D paths are withheld and replaced by an exact bounded transverse footprint',()=>{
 const c=config({radiusM:2,lengthM:10,magneticT:.05,energyEVPerU:.1,pitchDeg:85,neutralDensityM3:0,particles:1});
 const simulation=simulateHydrogenTracer(c),trace=simulation.traces[0],path=simulation.paths[0];
 assert.equal(path.chargedDisplay,'withheld-phase-resolution');assert.deepEqual(path.charged,[]);assert.ok(path.chargedProjectionXY.length<=254);
 path.chargedTerminalPosition.forEach((value,i)=>relative(value,trace.exitPosition[i],c.lengthM));
 const omega=E_CHARGE*c.magneticT/mass,center=[trace.initialVelocity[1]/omega,-trace.initialVelocity[0]/omega],radius=Math.hypot(...trace.initialVelocity.slice(0,2))/omega;
 for(const point of path.chargedProjectionXY)relative(Math.hypot(point[0]-center[0],point[1]-center[1]),radius);
 const first=path.chargedProjectionXY[0],last=path.chargedProjectionXY.at(-1)!;first.forEach((value,i)=>relative(value,last[i],radius));
 const resolved=simulateHydrogenTracer(config({neutralDensityM3:0,particles:1})).paths[0];assert.equal(resolved.chargedDisplay,'resolved-full-path');assert.ok(resolved.charged.length<=4097);
});

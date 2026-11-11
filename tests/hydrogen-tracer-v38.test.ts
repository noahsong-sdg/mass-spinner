import test from 'node:test';
import assert from 'node:assert/strict';
import {AMU,E_CHARGE} from '../src/physics.js';
import {PROTON_MASS_U,hydrogenCaptureHazard} from '../src/hydrogen-charge-exchange.js';
import {DEFAULT_HYDROGEN_TRACER as defaults,hydrogenHelix,neutralHydrogenExit,traceHydrogenFirstCapture,uninterruptedHydrogenExit,simulateHydrogenTracer,validateHydrogenTracer} from '../src/hydrogen-tracer.js';
const close=(a:number,b:number,scale=Math.max(Math.abs(a),Math.abs(b),1e-100))=>assert.ok(Math.abs(a-b)<1e-11*scale,`${a} != ${b}`);
test('zero B and zero density recover the straight ray and original injected-nucleus counts',()=>{
 const c={...defaults,magneticT:0,neutralDensityM3:0},t=traceHydrogenFirstCapture(c,.5,.6),v=t.initialVelocity;
 const expected=Math.min(c.radiusM/Math.hypot(v[0],v[1]),.98*c.lengthM/v[2]);close(t.exitTimeS,expected);
 for(let i=0;i<3;i++)close(t.exitPosition[i],(i===2?.02*c.lengthM:0)+v[i]*expected);
 const r=simulateHydrogenTracer(c);assert.equal(r.primary.chargedOut,c.particles);assert.equal(r.primary.neutralOut,0);assert.equal(r.ledger.retainedReservoirIons,0);assert.equal(r.expectedCaptureFraction,0);
});
test('signed B and arbitrarily small B follow a continuous exact helix with constant energy',()=>{
 for(const b of [0,Number.MIN_VALUE,1e-20,.002,-.002,.05]){
  const c={...defaults,magneticT:b,neutralDensityM3:0},t=traceHydrogenFirstCapture(c,.4,1.2);
  close(t.initialVelocity.reduce((n,v)=>n+v*v,0),t.exitVelocity.reduce((n,v)=>n+v*v,0));
  close(t.exitPosition[2],.02*c.lengthM+t.initialVelocity[2]*t.exitTimeS);
  if(Math.abs(b)<1e-10)close(t.exitTimeS,c.radiusM/Math.hypot(t.initialVelocity[0],t.initialVelocity[1]));
 }
 const a=traceHydrogenFirstCapture({...defaults,magneticT:.002,neutralDensityM3:0},.5,0),b=traceHydrogenFirstCapture({...defaults,magneticT:-.002,neutralDensityM3:0},.5,0);
 close(a.exitPosition[0],b.exitPosition[0]);close(a.exitPosition[1],-b.exitPosition[1]);
});
test('first-capture exponential event, absorbing-boundary tie and post-capture ballistic exit use no timestep',()=>{
 const c={...defaults,neutralDensityM3:1e19},no=traceHydrogenFirstCapture({...c,neutralDensityM3:0},.5),boundary=no.exitTimeS;
 const rate=hydrogenCaptureHazard(no.initialVelocity,c.neutralDensityM3).ratePerS;
 const captureAt=(t:number)=>-Math.expm1(-rate*t);
 const t=traceHydrogenFirstCapture(c,captureAt(boundary*.3));close(t.captureTimeS!,boundary*.3);assert.equal(t.exitChargeState,0);assert.equal(t.slowIon?.chargeState,1);
 for(let i=0;i<3;i++)close(t.exitPosition[i],t.capturePosition![i]+t.exitVelocity[i]*(t.exitTimeS-t.captureTimeS!));
 assert.equal(traceHydrogenFirstCapture(c,captureAt(boundary)).captured,false);
 assert.equal(traceHydrogenFirstCapture(c,captureAt(boundary*1.01)).captured,false);
 const expected=1-Math.exp(-rate*boundary);close(simulateHydrogenTracer(c).expectedCaptureFraction,expected);
});
test('capture retains both products and canonical angular momentum while B supplies mechanical torque',()=>{
 const mass=PROTON_MASS_U*AMU;
 for(const b of [-.05,-.002,0,.002,.05])for(const energy of [.1,1,20]){
  const c={...defaults,magneticT:b,energyEVPerU:energy},t=traceHydrogenFirstCapture(c,0,.8);assert.ok(t.captured);
  close(.5*mass*t.initialVelocity.reduce((n,v)=>n+v*v,0),.5*mass*t.exitVelocity.reduce((n,v)=>n+v*v,0));
  assert.deepEqual(t.slowIon!.velocity,[0,0,0]);assert.equal(t.ledger.reactionKineticErrorJ,0);assert.deepEqual(t.ledger.reactionMomentumErrorKGMS,[0,0,0]);
  const scale=mass*Math.hypot(...t.initialVelocity)*c.radiusM;
  assert.ok(Math.abs(t.ledger.finalCanonicalAngularMomentum)<1e-11*scale);assert.ok(Math.abs(t.ledger.mechanicalAngularBalanceError)<1e-11*scale);
 }
 const r=simulateHydrogenTracer({...defaults,neutralDensityM3:1e19});
 assert.equal(r.primary.end+r.primary.wall,r.primary.injected);assert.equal(r.ledger.incomingChargeE,r.ledger.outgoingChargeE+r.ledger.retainedChargeE);
 assert.equal(r.ledger.incomingTaggedNuclei+r.ledger.incomingReservoirNuclei,r.ledger.outgoingTaggedNuclei+r.ledger.retainedReservoirIons);
 close(r.ledger.initialNuclearKineticJ,r.ledger.finalNuclearKineticJ);
});
test('general-ion fields, unsupported energy and nonphysical numerical domains cannot silently enter this experiment',()=>{
 for(const change of [{atomicIdentity:'Ar-40'},{electricFieldVM:1},{rfAmplitudeVM:1},{energyEVPerU:20.1},{pitchDeg:90},{radiusM:Number.MIN_VALUE},{lengthM:0},{particles:0},{seed:-1}])assert.throws(()=>validateHydrogenTracer({...defaults,...change} as any));
 const c={...defaults,pitchDeg:0},v:[number,number,number]=[0,0,10000];assert.equal(uninterruptedHydrogenExit(c,v).destination,'end');
 close(hydrogenHelix(c,v,.00001).position[2],.02*c.lengthM+.1);
});
test('roundoff-scale grazing-wall positions absorb now while exterior inputs are rejected',()=>{
 const p:[number,number,number]=[2.980546355314126e-9,-.2,.32615926237843307];
 const v:[number,number,number]=[-31062.088171379135,-.0009258199368765015,31062.088171379153];
 const result=neutralHydrogenExit(defaults,p,v);assert.equal(result.timeS,0);assert.equal(result.destination,'wall');
 assert.throws(()=>neutralHydrogenExit(defaults,[.2*(1+1e-10),0,.3],v),/outside/);
 assert.throws(()=>neutralHydrogenExit(defaults,[0,0,.6*(1+1e-10)],v),/outside/);
 assert.throws(()=>neutralHydrogenExit(defaults,[0,0,.3],[0,0,-1]),/forward/);
 const inside=neutralHydrogenExit(defaults,[.2*(1-1e-10),0,.3],[100,0,1]);assert.ok(inside.timeS>0);
 for(const magneticT of [-.003242784133898351,.003242784133898351])for(const energyEVPerU of [.1,10,20]){
  const c={...defaults,magneticT:magneticT*Math.sqrt(energyEVPerU/10),energyEVPerU};
  const v0=traceHydrogenFirstCapture({...c,neutralDensityM3:0},.5).initialVelocity;
  const boundary=uninterruptedHydrogenExit(c,v0).timeS,rate=hydrogenCaptureHazard(v0,c.neutralDensityM3).ratePerS;
  for(const delta of [1e-8,1e-10,1e-12,1e-14]){
   const t=traceHydrogenFirstCapture(c,-Math.expm1(-rate*boundary*(1-delta)));
   if(t.captured)assert.ok(t.exitTimeS>=t.captureTimeS!);
  }
 }
});

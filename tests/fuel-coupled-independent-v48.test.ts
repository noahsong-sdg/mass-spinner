import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {advanceFuelCoupledStep,sampleFuelTransport,simulateFuelTransport} from '../src/fuel-transport.js';

const U=1.66053906892e-27,K=1.380649e-23;
const sum=(a:readonly number[])=>a.reduce((total,value)=>total+value,0);
const l1=(a:readonly number[],b:readonly number[])=>sum(a.map((value,i)=>Math.abs(value-b[i])));
const uniform=(n:number)=>Array<number>(n).fill(1/n);
function close(a:number,b:number,scale=1,tolerance=2e-10){
 assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=tolerance*Math.max(Math.abs(scale),1e-300),`${a} != ${b}; scale ${scale}`);
}
function setup(overrides:Partial<typeof DEFAULT_FUEL_CENTRIFUGE>={}){
 const result=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,...overrides});
 return {result,parameters:{radiusM:result.config.radiusM,gasK:result.config.gasK,lightFraction:result.config.lightFraction,
  diffusivityM2S:result.config.radialDiffusivityM2S,speciesMassKg:result.pair.masses.map(m=>m*U),mechanics:{...result.mechanics}}};
}
function inertia(p:ReturnType<typeof setup>['parameters'],light:readonly number[],heavy:readonly number[]){
 const x=p.lightFraction,[ml,mh]=p.speciesMassKg,w=x*ml/(x*ml+(1-x)*mh),n=light.length;
 return 2*p.mechanics.nn*sum(light.map((value,i)=>(w*value+(1-w)*heavy[i])*(i+.5)/n));
}
function freeEnergy(p:ReturnType<typeof setup>['parameters'],s:{lightMass:number[];heavyMass:number[];ionAngularMomentumKgM2S:number;neutralAngularMomentumKgM2S:number}){
 const x=p.lightFraction,[ml,mh]=p.speciesMassKg,mean=x*ml+(1-x)*mh;
 const neutralNumber=2*p.mechanics.nn/(mean*p.radiusM**2),n=s.lightMass.length;
 const entropy=(mass:number[])=>sum(mass.map(value=>value>0?value*Math.log(n*value):0));
 return s.ionAngularMomentumKgM2S**2/(2*p.mechanics.ii)+s.neutralAngularMomentumKgM2S**2/(2*inertia(p,s.lightMass,s.heavyMass))+
  neutralNumber*K*p.gasK*(x*entropy(s.lightMass)+(1-x)*entropy(s.heavyMass));
}

test('independent coupled inertia uses species mass weighting and current volume cell moments',()=>{
 for(const lightFraction of [0,.2,1]){
  const {parameters:p}=setup({lightFraction}),light=[.7,.2,.1],heavy=[.1,.3,.6];
  p.diffusivityM2S=0;p.mechanics.gamma=0;p.mechanics.drag=0;p.mechanics.torque=0;
  const ln=p.mechanics.nn*1e4,state={lightMass:light,heavyMass:heavy,ionAngularMomentumKgM2S:0,neutralAngularMomentumKgM2S:ln};
  const next=advanceFuelCoupledStep(p,state,.01),expected=inertia(p,light,heavy);
  close(next.neutralInertiaKgM2,expected,expected);
  close(next.neutralRadS,ln/expected,ln/expected);
  close(next.neutralAngularMomentumKgM2S,ln,ln);
 }
});

test('independent torque-free redistribution conserves angular momentum and slows the expanding gas',()=>{
 const {parameters:p}=setup();p.mechanics.gamma=0;p.mechanics.drag=0;p.mechanics.torque=0;
 const initial={lightMass:uniform(32),heavyMass:uniform(32),ionAngularMomentumKgM2S:0,neutralAngularMomentumKgM2S:p.mechanics.nn*4e4};
 const next=advanceFuelCoupledStep(p,initial,.03),ln=initial.neutralAngularMomentumKgM2S;
 assert.ok(next.neutralInertiaKgM2>p.mechanics.nn*1.1);
 assert.ok(next.neutralRadS<4e4/1.1);
 close(next.neutralAngularMomentumKgM2S,ln,ln);
 close(next.neutralInertiaKgM2*next.neutralRadS,ln,ln);
 close(sum(next.lightMass),1);close(sum(next.heavyMass),1);
 assert.ok(next.lightMass.every(value=>value>=0)&&next.heavyMass.every(value=>value>=0));
 assert.ok(freeEnergy(p,next)<=freeEnergy(p,initial)+1e-11);
});

test('independent constant-inertia limit matches direct backward-Euler angular impulse equations',()=>{
 const {parameters:p}=setup();p.diffusivityM2S=0;
 Object.assign(p.mechanics,{ii:.3,nn:2,gamma:.8,drag:.4,torque:.7});
 const state={lightMass:uniform(8),heavyMass:uniform(8),ionAngularMomentumKgM2S:-.2,neutralAngularMomentumKgM2S:.6},dt=.1;
 const {ii,nn,gamma,drag,torque}=p.mechanics;
 const a=1+dt*gamma/ii,b=-dt*gamma/nn,c=-dt*gamma/ii,d=1+dt*(gamma+drag)/nn;
 const rhsI=state.ionAngularMomentumKgM2S+dt*torque,rhsN=state.neutralAngularMomentumKgM2S,det=a*d-b*c;
 const expectedI=(rhsI*d-b*rhsN)/det,expectedN=(a*rhsN-c*rhsI)/det;
 const next=advanceFuelCoupledStep(p,state,dt);
 close(next.ionAngularMomentumKgM2S,expectedI);close(next.neutralAngularMomentumKgM2S,expectedN);
 close(next.driveImpulseKgM2S,dt*torque);close(next.dragImpulseKgM2S,dt*drag*expectedN/nn);
 close(next.ionAngularMomentumKgM2S+next.neutralAngularMomentumKgM2S-state.ionAngularMomentumKgM2S-state.neutralAngularMomentumKgM2S,
  next.driveImpulseKgM2S-next.dragImpulseKgM2S);
});

test('independent undriven entropy-plus-rotation free energy decreases under coupled relaxation',()=>{
 const {parameters:p}=setup();p.mechanics.torque=0;
 const light=Array.from({length:24},(_,i)=>(1+.4*Math.cos(2*Math.PI*(i+.5)/24))/24),heavy=[...light].reverse();
 let state={lightMass:light,heavyMass:heavy,ionAngularMomentumKgM2S:p.mechanics.ii*(-2e4),neutralAngularMomentumKgM2S:p.mechanics.nn*1e4};
 let energy=freeEnergy(p,state);
 for(const dt of [1e-7,1e-5,.001,.01,.1,1]){
  const next=advanceFuelCoupledStep(p,state,dt),current=freeEnergy(p,next);
  assert.ok(current<=energy+2e-10*Math.max(1,energy),`free energy grew ${energy} -> ${current} at dt=${dt}`);
  const totalBefore=state.ionAngularMomentumKgM2S+state.neutralAngularMomentumKgM2S;
  const totalAfter=next.ionAngularMomentumKgM2S+next.neutralAngularMomentumKgM2S;
  close(totalAfter-totalBefore,-next.dragImpulseKgM2S,Math.abs(totalBefore)+Math.abs(next.dragImpulseKgM2S));
  close(sum(next.lightMass),1);close(sum(next.heavyMass),1);
  state=next;energy=current;
 }
});

test('independent direction reversal changes angular signs, not radial separation',()=>{
 const {parameters:p}=setup(),state={lightMass:uniform(24),heavyMass:uniform(24),ionAngularMomentumKgM2S:p.mechanics.ii*2e4,neutralAngularMomentumKgM2S:p.mechanics.nn*1e4};
 const forward=advanceFuelCoupledStep(p,state,.02),reverse=advanceFuelCoupledStep({...p,mechanics:{...p.mechanics,torque:-p.mechanics.torque}},
  {...state,ionAngularMomentumKgM2S:-state.ionAngularMomentumKgM2S,neutralAngularMomentumKgM2S:-state.neutralAngularMomentumKgM2S},.02);
 assert.ok(l1(forward.lightMass,reverse.lightMass)<2e-10);assert.ok(l1(forward.heavyMass,reverse.heavyMass)<2e-10);
 close(forward.ionRadS,-reverse.ionRadS,forward.ionRadS);close(forward.neutralRadS,-reverse.neutralRadS,forward.neutralRadS);
});

// Independent method-of-lines oracle: direct conservative face fluxes and RK4.
// It calls neither the production SG step nor the production nonlinear rotor step.
function explicitOracle(p:ReturnType<typeof setup>['parameters'],cells:number,duration:number,steps:number){
 const {ii,nn,gamma,drag,torque}=p.mechanics,alpha=ii/nn,g=gamma/nn,rate=4*p.diffusivityM2S/p.radiusM**2,dt=duration/steps;
 const derivative=(state:number[])=>{
  const light=state.slice(0,cells),heavy=state.slice(cells,2*cells),omegaI=state[2*cells]/alpha,omegaN=state[2*cells+1]/(inertia(p,light,heavy)/nn);
  const change=Array<number>(2*cells+2).fill(0);
  for(let species=0;species<2;species++){
   const beta=p.speciesMassKg[species]*omegaN**2*p.radiusM**2/(2*K*p.gasK),z=beta/cells;
   const inward=z<1e-8?1-z/2+z*z/12:z/Math.expm1(z),outward=inward+z,offset=species*cells;
   for(let i=0;i<cells-1;i++){
    const flux=rate*(i+1)*cells*(outward*state[offset+i]-inward*state[offset+i+1]);
    change[offset+i]-=flux;change[offset+i+1]+=flux;
   }
  }
  change[2*cells]=torque/nn-g*(omegaI-omegaN);
  change[2*cells+1]=g*(omegaI-omegaN)-(drag/nn)*state[2*cells+1];
  return change;
 };
 let state=[...uniform(cells),...uniform(cells),0,0];
 const shifted=(a:number[],b:number[],factor:number)=>a.map((value,i)=>value+factor*b[i]);
 for(let step=0;step<steps;step++){
  const a=derivative(state),b=derivative(shifted(state,a,dt/2)),c=derivative(shifted(state,b,dt/2)),d=derivative(shifted(state,c,dt));
  state=state.map((value,i)=>value+dt*(a[i]+2*b[i]+2*c[i]+d[i])/6);
 }
 return {light:state.slice(0,cells),heavy:state.slice(cells,2*cells),ion:state[2*cells]*nn,neutral:state[2*cells+1]*nn};
}

test('independent conservative ODE oracle and joint momentum/distribution timestep refinement agree',()=>{
 const {result,parameters:p}=setup({durationS:.4,currentA:.06}),cells=12,reference=explicitOracle(p,cells,result.config.durationS,16000);
 const errors=[128,256,512].map(steps=>{
  const last=simulateFuelTransport(result,{cells,steps}).snapshots.at(-1)!;
  return l1(last.lightMass,reference.light)+l1(last.heavyMass,reference.heavy)+
   Math.abs(last.ionAngularMomentumKgM2S-reference.ion)/Math.max(Math.abs(reference.ion),1e-100)+
   Math.abs(last.neutralAngularMomentumKgM2S-reference.neutral)/Math.max(Math.abs(reference.neutral),1e-100);
 });
 assert.ok(errors[1]<.65*errors[0]&&errors[2]<.65*errors[1],`joint convergence failed: ${errors}`);
 assert.ok(errors[2]<.01,`coupled rate/distribution disagrees with independent ODE: ${errors}`);
});

test('independent timeline interpolation derives speed from interpolated inventory and angular momentum',()=>{
 const {result,parameters:p}=setup({currentA:.06}),model=simulateFuelTransport(result,{cells:24,steps:256});
 const a=model.snapshots[13],b=model.snapshots[14],fraction=.37,t=a.timeS+(b.timeS-a.timeS)*fraction,s=sampleFuelTransport(model,t);
 const ln=(1-fraction)*a.neutralAngularMomentumKgM2S+fraction*b.neutralAngularMomentumKgM2S;
 const li=(1-fraction)*a.ionAngularMomentumKgM2S+fraction*b.ionAngularMomentumKgM2S;
 close(s.neutralAngularMomentumKgM2S,ln,ln);close(s.ionAngularMomentumKgM2S,li,li);
 const exactI=inertia(p,s.lightMass,s.heavyMass);
 close(s.neutralInertiaKgM2,exactI,exactI);close(s.neutralRadS,ln/exactI,ln/exactI);
 close(s.ionRadS,li/p.mechanics.ii,li/p.mechanics.ii);
 assert.equal(sampleFuelTransport(model,model.durationS+1),model.snapshots.at(-1));
});

test('independent coupled radial refinement converges inventory distributions and the gas inertia',()=>{
 const {result}=setup({currentA:.06,durationS:.4}),steps=2048;
 const reference=simulateFuelTransport(result,{cells:128,steps}).snapshots.at(-1)!;
 const aggregate=(mass:number[],cells:number)=>Array.from({length:cells},(_,i)=>sum(mass.slice(i*128/cells,(i+1)*128/cells)));
 const errors=[16,32,64].map(cells=>{
  const state=simulateFuelTransport(result,{cells,steps}).snapshots.at(-1)!;
  return l1(state.lightMass,aggregate(reference.lightMass,cells))+l1(state.heavyMass,aggregate(reference.heavyMass,cells))+
   Math.abs(state.neutralInertiaRatio-reference.neutralInertiaRatio);
 });
 assert.ok(errors[1]<.7*errors[0]&&errors[2]<.7*errors[1],`coupled radial refinement failed: ${errors}`);
 assert.ok(errors[2]<.005,`radial distribution/inertia gate failed: ${errors}`);
});

test('independent coupled rest, zero duration and absent species retain physical endpoint semantics',()=>{
 for(const lightFraction of [0,1]){
  const {result}=setup({lightFraction,currentA:0}),model=simulateFuelTransport(result,{cells:16,steps:32});
  for(const state of model.snapshots){
   close(state.ionRadS,0);close(state.neutralRadS,0);close(state.neutralInertiaRatio,1);
   close(state.angularMomentum.driveImpulseKgM2S,0);close(state.angularMomentum.dragImpulseKgM2S,0);
   close(state.angularMomentum.residualKgM2S,0);close(state.energy.kineticJ,0);
   assert.ok(l1(state.lightMass,uniform(16))<2e-10&&l1(state.heavyMass,uniform(16))<2e-10);
  }
 }
 const {result,parameters:p}=setup({durationS:0}),instant=simulateFuelTransport(result),initial=instant.snapshots[0];
 assert.equal(instant.snapshots.length,1);close(initial.timeS,0);close(initial.neutralInertiaRatio,1);
 const state={lightMass:uniform(16),heavyMass:uniform(16),ionAngularMomentumKgM2S:0,neutralAngularMomentumKgM2S:0};
 assert.throws(()=>advanceFuelCoupledStep(p,state,-1),RangeError);
 assert.throws(()=>advanceFuelCoupledStep(p,{...state,heavyMass:[1]},.01),RangeError);
 assert.throws(()=>advanceFuelCoupledStep(p,{...state,neutralAngularMomentumKgM2S:NaN},.01),RangeError);
});

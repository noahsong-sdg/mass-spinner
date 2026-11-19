import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceFuelSpatialOperation,createFuelSpatialStepper,type FuelSpatialSetup,type FuelSpatialState} from '../src/fuel-spatial-operation.js';
import {solveFuelCurrent} from '../src/fuel-current.js';
import {createFuelLiner,initialFuelLinerEnergy,fuelLinerState,tungstenThermalProperties} from '../src/fuel-thermal.js';
import {fuelArgonNeutralTransport} from '../src/fuel-neutral-transport.js';
import {advanceFuelGasMass} from '../src/fuel-gas.js';
const K=1.380649e-23,sum=(v:readonly number[])=>v.reduce((a,b)=>a+b,0);
function fixture(){
 const n=4,nz=3,R=.01,L=.1,N=1e19,liner=createFuelLiner({radiusM:R,lengthM:L,thicknessM:.001,cells:3});
 const c:FuelSpatialSetup={number:N,lightFraction:.3,speciesMassKg:[6*1.66053906892e-27,7*1.66053906892e-27],
  radiusM:R,lengthM:L,diffusivityM2S:.001,material:'lithium',liner,boundary:{gasWallWK:.1,coolingWK:0,coolantK:1000},
  electrical:{radialEdgesM:Array.from({length:n+1},(_,i)=>R*Math.sqrt(i/n)),axialEdgesM:Array.from({length:nz+1},(_,j)=>L*j/nz),
   sigmaPerpSM:Array(n*nz).fill(.01),sigmaParallelSM:Array(n*nz).fill(.1),magneticT:.5,
   innerVoltageV:Array(nz).fill(null),outerVoltageV:Array(nz).fill(.01),lowerVoltageV:Array(n).fill(null),upperVoltageV:[0,0,null,null]}};
 const s:FuelSpatialState={lightMass:Array(n).fill(1/n),heavyMass:Array(n).fill(1/n),omegaRadS:[2e5,1.8e5,1.6e5,1.4e5],
  gasEnergyJ:[900,1000,1100,1200].map(t=>1.5*K*N/n*t),linerEnergyJ:initialFuelLinerEnergy(liner,1000)};
 return {c,s};
}
test('coupled accepted species, local inertia, current, shear and heat close the total energy and angular ledgers',()=>{
 const {c,s}=fixture(),a=advanceFuelSpatialOperation(c,s,1e-4);
 assert.ok(Math.abs(sum(a.state.lightMass)-1)<1e-12);assert.ok(Math.abs(sum(a.state.heavyMass)-1)<1e-12);
 assert.ok(a.state.lightMass.every(v=>v>0)&&a.state.heavyMass.every(v=>v>0));
 assert.ok(a.thermal.gasTemperatureK.every(v=>v>0));assert.ok(a.momentum.increment.shearHeatJ>0);
 assert.ok(a.electrical.jouleW>0);assert.ok(a.momentum.increment.advectionNumericalLossJ>0);
 assert.ok(Math.abs(a.momentum.energyResidualJ)<1e-12);assert.ok(Math.abs(a.energyResidualJ)<1e-9);
 assert.ok(Math.abs(a.momentum.angularResidualKgM2S)<1e-18);
 const light=advanceFuelGasMass(s.lightMass,a.thermal.gasTemperatureK,c.speciesMassKg[0],a.state.omegaRadS,c.radiusM,c.diffusivityM2S,1e-4);
 light.mass.forEach((v,i)=>assert.ok(Math.abs(v-a.state.lightMass[i])<1e-10));
 assert.ok(a.state.omegaRadS.some((v,i)=>v!==s.omegaRadS[i]));
});
test('zero step preserves canonical state and runtime property domains reject extrapolation',()=>{
 const {c,s}=fixture(),a=advanceFuelSpatialOperation(c,s,0);
 a.state.omegaRadS.forEach((v,i)=>assert.ok(Math.abs(v-s.omegaRadS[i])<1e-9));
 a.state.gasEnergyJ.forEach((v,i)=>assert.ok(Math.abs(v-s.gasEnergyJ[i])<1e-14));
 assert.equal(Math.abs(a.inputWorkJ),0);
 for(const temperatureK of [299,20001])assert.throws(()=>fuelArgonNeutralTransport(temperatureK),
  {name:'RangeError',message:'Neutral Ar table temperature must be 300–20000 K.'});
 assert.throws(()=>advanceFuelSpatialOperation({...c,electrical:{...c.electrical,radialEdgesM:[0,.002,.004,.006,.01]}},s,.01),/same equal-volume/);
});
test('local rotation SG force reduces exactly to the rigid closure for a constant field',()=>{
 const mass=[.1,.2,.3,.4],temperature=[500,600,700,800],m=7*1.66053906892e-27;
 assert.deepEqual(advanceFuelGasMass(mass,temperature,m,3e4,.01,.001,.01),advanceFuelGasMass(mass,temperature,m,[3e4,3e4,3e4,3e4],.01,.001,.01));
 assert.throws(()=>advanceFuelGasMass(mass,temperature,m,[3e4],.01,.001,.01));
});
test('nested fine gas and coarse electrical cells preserve source power and accepted inertia',()=>{
 const {c,s}=fixture();
 s.lightMass=Array(8).fill(1/8);s.heavyMass=Array(8).fill(1/8);
 s.gasEnergyJ=Array(8).fill(1.5*K*c.number/8*1000);
 s.omegaRadS=[2000,-1000,3000,1000,-2000,4000,1000,-3000];
 const a=advanceFuelSpatialOperation(c,s,1e-6),b=createFuelSpatialStepper(c)(s,1e-6);
 assert.deepEqual(a,b);
 const omega=Array.from({length:4},(_,i)=>(a.sourceOmegaRadS[2*i]+a.sourceOmegaRadS[2*i+1])/2);
 const reference=solveFuelCurrent({...c.electrical,omegaRadS:Array.from({length:12},(_,i)=>omega[i%4])});
 for(const key of ['jouleW','mechanicalW','electrodePowerW'] as const)
  assert.ok(Math.abs(a.electrical[key]-reference[key])<1e-9*Math.max(Math.abs(reference[key]),1e-12));
 const work=sum(a.torqueNmByGasCell.map((v,i)=>v*a.sourceOmegaRadS[i]));
 assert.ok(Math.abs(work-a.electrical.mechanicalW)<1e-13*Math.max(Math.abs(work),1e-12));
 assert.ok(Math.abs(sum(a.jouleWByGasCell)-a.electrical.jouleW)<1e-13*a.electrical.jouleW);
 assert.ok(Math.abs(sum(a.torqueNmByGasCell)-sum(a.electrical.torqueNm))<1e-13*sum(a.electrical.torqueNm.map(Math.abs)));
 assert.ok(Math.abs(a.mechanicalEndpointDefectJ)<1e-17);
 assert.ok(Math.abs(a.momentum.angularResidualKgM2S)<1e-20);
 assert.ok(Math.abs(a.energyResidualJ)<1e-10);
 assert.equal(a.state.lightMass.length,8);assert.equal(a.electrical.torqueNm.length,12);
 const invalid={...s,lightMass:Array(6).fill(1/6),heavyMass:Array(6).fill(1/6),
  gasEnergyJ:Array(6).fill(1.5*K*c.number/6*1000),omegaRadS:Array(6).fill(0)};
 assert.throws(()=>advanceFuelSpatialOperation(c,invalid,1e-6),/equal-volume/);
});

test('fine gas cells retain tiny temperature-driven transfers in the coupled heat solve',()=>{
 const {c,s}=fixture(),n=1024;
 s.lightMass=Array(n).fill(1/n);s.heavyMass=Array(n).fill(1/n);s.omegaRadS=Array(n).fill(0);
 s.gasEnergyJ=Array(n).fill(1.5*K*c.number/n*1000);
 const a=advanceFuelSpatialOperation(c,s,1e-6/64);
 assert.ok(a.thermal.gasTemperatureIncrementK.some(v=>v>0));
 assert.ok(a.thermal.gasTemperatureIncrementK.every(Number.isFinite));
 assert.ok(a.state.lightMass.every(v=>v>0));
 assert.ok(a.thermal.massStorageDefectBySpecies.every(row=>row.every(Number.isFinite)));
});

test('repeated sub-ULP wall heat survives the stored coupled state and JSON continuation',()=>{
 for(const gasK of [900,1100]){
 const {c,s}=fixture();
 c.electrical.outerVoltageV.fill(0);s.omegaRadS.fill(0);
 s.gasEnergyJ.fill(1.5*K*c.number/s.lightMass.length*gasK);
 const step=createFuelSpatialStepper(c),initial=[...s.linerEnergyJ];
 let state=s,heat=0;
 for(let i=0;i<64;i++){
  // Each physical wall exchange is much smaller than the absolute wall ULP.
  const result=step(state,1e-16);heat+=result.thermal.gasExchangeJ;
  state=JSON.parse(JSON.stringify(result.state));
 }
 const correction=state.linerEnergyCorrectionJ!;
 assert.equal(correction.length,initial.length);
 const storedChange=sum(state.linerEnergyJ.map((u,i)=>(u-initial[i])+correction[i]));
 assert.ok(heat*(gasK-1000)>0);
 assert.ok(Math.abs(storedChange-heat)<.02*Math.abs(heat),`Stored wall heat ${storedChange} != accepted exchanges ${heat}`);
 }
});

test('paired wall state preserves zero time, old checkpoints and explicit zero corrections',()=>{
 const {c,s}=fixture(),step=createFuelSpatialStepper(c);
 assert.deepEqual(step(s,1e-8),step({...s,linerEnergyCorrectionJ:[0,0,0]},1e-8));
 const paired={...s,linerEnergyCorrectionJ:s.linerEnergyJ.map((u,i)=>(i===1?-1:1)*2**(Math.floor(Math.log2(u))-56))};
 const next=step(JSON.parse(JSON.stringify(paired)),0).state;
 assert.deepEqual(next.linerEnergyJ,paired.linerEnergyJ);
 assert.deepEqual(next.linerEnergyCorrectionJ,paired.linerEnergyCorrectionJ);
});

test('paired wall state rejects malformed, overlapping and out-of-domain words',()=>{
 const {c,s}=fixture();
 for(const low of [[0],[NaN,0,0],[Infinity,0,0],[1,0,0]])
  assert.throws(()=>fuelLinerState(c.liner,s.linerEnergyJ,low),/normalized/);
 const maximum=c.liner.massesKg.map(m=>m*tungstenThermalProperties(1900).specificEnthalpyJKg*(1+8*Number.EPSILON));
 const tiny=maximum.map(u=>2**(Math.floor(Math.log2(u))-56));
 assert.throws(()=>fuelLinerState(c.liner,maximum,tiny),/enthalpy domain/);
 assert.throws(()=>fuelLinerState(c.liner,[0,0,0],[-Number.MIN_VALUE,0,0]),/normalized|enthalpy domain/);
});

test('legacy states mean zero correction and zero time preserves nonzero paired energy exactly',()=>{
 const {c,s}=fixture(),step=createFuelSpatialStepper(c),legacy=JSON.parse(JSON.stringify(s));
 assert.deepEqual(step(legacy,1e-9),step({...legacy,linerEnergyCorrectionJ:[0,0,0]},1e-9));
 const low=s.linerEnergyJ.map((u,i)=>(i%2?-1:1)*Number.EPSILON*u/16);
 const paired=JSON.parse(JSON.stringify({...s,linerEnergyCorrectionJ:low})),a=step(paired,0);
 assert.deepEqual(a.state.linerEnergyJ,paired.linerEnergyJ);
 assert.deepEqual(a.state.linerEnergyCorrectionJ,paired.linerEnergyCorrectionJ);
});

test('supplied null, nonarray and sparse corrections cannot masquerade as legacy missing state',()=>{
 const {c,s}=fixture(),step=createFuelSpatialStepper(c);
 for(const bad of [null,{length:3},Array<number>(3)]){
  const correction=bad as unknown as number[];
  assert.throws(()=>step({...s,linerEnergyCorrectionJ:correction},0),/normalized/,'Supplied invalid correction must not reset stored energy.');
  assert.throws(()=>fuelLinerState(c.liner,s.linerEnergyJ,correction),/normalized/);
 }
});

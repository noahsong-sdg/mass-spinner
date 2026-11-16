import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceFuelSpatialOperation,createFuelSpatialStepper,type FuelSpatialSetup,type FuelSpatialState} from '../src/fuel-spatial-operation.js';
import {solveFuelCurrent} from '../src/fuel-current.js';
import {createFuelLiner,initialFuelLinerEnergy} from '../src/fuel-thermal.js';
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
 assert.equal(Math.abs(a.inputWorkJ),0);assert.throws(()=>fuelArgonNeutralTransport(299));assert.throws(()=>fuelArgonNeutralTransport(20001));
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

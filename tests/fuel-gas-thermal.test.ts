import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceFuelMixtureThermal,type FuelMixtureHeatSource} from '../src/fuel-gas-thermal.js';
import {advanceFuelGasMass} from '../src/fuel-gas.js';
import {createFuelLiner,initialFuelLinerEnergy} from '../src/fuel-thermal.js';

const K=1.380649e-23,sum=(a:readonly number[])=>a.reduce((s,v)=>s+v,0),n=6,N=1e18,R=.01,L=.1,x=.3;
const uniform=()=>Array<number>(n).fill(1/n),grid=createFuelLiner({radiusM:R,lengthM:L,thicknessM:.001,cells:3});
const wall=initialFuelLinerEnergy(grid,500),boundary={gasWallWK:0,coolingWK:0,coolantK:500};
const energies=(t:readonly number[],light=uniform(),heavy=uniform())=>t.map((v,i)=>1.5*K*N*(x*light[i]+(1-x)*heavy[i])*v);
const close=(a:number,b:number,scale=Math.max(Math.abs(a),Math.abs(b),1e-20))=>assert.ok(Math.abs(a-b)<2e-10*scale,`${a} != ${b}`);
function storedHeatClose(change:number,heat:number,newEnergy:number,oldEnergy:number){
 // A small heat is measured by subtracting two larger absolute energies.
 const bound=2e-10*Math.abs(heat)+32*Number.EPSILON*(Math.abs(newEnergy)+Math.abs(oldEnergy));
 assert.ok(Math.abs(change-heat)<=bound,`${change} != ${heat}; storage roundoff bound ${bound}`);
}
function source(light=uniform(),heavy=uniform(),heat=Array<number>(n).fill(0)):FuelMixtureHeatSource<undefined>{
 return {lightMass:light,heavyMass:heavy,faceTransfers:[Array<number>(n-1).fill(0),Array<number>(n-1).fill(0)],gasSourceJ:heat,dragEnergyJ:0,payload:undefined};
}
function run(t:readonly number[],dt:number,callback:(t:readonly number[])=>FuelMixtureHeatSource<undefined>,conductivityWMK=0,film=0){
 return advanceFuelMixtureThermal(grid,wall,energies(t),N,x,R,L,dt,{...boundary,gasWallWK:film},
  {conductivityWMK,lightMass:uniform(),heavyMass:uniform()},callback);
}
function entropy(t:readonly number[],light:readonly number[],heavy:readonly number[]){
 return K*N*sum(t.map((v,i)=>sum([x*light[i],(1-x)*heavy[i]].map(count=>count===0?0:count*(1.5*Math.log(v)-Math.log(count))))));
}

test('mixture energy preserves an exactly uniform isolated equilibrium and zero-time state',()=>{
 for(const dt of [0,.01,1]){
  const result=run(Array(n).fill(500),dt,()=>source(),.2,.1);
  result.gasTemperatureK.forEach(t=>close(t,500));result.temperatureK.forEach(t=>close(t,500));
  close(result.gasExchangeJ,0,1);close(result.coolingEnergyJ,0,1);close(result.residualJ,0,1);
 }
});

test('fixed-volume gas Fourier conduction conserves U and increases ideal-gas entropy',()=>{
 const initial=[450,470,490,510,530,550],result=run(initial,.01,()=>source(),.2);
 close(sum(result.gasEnergyJ),sum(energies(initial)));
 assert.ok(Math.max(...result.gasTemperatureK)<550&&Math.min(...result.gasTemperatureK)>450);
 assert.ok(entropy(result.gasTemperatureK,uniform(),uniform())>entropy(initial,uniform(),uniform()));
});

test('temperature-dependent conductivity preserves equilibrium, energy and entropy without changing the constant-property limit',()=>{
 const solveVariable=(initial:number[],property:(t:number)=>number)=>advanceFuelMixtureThermal(
  grid,wall,energies(initial),N,x,R,L,.01,boundary,
  {conductivityWMK:0,conductivityAtTemperature:property,lightMass:uniform(),heavyMass:uniform()},()=>source());
 const equilibrium=solveVariable(Array(n).fill(500),t=>.2*(t/500)**.863);
 equilibrium.gasTemperatureK.forEach(t=>close(t,500));
 const initial=[350,400,470,550,650,800],constant=run(initial,.01,()=>source(),.2);
 const callback=solveVariable(initial,()=>.2);
 callback.gasTemperatureK.forEach((t,i)=>close(t,constant.gasTemperatureK[i]));
 const nonlinear=solveVariable(initial,t=>.2*(t/500)**.863);
 close(sum(nonlinear.gasEnergyJ),sum(energies(initial)));
 assert.ok(Math.min(...nonlinear.gasTemperatureK)>350&&Math.max(...nonlinear.gasTemperatureK)<800);
 assert.ok(entropy(nonlinear.gasTemperatureK,uniform(),uniform())>entropy(initial,uniform(),uniform()));
 assert.ok(nonlinear.gasTemperatureK.some((t,i)=>Math.abs(t-constant.gasTemperatureK[i])>.01));
 for(const bad of [-1,NaN,Infinity])assert.throws(()=>solveVariable(initial,()=>bad),/conductivity/);
});

test('equal-volume gas FV gives the exact cylindrical flux for quadratic radial temperature',()=>{
 const slope=50,dt=.0001,k=.2,initial=Array.from({length:n},(_,i)=>550-slope*(i+.5)/n);
 // Manufactured cell heating balances the independent continuum face flux;
 // the outer sink enforces the insulated boundary without changing T(r).
 const expected=Array.from({length:n-1},(_,i)=>dt*4*Math.PI*L*k*(i+1)*slope/n);
 const heat=initial.map((_,i)=>(i<n-1?expected[i]:0)-(i?expected[i-1]:0));
 const result=run(initial,dt,()=>source(undefined,undefined,heat),k);
 result.gasTemperatureK.forEach((t,i)=>close(t,initial[i]));
 result.gasFaceEnergyJ.forEach((q,i)=>close(q,expected[i]));
});

test('gas and tungsten exchange share one heat flux and close the exact enthalpy budget',()=>{
 const initial=Array(n).fill(700),result=run(initial,.02,()=>source(),.2,.1);
 assert.ok(result.gasExchangeJ>0);assert.ok(result.innerK>500);assert.ok(result.meanGasK<700);
 close(sum(result.gasEnergyJ)-sum(energies(initial)),-result.gasExchangeJ);
 storedHeatClose(result.energyJ-sum(wall),result.gasExchangeJ,result.energyJ,sum(wall));
 close(sum(result.gasEnergyJ)+result.energyJ,sum(energies(initial))+sum(wall));
});

test('prescribed physical heat is deposited once and mechanical numerical heat is absent',()=>{
 const heat=[.001,0,0,0,0,.002],result=run(Array(n).fill(500),.01,()=>({...source(undefined,undefined,heat),dragEnergyJ:.003}));
 close(sum(result.gasEnergyJ)-sum(energies(Array(n).fill(500))),sum(heat));
 storedHeatClose(result.energyJ-sum(wall),.003,result.energyJ,sum(wall));assert.ok(result.maximumRowResidualJ<1e-10);
});

test('spatial species enthalpy and signed rotor work close energy and increase isolated entropy',()=>{
 const initial=[470,490,510,530,550,570],old=uniform(),omega=1.5e5,dt=.0002,masses=[3.321078e-27,6.642156e-27];
 const result=run(initial,dt,t=>{
  const moved=masses.map(m=>advanceFuelGasMass(old,t,m,omega,R,.001,dt)),heat=Array<number>(n).fill(0);
  for(let s=0;s<2;s++)for(let i=0;i<n-1;i++){
   const work=.5*omega**2*masses[s]*R**2/n*N*[x,1-x][s]*moved[s].faceTransfers[i];
   heat[i]+=work/2;heat[i+1]+=work/2;
  }
  return {lightMass:moved[0].mass,heavyMass:moved[1].mass,faceTransfers:moved.map(a=>a.faceTransfers),gasSourceJ:heat,dragEnergyJ:0,payload:undefined};
 });
 const moved=masses.map(m=>advanceFuelGasMass(old,result.gasTemperatureK,m,omega,R,.001,dt));
 close(sum(result.gasEnergyJ)-sum(energies(initial)),sum(result.gasSourceJ));
 assert.ok(result.speciesFaceEnergyJ.some(v=>Math.abs(v)>1e-8));
 assert.ok(entropy(result.gasTemperatureK,moved[0].mass,moved[1].mass)>=entropy(initial,old,old)-1e-14);
 assert.ok(result.gasTemperatureK.every(t=>t>0));
});

test('mixture energy rejects invented face transfers, zero-time work and invalid geometry',()=>{
 assert.throws(()=>run(Array(n).fill(500),.01,()=>({...source(),faceTransfers:[Array(n-1).fill(.01),Array(n-1).fill(0)]})),/accepted conservative/);
 assert.throws(()=>run(Array(n).fill(500),0,()=>({...source(),dragEnergyJ:.001})),/zero-time/);
 assert.throws(()=>advanceFuelMixtureThermal(grid,wall,energies(Array(n).fill(500)),N,x,R*2,L,.01,boundary,
  {conductivityWMK:.2,lightMass:uniform(),heavyMass:uniform()},()=>source()),/geometry/);
});

test('inward redistribution draws signed rotor work from gas without inventing heat',()=>{
 const old=[.04,.06,.1,.15,.25,.4],initial=Array(n).fill(500),omega=3000,dt=.0002,masses=[3.321078e-27,6.642156e-27];
 const result=advanceFuelMixtureThermal(grid,wall,energies(initial,old,old),N,x,R,L,dt,boundary,
  {conductivityWMK:0,lightMass:old,heavyMass:old},t=>{
   const moved=masses.map(m=>advanceFuelGasMass(old,t,m,omega,R,.001,dt)),heat=Array<number>(n).fill(0);
   for(let s=0;s<2;s++)for(let i=0;i<n-1;i++){
    const work=.5*omega**2*masses[s]*R**2/n*N*[x,1-x][s]*moved[s].faceTransfers[i];heat[i]+=work/2;heat[i+1]+=work/2;
   }
   return {lightMass:moved[0].mass,heavyMass:moved[1].mass,faceTransfers:moved.map(a=>a.faceTransfers),gasSourceJ:heat,dragEnergyJ:0,payload:undefined};
  });
 assert.ok(sum(result.gasSourceJ)<0);assert.ok(result.meanGasK<500);
 storedHeatClose(sum(result.gasEnergyJ)-sum(energies(initial,old,old)),sum(result.gasSourceJ),sum(result.gasEnergyJ),sum(energies(initial,old,old)));
 const moved=masses.map(m=>advanceFuelGasMass(old,result.gasTemperatureK,m,omega,R,.001,dt));
 assert.ok(entropy(result.gasTemperatureK,moved[0].mass,moved[1].mass)>=entropy(initial,old,old)-1e-14);
});

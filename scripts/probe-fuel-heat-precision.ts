/** Fixed-mass constant-κ gas seam; tungsten is disconnected. This tests
 * discrete solve arithmetic, not wall constitutive physics or BE truncation. */
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {advanceFuelMixtureThermal} from '../src/fuel-gas-thermal.js';
import {createFuelLiner,initialFuelLinerEnergy} from '../src/fuel-thermal.js';
const output=process.argv[2];mkdirSync(output);
const K=1.380649e-23,N=1e18,R=.01,L=.1,dtS=.01;
const grid=createFuelLiner({radiusM:R,lengthM:L,thicknessM:.001,cells:3});
const cases=[];
for(const n of [2,8,32])for(const backgroundK of [400,1000,1700])for(const k of [0,.2])
 for(const q of [0,2**-50,-(2**-50),2**-40,-(2**-40),2**-20,-(2**-20)]){
 const mass=Array(n).fill(1/n),capacityJK=mass.map(p=>1.5*K*(N*(.5*p+.5*p)));
 const oldEnergyJ=capacityJK.map(c=>c*backgroundK),sourceJ=mass.map((_,i)=>i===0?q:0);
 // Assemble the actual constant-property production coefficients independently
 // of its Newton residual, preserving binary64 primitives for Decimal lifting.
 const conductanceWK=Array.from({length:n-1},(_,i)=>k===0?0:4*Math.PI*L*(i+1)*2/(1/k+1/k));
 let native;
 try{
  const a=advanceFuelMixtureThermal(grid,initialFuelLinerEnergy(grid,backgroundK),oldEnergyJ,N,.5,R,L,dtS,
   {gasWallWK:0,coolingWK:0,coolantK:backgroundK},{conductivityWMK:k,lightMass:mass,heavyMass:mass},()=>({
    lightMass:mass,heavyMass:mass,faceTransfers:[Array(n-1).fill(0),Array(n-1).fill(0)],gasSourceJ:sourceJ,dragEnergyJ:0,payload:null}));
  native={temperatureIncrementK:a.gasTemperatureIncrementK,energyChangeJ:a.energyChangeJ.slice(0,n),
   faceEnergyJ:a.gasFaceEnergyJ,storedEnergyJ:a.gasEnergyJ,iterations:a.iterations,failure:null};
 }catch(error){native={failure:String(error)};}
 cases.push({n,backgroundK,dtS,capacityJK,conductanceWK,oldEnergyJ,sourceJ,native});
}
const sourceFiles=Object.fromEntries(['scripts/probe-fuel-heat-precision.ts','src/fuel-gas-thermal.ts','src/fuel-thermal.ts',
 'package-lock.json'].map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]));
writeFileSync(output+'/heat-precision-input.json',JSON.stringify({schemaVersion:1,sourceFiles,cases})+'\n');
console.log(JSON.stringify({cases:cases.length,failures:cases.filter(c=>c.native.failure).map(c=>({n:c.n,backgroundK:c.backgroundK,failure:c.native.failure}))}));
if(cases.some(c=>c.native.failure))process.exitCode=1;

/** Run inside safe-dev. Generate current-production states for an independent FiPy solve. */
import {writeFileSync} from 'node:fs';
import {createFuelLiner,initialFuelLinerEnergy,advanceFuelThermal,tungstenThermalProperties} from '../../src/fuel-thermal.js';

const specs=[
 {name:'equilibrium',cells:4,gasK:800,wallK:800,coolantK:800,gasWallWK:500,coolingWK:250,dtS:.04,steps:8,gasCapacityJK:2,gasW:0,dragW:0},
 {name:'nonlinear-exchange',cells:6,gasK:500,wallK:1500,coolantK:500,gasWallWK:400,coolingWK:0,dtS:.015,steps:16,gasCapacityJK:30,gasW:0,dragW:0},
 {name:'cooling-and-deposition',cells:8,gasK:1000,wallK:1200,coolantK:400,gasWallWK:600,coolingWK:800,dtS:.03,steps:16,gasCapacityJK:40,gasW:4000,dragW:1800},
 {name:'pulse-coast-reheat',cells:4,gasK:900,wallK:1000,coolantK:500,gasWallWK:350,coolingWK:450,dtS:.02,steps:20,gasCapacityJK:20,gasW:10000,dragW:4000},
 {name:'zero-film-isolated',cells:5,gasK:600,wallK:1200,coolantK:400,gasWallWK:0,coolingWK:0,dtS:.01,steps:10,gasCapacityJK:40,gasW:0,dragW:300},
 ...[.1,1000].map(gasWallWK=>({name:`low-inventory-${gasWallWK}`,cells:16,gasK:500,wallK:1000,coolantK:500,gasWallWK,coolingWK:1,dtS:1/512,steps:5,gasCapacityJK:1.5*10*Math.PI*.12**2*.8/500,gasW:0,dragW:0})),
];
const cases=specs.map(s=>{
 const lowInventory=s.name.startsWith('low-inventory');
 const config={radiusM:.12,lengthM:lowInventory?.8:.5,thicknessM:lowInventory?.001:.012,cells:s.cells,gasCapacityJK:s.gasCapacityJK,gasWallWK:s.gasWallWK,coolingWK:s.coolingWK,coolantK:s.coolantK};
 const grid=createFuelLiner(config),initial={gasK:s.gasK,wallK:Array(s.cells).fill(s.wallK)};
 let U=initialFuelLinerEnergy(grid,s.wallK),gasK=s.gasK,coolingEnergyJ=0;
 const steps=Array.from({length:s.steps},(_,i)=>{
  const on=s.name!=='pulse-coast-reheat'||i<5||i>=15;
  const gasEnergyJ=s.dtS*s.gasW*Number(on),linerEnergyJ=s.dtS*s.dragW*Number(on);
  const next=advanceFuelThermal(grid,U,gasK,s.gasCapacityJK,s.dtS,config,()=>({gasEnergyJ,dragEnergyJ:linerEnergyJ,payload:null}));
  U=next.cellEnergyJ;gasK=next.gasK;coolingEnergyJ+=next.coolingEnergyJ;
  return {dtS:s.dtS,gasEnergyJ,linerEnergyJ,expected:{gasK,wallK:next.temperatureK,coolingEnergyJ}};
 });
 return {name:s.name,config,initial,steps,temperatureToleranceK:5e-6};
});
const propertyProbes=[300,400,600,1000,1500,1900].map(temperatureK=>({temperatureK,...tungstenThermalProperties(temperatureK)}));
const out=process.argv[2]??'scientific/thermal-v53/reference-cases.json';
writeFileSync(out,JSON.stringify({description:'Current production states for independent actual-FiPy heat solve; no FiPy output imported',cases,propertyProbes},null,2)+'\n');
console.log(JSON.stringify({cases:cases.length,steps:cases.reduce((n,c)=>n+c.steps.length,0),propertyProbes,out}));

import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {advanceFuelThermal,createFuelLiner,initialFuelLinerEnergy} from '../src/fuel-thermal.js';

const config={radiusM:.12,lengthM:.8,thicknessM:.005,gasCapacityJK:.5,initialGasK:400,initialWallK:1200,durationS:.05,
 boundary:{gasWallWK:100,coolingWK:100,coolantK:500},gasPowerW:10};
const cases=[];
for(const cells of [8,16,32])for(const steps of [512,1024,2048]){
 const grid=createFuelLiner({...config,cells}),dt=config.durationS/steps;
 let energy=initialFuelLinerEnergy(grid,config.initialWallK),gasK=config.initialGasK,coolingEnergyJ=0;
 const history=[{timeS:0,gasK,temperatureK:Array<number>(cells).fill(config.initialWallK),coolingEnergyJ}];
 for(let step=1;step<=steps;step++){
  const state=advanceFuelThermal(grid,energy,gasK,config.gasCapacityJK,dt,config.boundary,()=>({gasEnergyJ:config.gasPowerW*dt,dragEnergyJ:0,payload:null}));
  energy=state.cellEnergyJ;gasK=state.gasK;coolingEnergyJ+=state.coolingEnergyJ;
  if(step%(steps/32)===0)history.push({timeS:step*dt,gasK,temperatureK:state.temperatureK,coolingEnergyJ});
 }
 cases.push({cells,steps,history});
}
mkdirSync('science-evidence',{recursive:true});
writeFileSync('science-evidence/thermal-live.json',JSON.stringify({schemaVersion:1,sourceSHA256:Object.fromEntries(['src/fuel-thermal.ts','src/array-shape.ts','scripts/export-thermal-toolchain.ts','package-lock.json'].map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')])),config,cases})+'\n');

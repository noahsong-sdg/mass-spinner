/** Actual mixture kernel, frozen inventories and thermostatted hot solid.
 * Thermostat power is supplied through the existing positive solid source;
 * it exactly compensates the gas/solid exchange, not a new production BC.
 * Execute only inside safe-dev.
 */
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {advanceFuelMixtureThermal} from '../../src/fuel-gas-thermal.js';
import {createFuelLiner,initialFuelLinerEnergy,conductances} from '../../src/fuel-thermal.js';

const K=1.380649e-23,R=.12,L=.8,P=10,initialGasK=500,wallK=1000,k=.1,G=.1,durationS=.02;
const number=P*Math.PI*R*R*L/(K*initialGasK),capacity=1.5*K*number;
const times=[0,...Array.from({length:121},(_,i)=>1e-7*(durationS/1e-7)**(i/120))];
function run(cells:number,steps:number){
 const wallCells=cells/4,grid=createFuelLiner({radiusM:R,lengthM:L,thicknessM:.001,cells:wallCells});
 const boundary={gasWallWK:G,coolingWK:0,coolantK:500},mass=Array<number>(cells).fill(1/cells);
 const halfGas=1/(8*Math.PI*L*k*cells),solidInner=conductances(grid,Array<number>(wallCells).fill(wallK),boundary).inner;
 const link=1/(1/solidInner+halfGas),initialEnergy=capacity*initialGasK;
 let solid=initialFuelLinerEnergy(grid,wallK),gas=mass.map(()=>initialEnergy/cells),time=0,heat=0,index=1,maxWall=0,maxBudget=0;
 const state=(t:number,energy:number[],cumulativeGasHeatJ:number)=>{
  const temperatureK=energy.map(u=>u/(capacity/cells)),wallFluxW=link*(wallK-temperatureK.at(-1)!);
  return {timeS:t,temperatureK,gasEnergyJ:energy.reduce((a,b)=>a+b,0),cumulativeGasHeatJ,wallFluxW,gasSurfaceK:temperatureK.at(-1)!+wallFluxW*halfGas};
 };
 const states=[state(0,gas,0)];
 for(let j=1;j<=steps;j++){
  const target=j===steps?durationS:durationS*(j/steps)**2,dt=target-time,oldGas=gas,oldHeat=heat;
  const next=advanceFuelMixtureThermal(grid,solid,gas,number,.0759,R,L,dt,boundary,
   {conductivityWMK:k,lightMass:mass,heavyMass:mass},temperatures=>({lightMass:mass,heavyMass:mass,
    faceTransfers:[Array<number>(cells-1).fill(0),Array<number>(cells-1).fill(0)],gasSourceJ:Array<number>(cells).fill(0),
    dragEnergyJ:dt*link*(wallK-temperatures.at(-1)!),payload:undefined}));
  solid=next.cellEnergyJ;gas=next.gasEnergyJ;heat-=next.gasExchangeJ;
  maxWall=Math.max(maxWall,...next.temperatureK.map(t=>Math.abs(t-wallK)));
  maxBudget=Math.max(maxBudget,Math.abs(gas.reduce((a,b)=>a+b,0)-initialEnergy-heat));
  while(index<times.length&&times[index]<=target){
   const t=times[index++],f=(t-time)/dt;
   states.push(state(t,gas.map((u,i)=>oldGas[i]+f*(u-oldGas[i])),oldHeat+f*(heat-oldHeat)));
  }
  time=target;
 }
 assert.equal(states.length,times.length);assert.ok(maxWall<1e-8&&maxBudget<2e-10);
 const output={name:`robin-n${cells}-t${steps}`,cells,wallCells,steps,durationS,radiusM:R,lengthM:L,number,
  conductivityWMK:k,gasWallWK:G,initialGasK,wallK,wallThicknessM:.001,
  radiusEdgesM:Array.from({length:cells+1},(_,i)=>R*Math.sqrt(i/cells)),maximumWallDeviationK:maxWall,
  maximumGasEnergyBudgetJ:maxBudget,states};
 console.log(JSON.stringify({name:output.name,maximumWallDeviationK:maxWall,maximumGasEnergyBudgetJ:maxBudget}));
 return output;
}
const grids=process.argv[3]==='fine'?[[512,8192]]:[...[64,128,256].flatMap(n=>[512,2048,8192].map(t=>[n,t])),[32,512]];
const cases=grids.map(([cells,steps])=>run(cells,steps));
writeFileSync(process.argv[2],JSON.stringify({schemaVersion:1,kernel:'advanceFuelMixtureThermal',
 constants:{radiusM:R,lengthM:L,number,initialK:initialGasK,wallK,conductivityWMK:k,gasWallWK:G,wallThicknessM:.001},
 scope:'Frozen species inventories, zero rotation, hot solid held by recorded thermostat power; continuum Robin boundary comparison only.',cases}));

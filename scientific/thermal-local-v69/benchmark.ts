/** Limiting thermal benchmark, executed only in the parent's offline VM. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createFuelLiner,initialFuelLinerEnergy} from '../../src/fuel-thermal.js';
import {advanceFuelMixtureThermal} from '../../src/fuel-gas-thermal.js';
import {fuelNeutralTransport} from '../../src/fuel-neutral-transport.js';
const manifest=JSON.parse(readFileSync('v43-last-manifest.json','utf8'));
const sourceSHA256=createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(manifest).sort(([a],[b])=>a<b?-1:a>b?1:0)))).digest('hex');
const output=process.argv[2],R=.01,L=.1,N=1e19,K=1.380649e-23,ng=64;
writeFileSync(output,'{"sourceSHA256":'+JSON.stringify(sourceSHA256)+',"cases":[',{flag:'wx'});
let first=true;
for(const meshFamily of ['quadratic','exponential-8'] as const)for(const nw of [32,64,128])
for(const durationS of [.001/256**2,4*.001/256**2])for(const requestedSteps of [1,4,16,64]){
 const liner=createFuelLiner({radiusM:R,lengthM:L,thicknessM:.001,cells:nw,
  radiusEdgesM:Array.from({length:nw+1},(_,i)=>R+.001*(meshFamily==='quadratic'?(i/nw)**2:Math.expm1(8*i/nw)/Math.expm1(8)))});
 const boundary={gasWallWK:.1,coolingWK:0,coolantK:1200},gasConductivityWMK=fuelNeutralTransport('lithium',1100).conductivityWmK;
 const setup={number:N,lightFraction:.3,radiusM:R,lengthM:L,liner,boundary,gasConductivityWMK,gasTemperatureK:1100,wallTemperatureK:1200,meshFamily};
 let gasEnergyJ=Array(ng).fill(1.5*K*N/ng*1100),linerEnergyJ=initialFuelLinerEnergy(liner,1200);
 const initial={gasEnergyJ:[...gasEnergyJ],linerEnergyJ:[...linerEnergyJ]},steps=[];
 const uniform=Array(ng).fill(1/ng),zero=()=>({lightMass:[...uniform],heavyMass:[...uniform],faceTransfers:[Array(ng-1).fill(0),Array(ng-1).fill(0)],gasSourceJ:Array(ng).fill(0),dragEnergyJ:0,payload:undefined});
 const id=meshFamily+'-w'+nw+'-t'+durationS+'-s'+requestedSteps;
 let failure:string|null=null;
 for(let i=0;i<requestedSteps;i++){
  const dtS=durationS/requestedSteps;
  try{
   const {payload:_,...result}=advanceFuelMixtureThermal(liner,linerEnergyJ,gasEnergyJ,N,.3,R,L,dtS,boundary,
    {conductivityWMK:gasConductivityWMK,lightMass:uniform,heavyMass:uniform},zero);
   steps.push({dtS,result});gasEnergyJ=result.gasEnergyJ;linerEnergyJ=result.cellEnergyJ;
  }catch(error){failure=String(error);break;}
 }
 writeFileSync(output,(first?'':',')+JSON.stringify({id,setup,initial,durationS,requestedSteps,steps,failure}),{flag:'a'});first=false;
 console.log(JSON.stringify({id,accepted:steps.length,failure}));
 if(failure)process.exitCode=1;
}
writeFileSync(output,']}\n',{flag:'a'});

/** Persistent wall storage in the real coupled step, with zero electrical
 * drive and initially hot/cold gas. Offline arithmetic diagnostic, not a
 * matched experiment or a new convergence qualification. */
import {mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createFuelSpatialStepper,type FuelSpatialState,type FuelSpatialSetup} from '../src/fuel-spatial-operation.js';
import {createFuelLiner,initialFuelLinerEnergy} from '../src/fuel-thermal.js';
const output=process.argv[2];mkdirSync(output);
const K=1.380649e-23,N=1e19,R=.01,L=.1,M=39.948*1.66053906892e-27,ne=4,nz=3;
const sum=(v:number[])=>v.reduce((a,b)=>a+b,0),cases=[];
for(const backgroundK of [400,1000,1700])for(const n of [4,8])for(const gasOffsetK of [-50,50])for(const dtS of [1e-16,1e-8]){
 const liner=createFuelLiner({radiusM:R,lengthM:L,thicknessM:.001,cells:3});
 const setup:FuelSpatialSetup={number:N,lightFraction:.5,speciesMassKg:[M,M],radiusM:R,lengthM:L,
  diffusivityM2S:.001,material:'argon',liner,boundary:{gasWallWK:.1,coolingWK:0,coolantK:backgroundK},
  electrical:{radialEdgesM:Array.from({length:ne+1},(_,i)=>R*Math.sqrt(i/ne)),axialEdgesM:Array.from({length:nz+1},(_,j)=>L*j/nz),
   sigmaPerpSM:Array(ne*nz).fill(.01),sigmaParallelSM:Array(ne*nz).fill(.1),magneticT:0,
   innerVoltageV:Array(nz).fill(null),outerVoltageV:Array(nz).fill(0),lowerVoltageV:Array(ne).fill(null),upperVoltageV:[0,0,null,null]}};
 let state:FuelSpatialState={lightMass:Array(n).fill(1/n),heavyMass:Array(n).fill(1/n),omegaRadS:Array(n).fill(0),
  gasEnergyJ:Array(n).fill(1.5*K*N/n*(backgroundK+gasOffsetK)),linerEnergyJ:initialFuelLinerEnergy(liner,backgroundK)};
 // Half the cases begin as legacy high-only states; half have signed lowwords.
 if(n===8)state.linerEnergyCorrectionJ=state.linerEnergyJ.map((u,i)=>(i%2?-1:1)*Number.EPSILON*u/16);
 const initial={highJ:[...state.linerEnergyJ],lowJ:state.linerEnergyCorrectionJ??[0,0,0]},steps=[];
 const advance=createFuelSpatialStepper(setup);let wallHeatJ=0,coolingJ=0;
 for(let i=0;i<128;i++){
  const a=advance(state,dtS);state=JSON.parse(JSON.stringify(a.state));
  wallHeatJ+=a.thermal.gasExchangeJ;coolingJ+=a.thermal.coolingEnergyJ;
  steps.push({highJ:state.linerEnergyJ,lowJ:state.linerEnergyCorrectionJ!,energyChangeJ:a.thermal.energyChangeJ.slice(n)});
 }
 const storedChangeJ=sum(state.linerEnergyJ.map((u,i)=>(u-initial.highJ[i])+(state.linerEnergyCorrectionJ![i]-initial.lowJ[i])));
 if(Math.abs(storedChangeJ-wallHeatJ+coolingJ)>=.02*Math.abs(wallHeatJ))
  throw new Error(`Physical wall exchange and paired storage disagree: ${storedChangeJ} vs ${wallHeatJ-coolingJ}`);
 cases.push({id:`${backgroundK}K-n${n}-${gasOffsetK}K-dt${dtS}`,initial,steps,backgroundK,dtS,gasOffsetK,wallHeatJ,coolingJ,storedChangeJ});
}
const sourceFiles=Object.fromEntries(['scripts/probe-fuel-liner-storage.ts',
 'scientific/spatial-argon-20261116/liner_storage_oracle.py','.github/workflows/liner-storage.yml','package-lock.json',
 ...readdirSync('src',{recursive:true}).filter(name=>typeof name==='string'&&name.endsWith('.ts')&&
  !name.split('/').some(part=>part.startsWith('.'))).map(name=>'src/'+name)]
 .map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]));
writeFileSync(output+'/liner-storage-input.json',JSON.stringify({schemaVersion:1,sourceFiles,cases})+'\n');
console.log(JSON.stringify({cases:cases.length,steps:cases.reduce((s,c)=>s+c.steps.length,0),scope:'Paired wall storage and signed physical wall exchange only.'}));

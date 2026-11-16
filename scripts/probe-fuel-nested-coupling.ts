/** Fully evolving coupled gas at one fixed electrical mesh. Offline diagnostic;
 * no experimental or full live-model qualification is implied. */
import {mkdirSync,writeFileSync,openSync,closeSync,createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,createGunzip} from 'node:zlib';
import {createInterface} from 'node:readline';
import {createFuelSpatialStepper,type FuelSpatialSetup,type FuelSpatialState} from '../src/fuel-spatial-operation.js';
import {createFuelLiner,initialFuelLinerEnergy,fuelLinerState} from '../src/fuel-thermal.js';
import {fuelGasState} from '../src/fuel-gas.js';
import {DEFAULT_SPATIAL_EXPERIMENT,type FuelSpatialExperimentSnapshot} from '../src/fuel-spatial-experiment.js';
import {assessSpatialRefinement} from '../src/fuel-spatial-convergence.js';
const output=process.argv[2];mkdirSync(output);
const R=.01,L=.1,N=1e19,M=39.948*1.66053906892e-27,K=1.380649e-23,T=1000,durationS=1e-6;
const ne=16,nz=32,gasLevels=[1024,2048,4096],timeLevels=[64,128,256];
const sum=(v:readonly number[])=>v.reduce((a,b)=>a+b,0);
const conditions={material:'argon' as const,radiusM:R,lengthM:L,groundedDiskRadiusM:R/Math.sqrt(2),speciesMassKg:[M,M] as const,
 diffusivityM2S:.001,sigmaPerpSM:.01,sigmaParallelSM:.1,gasWallWK:.1,linerThicknessM:.001,
 linerMaterial:'tungsten' as const,coolingWK:0,electricalRadialCells:ne,electricalAxialCells:nz};
const requests=gasLevels.flatMap(n=>timeLevels.map(steps=>({n,steps})));
const cases=[];
for(const {n,steps} of requests){
 const liner=createFuelLiner({radiusM:R,lengthM:L,thicknessM:.001,cells:3});
 const c:FuelSpatialSetup={number:N,lightFraction:.5,speciesMassKg:[M,M],radiusM:R,lengthM:L,diffusivityM2S:.001,
  material:'argon',currentRelativeTolerance:1e-15,liner,boundary:{gasWallWK:.1,coolingWK:0,coolantK:T},
  electrical:{radialEdgesM:Array.from({length:ne+1},(_,i)=>R*Math.sqrt(i/ne)),
   axialEdgesM:Array.from({length:nz+1},(_,j)=>L*(1-(1-j/nz)**2)),
   sigmaPerpSM:Array(ne*nz).fill(.01),sigmaParallelSM:Array(ne*nz).fill(.1),magneticT:.5,
   innerVoltageV:Array(nz).fill(null),outerVoltageV:Array(nz).fill(1),lowerVoltageV:Array(ne).fill(null),
   upperVoltageV:Array.from({length:ne},(_,i)=>i<ne/2?0:null)}};
 const advance=createFuelSpatialStepper(c),dt=durationS/steps,volume=Math.PI*R**2*L/n;
 let state:FuelSpatialState={lightMass:Array(n).fill(1/n),heavyMass:Array(n).fill(1/n),omegaRadS:Array(n).fill(0),
  gasEnergyJ:Array(n).fill(1.5*K*N*T/n),linerEnergyJ:initialFuelLinerEnergy(liner,T)};
 const config={...DEFAULT_SPATIAL_EXPERIMENT,radialCells:n,axialCells:nz,steps,axialSpacingPower:2,currentRelativeTolerance:1e-15};
 const file=`coupled-g${n}-e${ne}-z${nz}-t${steps}.jsonl.gz`,fd=openSync(output+'/'+file,'wx'),hash=createHash('sha256');
 const started=performance.now();let failure:string|null=null,rows=0;
 try{for(let step=0;step<=steps;step++){
  const a=advance(state,step===0?0:dt);state=a.state;
  const gas=fuelGasState(state.lightMass,state.heavyMass,state.gasEnergyJ,c),currents=a.electrical.boundaryCurrentsA;
  const snapshot:FuelSpatialExperimentSnapshot={timeS:step===steps?durationS:step*dt,contactVoltageV:1,
   radiusM:gas.radiusM,omegaRadS:state.omegaRadS,temperatureK:gas.temperatureK,
   densityKgM3:state.lightMass.map((v,i)=>N*M*(v+state.heavyMass[i])/(2*volume)),
   lightMass:state.lightMass,heavyMass:state.heavyMass,electrodeCurrentA:sum(currents.slice(0,nz-1))+currents.at(-1)!,
   electricalPowerW:a.electrical.electrodePowerW,kineticJ:a.momentum.kineticJ,gasEnergyJ:gas.energyJ,
   linerEnergyJ:sum(state.linerEnergyJ),angularMomentumKgM2S:a.momentum.angularMomentumKgM2S,
   gasCellEnergyJ:state.gasEnergyJ,linerCellEnergyJ:state.linerEnergyJ,
   linerTemperatureK:fuelLinerState(liner,state.linerEnergyJ).temperatureK,intervalGasWallHeatJ:a.thermal.gasExchangeJ,
   jouleByGasCellW:a.jouleWByGasCell,torqueByGasCellNm:a.torqueNmByGasCell,joulePowerW:a.electrical.jouleW,
   mechanicalPowerW:a.electrical.mechanicalW,stepOmegaMismatchRadS:a.maxOmegaMismatchRadS,
   stepMechanicalEndpointDefectJ:a.mechanicalEndpointDefectJ,thermalRowResidualJ:a.thermal.maximumRowResidualJ,
   electricalEnergyResidualW:a.electrical.energyResidualW,inertiaKgM2:a.momentum.grid.inertiaKgM2,
   intervalElectricalWorkJ:a.inputWorkJ,maxCellCurrentResidualA:a.electrical.maxCellCurrentResidualA};
  const receipt={step,snapshot,faceTransfers:a.faceTransfers,sourceOmegaRadS:a.sourceOmegaRadS,
   numericalLossJ:a.momentum.increment.numericalLossJ,wallWorkJ:a.momentum.increment.wallWorkJ,
   coolingJ:a.thermal.coolingEnergyJ,driveImpulse:a.momentum.increment.driveImpulseKgM2S,
   wallImpulse:a.momentum.increment.wallImpulseKgM2S,energyResidualJ:a.energyResidualJ,
   angularResidual:a.momentum.angularResidualKgM2S};
  const bytes=gzipSync(JSON.stringify(receipt)+'\n');writeFileSync(fd,bytes);hash.update(bytes);rows++;
 }}catch(error){failure=String(error);}finally{closeSync(fd);}
 cases.push({n,steps,config,file,sha256:hash.digest('hex'),rows,failure,elapsedMs:performance.now()-started});
 writeFileSync(output+'/index.json',JSON.stringify({schemaVersion:1,conditions,durationS,requests,cases})+'\n');
 console.log(JSON.stringify(cases.at(-1)));
}
async function read(h:typeof cases[number],commonSteps:number){
 const snapshots:FuelSpatialExperimentSnapshot[]=[];
 const lines=createInterface({input:createReadStream(output+'/'+h.file).pipe(createGunzip()),crlfDelay:Infinity});
 for await(const line of lines){const row=JSON.parse(line);if(row.step%(h.steps/commonSteps)===0)snapshots.push(row.snapshot);}
 return {config:{...h.config,steps:commonSteps},conditions,snapshots};
}
const comparisons=[];
// Keep every accepted time sample for temporal assessment (interval wall heat
// needs aggregation). Radial comparisons use identical native clocks.
for(const steps of timeLevels){
 const selected=gasLevels.map(n=>cases.find(h=>h.n===n&&h.steps===steps)!);
 if(selected.some(h=>h.failure)){comparisons.push({axis:'radialCells',steps,blocked:true});continue;}
 const h=await Promise.all(selected.map(v=>read(v,steps)));
 comparisons.push(assessSpatialRefinement([h[0],h[1],h[2]],'radialCells'));
}
for(const n of gasLevels){
 const selected=timeLevels.map(steps=>cases.find(h=>h.n===n&&h.steps===steps)!);
 if(selected.some(h=>h.failure)){comparisons.push({axis:'steps',n,blocked:true});continue;}
 const h=await Promise.all(selected.map(v=>read(v,v.steps)));
 comparisons.push(assessSpatialRefinement([h[0],h[1],h[2]],'steps'));
}
const assessment={schemaVersion:1,conditions,cases,comparisons,maxRssKiB:process.resourceUsage().maxRSS,
 numericallyQualified:false,experimentallyQualified:false,liveDefaultReplaced:false,
 scope:'Fully evolving gas/species/momentum/heat on one fixed e16/z32 electrical mesh. Three-cell liner fixed; no electrical continuum, local startup, experimental or live-slider qualification.'};
writeFileSync(output+'/assessment.json',JSON.stringify(assessment)+'\n');
console.log(JSON.stringify({cases:cases.length,failures:cases.filter(h=>h.failure),maxRssKiB:assessment.maxRssKiB,
 comparisons:comparisons.map(c=>('metrics'in c)?{axis:c.axis,levels:c.levels,status:c.metrics.map(m=>[m.name,m.status])}:c)}));
if(cases.some(h=>h.failure))process.exitCode=1;

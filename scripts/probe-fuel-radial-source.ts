/** Frozen-source diagnostic: same transport kernels, prescribed Ω=0 throughout.
 * Native electrical heating versus conservative restriction of one fine source.
 * This is neither a fully coupled trajectory nor a continuum reference.
 */
import {mkdirSync,readdirSync,readFileSync,writeFileSync,openSync,closeSync,createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,createGunzip} from 'node:zlib';
import {createInterface} from 'node:readline';
import {createFuelCurrentSolver} from '../src/fuel-current.js';
import {advanceFuelGasMass,fuelGasState} from '../src/fuel-gas.js';
import {advanceFuelMixtureThermal} from '../src/fuel-gas-thermal.js';
import {createFuelLiner,initialFuelLinerEnergy} from '../src/fuel-thermal.js';
import {fuelNeutralTransport} from '../src/fuel-neutral-transport.js';
import {classifySpatialConvergence} from '../src/fuel-spatial-convergence.js';
const output=process.argv[2];mkdirSync(output);
const K=1.380649e-23,M=39.948*1.66053906892e-27,R=.01,L=.1,N=1e19,T0=1000,D=.001;
const durationS=1e-6,nz=128,levels=[8,16,32,64,128,256];
const gasLevels=[...levels,512,1024,2048,4096],timeLevels=[256,512,1024],jointLevels=[1024,2048,4096];
const sum=(v:readonly number[])=>v.reduce((a,b)=>a+b,0),peak=(v:readonly number[])=>Math.max(...v.map(Math.abs));
const restrict=(v:readonly number[],n:number)=>Array.from({length:n},(_,i)=>sum(v.slice(i*v.length/n,(i+1)*v.length/n)));
const sources=levels.map(n=>{
 const started=performance.now();
 const solve=createFuelCurrentSolver({radialEdgesM:Array.from({length:n+1},(_,i)=>R*Math.sqrt(i/n)),
  axialEdgesM:Array.from({length:nz+1},(_,j)=>L*(1-(1-j/nz)**2)),sigmaPerpSM:Array(n*nz).fill(.01),
  sigmaParallelSM:Array(n*nz).fill(.1),magneticT:.5,innerVoltageV:Array(nz).fill(null),outerVoltageV:Array(nz).fill(1),
  lowerVoltageV:Array(n).fill(null),upperVoltageV:Array.from({length:n},(_,i)=>i<n/2?0:null)},1e-15);
 const electrical=solve(Array(n*nz).fill(0)),powerW=Array<number>(n).fill(0);
 electrical.jouleByCellW.forEach((v,i)=>powerW[i%n]+=v);
 return {n,powerW,totalPowerW:sum(powerW),maxCellCurrentResidualA:electrical.maxCellCurrentResidualA,
  electricalEnergyResidualW:electrical.energyResidualW,elapsedMs:performance.now()-started};
});
const requests=[...levels.map(n=>({mode:'native',n,steps:256})),...gasLevels.map(n=>({mode:'common-fine',n,steps:256})),
 ...jointLevels.flatMap(n=>timeLevels.slice(1).map(steps=>({mode:'common-fine',n,steps})))];
const histories=[];
for(const request of requests){
 const {mode,n,steps}=request,dt=durationS/steps;
 const fine=sources.at(-1)!.powerW;
 // Beyond the source mesh, keep its piecewise-constant power density exactly:
 // every child receives its equal-volume share of its parent's cell power.
 const powerW=mode==='native'?sources.find(s=>s.n===n)!.powerW:n<=fine.length?restrict(fine,n):
  Array.from({length:n},(_,i)=>fine[Math.floor(i*fine.length/n)]*fine.length/n);
 const liner=createFuelLiner({radiusM:R,lengthM:L,thicknessM:.001,cells:3});
 let mass=Array(n).fill(1/n),gasEnergyJ=Array(n).fill(1.5*K*N*T0/n),linerEnergyJ=initialFuelLinerEnergy(liner,T0);
 const file=`${mode}-r${n}-t${steps}.jsonl.gz`,descriptor=openSync(output+'/'+file,'wx'),checksum=createHash('sha256');
 // Each accepted row is a standard gzip member; stream it instead of keeping
 // O(cases*cells*steps) state/JSON copies resident. Gunzip reads concatenated members.
 const append=(row:unknown)=>{const bytes=gzipSync(JSON.stringify(row)+'\n');writeFileSync(descriptor,bytes);checksum.update(bytes);};
 append({step:0,timeS:0,mass,gasEnergyJ,linerEnergyJ,intervalWallHeatJ:0,intervalDepositedJ:0,
  solveTemperatureK:Array(n).fill(T0),faceTransfers:Array(n-1).fill(0),maximumRowResidualJ:0});
 const started=performance.now();let failure:string|null=null;
 try{for(let step=1;step<=steps;step++){
  const result=advanceFuelMixtureThermal(liner,linerEnergyJ,gasEnergyJ,N,.5,R,L,dt,
   {gasWallWK:.1,coolingWK:0,coolantK:T0},{lightMass:mass,heavyMass:mass,conductivityWMK:0,
    conductivityAtTemperature:t=>fuelNeutralTransport('argon',t).conductivityWmK},temperatures=>{
     const moved=advanceFuelGasMass(mass,temperatures,M,0,R,D,dt);
     return {lightMass:moved.mass,heavyMass:moved.mass,faceTransfers:[moved.faceTransfers,moved.faceTransfers],
      gasSourceJ:powerW.map(v=>dt*v),dragEnergyJ:0,payload:moved};
    });
  mass=result.payload.mass;gasEnergyJ=result.gasEnergyJ;linerEnergyJ=result.cellEnergyJ;
  append({step,timeS:step===steps?durationS:step*dt,mass,gasEnergyJ,linerEnergyJ,intervalWallHeatJ:result.gasExchangeJ,
   intervalDepositedJ:dt*sum(powerW),solveTemperatureK:result.gasTemperatureK,faceTransfers:result.payload.faceTransfers,
   maximumRowResidualJ:result.maximumRowResidualJ,thermalIterations:result.iterations});
 }}catch(error){failure=String(error);}finally{closeSync(descriptor);}
 histories.push({...request,powerW,file,sha256:checksum.digest('hex'),failure,elapsedMs:performance.now()-started});
 writeFileSync(output+'/source-index.partial.json',JSON.stringify({sources,histories})+'\n');
}
type History=typeof histories[number];
async function profilesAt(history:History,n:number,steps:number){
 const profiles=[];
 const rows=createInterface({input:createReadStream(output+'/'+history.file).pipe(createGunzip()),crlfDelay:Infinity});
 for await(const line of rows){
  const s=JSON.parse(line);if(s.step%(history.steps/steps)!==0)continue;
  const mass=restrict(s.mass,n),energy=restrict(s.gasEnergyJ,n);
  const gas=fuelGasState(mass,mass,energy,{number:N,lightFraction:.5,radiusM:R,lengthM:L});
  profiles.push({timeS:s.timeS,temperatureK:gas.temperatureK,densityKgM3:mass.map(p=>N*M*p/(Math.PI*R**2*L/n))});
 }
 if(profiles.length!==steps+1)throw new Error('Missing accepted common clocks.');
 return profiles;
}
const groups:{axis:'radial'|'time';triple:History[]}[]=[];
for(const steps of timeLevels)for(const mode of ['native','common-fine']){
 const selected=histories.filter(h=>h.mode===mode&&h.steps===steps).sort((a,b)=>a.n-b.n);
 for(let i=0;i<selected.length-2;i++)groups.push({axis:'radial',triple:selected.slice(i,i+3)});
}
for(const n of jointLevels)groups.push({axis:'time',triple:histories.filter(h=>h.mode==='common-fine'&&h.n===n).sort((a,b)=>a.steps-b.steps)});
const comparisons=[];
for(const {axis,triple} of groups){
 const {mode,n,steps}=triple[0],tolerance=axis==='time'?.01:.02;
 if(triple.some(h=>h.failure)){comparisons.push({axis,mode,ids:triple.map(h=>h.file),blocked:'Incomplete trajectory'});continue;}
 const profiles=[];
 for(const h of triple)profiles.push(await profilesAt(h,n,steps));
 if(profiles.some(h=>h.some((s,i)=>s.timeS!==profiles[0][i].timeS)))throw new Error('Accepted common clocks differ.');
 const metrics=(['temperatureK','densityKgM3'] as const).map(field=>{
  const scale=Math.max(...profiles.flatMap(h=>h.map(s=>peak(s[field].map((v,i)=>v-h[0][field][i])))));
  const differences=[0,1].map(k=>Math.max(...profiles[k].map((s,j)=>peak(s[field].map((v,i)=>v-profiles[k+1][j][field][i])))));
  const representationScreen=32*Number.EPSILON*(triple[2].n/n)*Math.max(...profiles.flatMap(h=>h.map(s=>peak(s[field]))));
  return {field,scale,differences,representationScreen,tolerance,
   ...classifySpatialConvergence(scale,differences[0],differences[1],representationScreen,tolerance)};
 });
 comparisons.push({axis,mode,levels:triple.map(h=>axis==='time'?h.steps:h.n),n,steps,sharedClocks:steps+1,
  fineOnlyClocks:triple[2].steps-steps,metrics});
}
const walk=(path:string):string[]=>readdirSync(path,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path+'/'+e.name):[path+'/'+e.name]);
const files=[...walk('src'),'scripts/probe-fuel-radial-source.ts','docs/RADIAL-PRECISION-PROTOCOL.md','package-lock.json'].sort();
const sourceFiles=Object.fromEntries(files.map(file=>[file,createHash('sha256').update(readFileSync(file)).digest('hex')]));
const packet={schemaVersion:2,kind:'frozen-zero-rotation-radial-source-probe',sourceFiles,sources,comparisons,histories,
 operationalComplete:histories.every(h=>!h.failure),maxRSSKiB:process.resourceUsage().maxRSS,
 numericallyQualified:false,experimentallyQualified:false,conditions:{totalParticles:N,R,L,T0,D,timeLevels,gasLevels,durationS,nz}};
writeFileSync(output+'/source-assessment.json',JSON.stringify(packet,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(packet));
if(!packet.operationalComplete)process.exitCode=1;

/** Frozen-source diagnostic: same transport kernels, prescribed Ω=0 throughout.
 * Native electrical heating versus conservative restriction of one fine source.
 * This is neither a fully coupled trajectory nor a continuum reference.
 */
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createFuelCurrentSolver} from '../src/fuel-current.js';
import {advanceFuelGasMass,fuelGasState} from '../src/fuel-gas.js';
import {advanceFuelMixtureThermal} from '../src/fuel-gas-thermal.js';
import {createFuelLiner,initialFuelLinerEnergy} from '../src/fuel-thermal.js';
import {fuelNeutralTransport} from '../src/fuel-neutral-transport.js';
const output=process.argv[2];mkdirSync(output);
const K=1.380649e-23,M=39.948*1.66053906892e-27,R=.01,L=.1,N=1e19,T0=1000,D=.001;
const steps=256,durationS=1e-6,dt=durationS/steps,nz=128,levels=[8,16,32,64,128,256];
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
const histories=[];
for(const mode of ['native','common-fine'] as const)for(const source of sources){
 const n=source.n,powerW=mode==='native'?source.powerW:restrict(sources.at(-1)!.powerW,n);
 const liner=createFuelLiner({radiusM:R,lengthM:L,thicknessM:.001,cells:3});
 let mass=Array(n).fill(1/n),gasEnergyJ=Array(n).fill(1.5*K*N*T0/n),linerEnergyJ=initialFuelLinerEnergy(liner,T0);
 const snapshots=[{timeS:0,mass:[...mass],gasEnergyJ:[...gasEnergyJ],intervalWallHeatJ:0}];
 const started=performance.now();
 for(let step=1;step<=steps;step++){
  const result=advanceFuelMixtureThermal(liner,linerEnergyJ,gasEnergyJ,N,.5,R,L,dt,
   {gasWallWK:.1,coolingWK:0,coolantK:T0},{lightMass:mass,heavyMass:mass,conductivityWMK:0,
    conductivityAtTemperature:t=>fuelNeutralTransport('argon',t).conductivityWmK},temperatures=>{
     const moved=advanceFuelGasMass(mass,temperatures,M,0,R,D,dt);
     return {lightMass:moved.mass,heavyMass:moved.mass,faceTransfers:[moved.faceTransfers,moved.faceTransfers],
      gasSourceJ:powerW.map(v=>dt*v),dragEnergyJ:0,payload:moved};
    });
  mass=result.payload.mass;gasEnergyJ=result.gasEnergyJ;linerEnergyJ=result.cellEnergyJ;
  snapshots.push({timeS:step===steps?durationS:step*dt,mass:[...mass],gasEnergyJ:[...gasEnergyJ],intervalWallHeatJ:result.gasExchangeJ});
 }
 histories.push({mode,n,powerW,snapshots,elapsedMs:performance.now()-started});
 writeFileSync(output+'/source-histories.partial.json',JSON.stringify({sources,histories})+'\n');
}
const comparisons=[];
for(const mode of ['native','common-fine'])for(let level=0;level<levels.length-2;level++){
 const n=levels[level],triple=histories.filter(h=>h.mode===mode&&h.n>=n&&h.n<=4*n);
 const profiles=triple.map(h=>h.snapshots.map(s=>{
  const mass=restrict(s.mass,n),energy=restrict(s.gasEnergyJ,n);
  const gas=fuelGasState(mass,mass,energy,{number:N,lightFraction:.5,radiusM:R,lengthM:L});
  return {temperatureK:gas.temperatureK,densityKgM3:mass.map(p=>N*M*p/(Math.PI*R**2*L/n))};
 }));
 const metrics=(['temperatureK','densityKgM3'] as const).map(field=>{
  const scale=Math.max(...profiles.flatMap(h=>h.map(s=>peak(s[field].map((v,i)=>v-h[0][field][i])))));
  const differences=[0,1].map(k=>Math.max(...profiles[k].map((s,j)=>peak(s[field].map((v,i)=>v-profiles[k+1][j][field][i])))));
  const representationScreen=32*Number.EPSILON*4*Math.max(...profiles.flatMap(h=>h.map(s=>peak(s[field]))));
  const resolved=.02*scale>representationScreen&&Math.abs(differences[0]-differences[1])>representationScreen;
  const relative=differences.map(d=>d/scale),contracting=differences[1]<differences[0];
  return {field,scale,differences,relative,representationScreen,contracting,
   status:!resolved?'unresolved':relative.every(v=>v<.02)&&contracting?'pass':'fail'};
 });
 comparisons.push({mode,levels:[n,2*n,4*n],metrics});
}
const files=['src/fuel-current.ts','src/fuel-gas.ts','src/fuel-gas-thermal.ts','src/fuel-thermal.ts','src/fuel-neutral-transport.ts',
 'scripts/probe-fuel-radial-source.ts','docs/RADIAL-PRECISION-PROTOCOL.md','package-lock.json'];
const sourceFiles=Object.fromEntries(files.map(file=>[file,createHash('sha256').update(readFileSync(file)).digest('hex')]));
const packet={kind:'frozen-zero-rotation-radial-source-probe',sourceFiles,sources,comparisons,
 numericallyQualified:false,experimentallyQualified:false,conditions:{N,R,L,T0,D,steps,durationS,nz}};
writeFileSync(output+'/source-histories.json',JSON.stringify({...packet,histories})+'\n',{flag:'wx'});
writeFileSync(output+'/source-assessment.json',JSON.stringify(packet,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(packet));

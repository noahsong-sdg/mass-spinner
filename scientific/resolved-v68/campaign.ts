/** Frozen physical case; stream each accepted step so long runs retain progress. */
import {readFileSync,writeFileSync,mkdirSync,createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import {createFuelSpatialStepper,type FuelSpatialSetup,type FuelSpatialState} from '../../src/fuel-spatial-operation.js';
import {solveFuelCurrent} from '../../src/fuel-current.js';
import {createFuelLiner,initialFuelLinerEnergy} from '../../src/fuel-thermal.js';
type Spec={id:string;radial:number;axial:number;liner:number;steps:number};
const raw=readFileSync(process.argv[2]),specs:Spec[]=JSON.parse(raw.toString()),selected:string[]=JSON.parse(process.argv[4]);
if(new Set(selected).size!==selected.length||selected.some(id=>specs.filter(s=>s.id===id).length!==1))throw new Error('Select distinct existing IDs.');
const manifest=JSON.parse(readFileSync('v43-last-manifest.json','utf8'));
const sourceSHA256=createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(manifest).sort(([a],[b])=>a<b?-1:a>b?1:0)))).digest('hex');
const specificationSHA256=createHash('sha256').update(raw).digest('hex'),folder=process.argv[3];mkdirSync(folder,{recursive:true});
for(const id of selected){
 const spec=specs.find(s=>s.id===id)!,{radial:n,axial:nz,liner:nw,steps:count}=spec;
 if(!/^[a-z0-9-]+$/.test(id)||[n,nz,nw,count].some(v=>!Number.isSafeInteger(v)||v<2)||n%2)throw new Error('Invalid case dimensions or ID.');
 const R=.01,L=.1,N=1e19,K=1.380649e-23;
 const liner=createFuelLiner({radiusM:R,lengthM:L,thicknessM:.001,cells:nw,radiusEdgesM:Array.from({length:nw+1},(_,i)=>R+.001*(i/nw)**2)});
 const setup:FuelSpatialSetup={number:N,lightFraction:.3,speciesMassKg:[6*1.66053906892e-27,7*1.66053906892e-27],radiusM:R,lengthM:L,
  diffusivityM2S:.001,material:'lithium',liner,boundary:{gasWallWK:.1,coolingWK:0,coolantK:1200},
  electrical:{radialEdgesM:Array.from({length:n+1},(_,i)=>R*Math.sqrt(i/n)),axialEdgesM:Array.from({length:nz+1},(_,j)=>L*j/nz),
   sigmaPerpSM:Array(n*nz).fill(.01),sigmaParallelSM:Array(n*nz).fill(.1),magneticT:.5,
   innerVoltageV:Array(nz).fill(null),outerVoltageV:Array(nz).fill(.01),lowerVoltageV:Array(n).fill(null),upperVoltageV:Array.from({length:n},(_,i)=>i<n/2?0:null)}};
 let state:FuelSpatialState={lightMass:Array(n).fill(1/n),heavyMass:Array(n).fill(1/n),omegaRadS:Array.from({length:n},(_,i)=>2e5*(1-(i+.5)/n)),
  gasEnergyJ:Array.from({length:n},(_,i)=>1.5*K*N/n*(1000+100*(i+.5)/n)),linerEnergyJ:initialFuelLinerEnergy(liner,1200)};
 const initialState=structuredClone(state),initialElectrical=solveFuelCurrent({...setup.electrical,omegaRadS:Array.from({length:n*nz},(_,i)=>state.omegaRadS[i%n])});
 const base={id,setup,initialState,initialElectrical,requestedSteps:count,spec},prefix=folder+'/'+id;
 writeFileSync(prefix+'.request.json',JSON.stringify({sourceSHA256,specificationSHA256,case:base})+'\n',{flag:'wx'});
 writeFileSync(prefix+'.steps.ndjson','',{flag:'wx'});
 const started=performance.now(),advance=createFuelSpatialStepper(setup);let accepted=0,failure:string|null=null;
 for(let k=0;k<count;k++){
  const dtS=.001*(((k+1)/count)**2-(k/count)**2);
  try{
   const output=advance(state,dtS);state=output.state;
   const {payload:_payload,...thermal}=output.thermal;
   writeFileSync(prefix+'.steps.ndjson',JSON.stringify({dtS,result:{...output,thermal}})+'\n',{flag:'a'});accepted++;
   if(accepted%16===0)writeFileSync(prefix+'.progress.json',JSON.stringify({id,accepted,timeS:.001*(accepted/count)**2,seconds:(performance.now()-started)/1000})+'\n');
  }catch(error){failure=String(error);break;}
 }
 writeFileSync(prefix+'.json','{"sourceSHA256":'+JSON.stringify(sourceSHA256)+',"specificationSHA256":'+JSON.stringify(specificationSHA256)+',"cases":['+JSON.stringify(base).slice(0,-1)+',"steps":[',{flag:'wx'});
 let first=true;
 for await(const line of createInterface({input:createReadStream(prefix+'.steps.ndjson'),crlfDelay:Infinity})){
  writeFileSync(prefix+'.json',(first?'':',')+line,{flag:'a'});first=false;
 }
 writeFileSync(prefix+'.json','],"failure":'+JSON.stringify(failure)+'}]}\n',{flag:'a'});
 const progress={id,accepted,requested:count,failure,seconds:(performance.now()-started)/1000};
 writeFileSync(prefix+'.progress.json',JSON.stringify(progress)+'\n');console.log(JSON.stringify(progress));
 if(failure)process.exitCode=1;
}

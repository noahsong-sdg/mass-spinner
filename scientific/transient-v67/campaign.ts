/** Nested conservative histories for prospective v67 qualification. Safe-dev only. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {advanceFuelSpatialOperation,type FuelSpatialSetup,type FuelSpatialState} from '../../src/fuel-spatial-operation.js';
import {createFuelLiner,initialFuelLinerEnergy} from '../../src/fuel-thermal.js';
type Spec={id:string;radial:number;axial:number;liner:number;steps:number;knots:'uniform'|'quadratic';linerMesh?:'uniform'|'quadratic'};
const raw=readFileSync(process.argv[2]),specs:Spec[]=JSON.parse(raw.toString()),cases=[];
const selected=process.argv[4]?JSON.parse(process.argv[4]) as string[]:specs.map(s=>s.id);
if(new Set(selected).size!==selected.length||selected.some(id=>specs.filter(s=>s.id===id).length!==1))throw new Error('Select distinct existing case IDs.');
const manifest=readFileSync('v43-last-manifest.json');
const canonical=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(manifest.toString())).sort(([a],[b])=>a<b?-1:a>b?1:0)));
const sourceSHA256=createHash('sha256').update(canonical).digest('hex');
for(const id of selected){
 const spec=specs.find(s=>s.id===id)!,{radial:n,axial:nz,liner:nw,steps:count}=spec;
 if([n,nz,nw,count].some(v=>!Number.isSafeInteger(v)||v<2)||n%2||!['uniform','quadratic'].includes(spec.knots)||
  spec.linerMesh!==undefined&&!['uniform','quadratic'].includes(spec.linerMesh))throw new Error('Need even radial cells, positive integer refinements and declared time/wall partitions.');
 const R=.01,L=.1,N=1e19,K=1.380649e-23,duration=1e-3;
 const liner=createFuelLiner({radiusM:R,lengthM:L,thicknessM:.001,cells:nw,
  radiusEdgesM:spec.linerMesh==='quadratic'?Array.from({length:nw+1},(_,i)=>R+.001*(i/nw)**2):undefined});
 const setup:FuelSpatialSetup={number:N,lightFraction:.3,speciesMassKg:[6*1.66053906892e-27,7*1.66053906892e-27],radiusM:R,lengthM:L,
  diffusivityM2S:.001,material:'lithium',liner,boundary:{gasWallWK:.1,coolingWK:0,coolantK:1200},
  electrical:{radialEdgesM:Array.from({length:n+1},(_,i)=>R*Math.sqrt(i/n)),axialEdgesM:Array.from({length:nz+1},(_,j)=>L*j/nz),
   sigmaPerpSM:Array(n*nz).fill(.01),sigmaParallelSM:Array(n*nz).fill(.1),magneticT:.5,
   innerVoltageV:Array(nz).fill(null),outerVoltageV:Array(nz).fill(.01),lowerVoltageV:Array(n).fill(null),upperVoltageV:Array.from({length:n},(_,i)=>i<n/2?0:null)}};
 let state:FuelSpatialState={lightMass:Array(n).fill(1/n),heavyMass:Array(n).fill(1/n),omegaRadS:Array.from({length:n},(_,i)=>2e5*(1-(i+.5)/n)),
  gasEnergyJ:Array.from({length:n},(_,i)=>1.5*K*N/n*(1000+100*(i+.5)/n)),linerEnergyJ:initialFuelLinerEnergy(liner,1200)};
 const initialState=structuredClone(state),steps=[];let failure:string|undefined;
 const started=performance.now(),power=spec.knots==='uniform'?1:2;
 for(let k=0;k<count;k++){
  const dtS=duration*(((k+1)/count)**power-(k/count)**power);
  try{
   const result=advanceFuelSpatialOperation(setup,state,dtS);state=result.state;
   const {payload:_payload,...thermal}=result.thermal;steps.push({dtS,result:{...result,thermal}});
  }catch(error){failure=String(error);break;}
 }
 cases.push({id,setup,initialState,requestedSteps:count,steps,failure,spec});
 console.log(JSON.stringify({id,accepted:steps.length,failure,seconds:(performance.now()-started)/1000}));
 writeFileSync(process.argv[3]+'.partial',JSON.stringify({sourceSHA256,specificationSHA256:createHash('sha256').update(raw).digest('hex'),cases})+'\n');
}
writeFileSync(process.argv[3],JSON.stringify({sourceSHA256,specificationSHA256:createHash('sha256').update(raw).digest('hex'),cases})+'\n',{flag:'wx'});

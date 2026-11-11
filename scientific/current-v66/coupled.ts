import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {advanceFuelSpatialOperation,type FuelSpatialSetup,type FuelSpatialState} from '../../src/fuel-spatial-operation.js';
import {createFuelLiner,initialFuelLinerEnergy} from '../../src/fuel-thermal.js';
const K=1.380649e-23,cases=[];
const selected=process.argv[3]?JSON.parse(process.argv[3]):[8,16,32];
for(const n of selected)for(const count of [16,32,64]){
 const nz=4,R=.01,L=.1,N=1e19,T=1e-3,liner=createFuelLiner({radiusM:R,lengthM:L,thicknessM:.001,cells:8});
 const setup:FuelSpatialSetup={number:N,lightFraction:.3,speciesMassKg:[6*1.66053906892e-27,7*1.66053906892e-27],radiusM:R,lengthM:L,
  diffusivityM2S:.001,material:'lithium',liner,boundary:{gasWallWK:.1,coolingWK:0,coolantK:1200},
  electrical:{radialEdgesM:Array.from({length:n+1},(_,i)=>R*Math.sqrt(i/n)),axialEdgesM:Array.from({length:nz+1},(_,j)=>L*j/nz),
   sigmaPerpSM:Array(n*nz).fill(.01),sigmaParallelSM:Array(n*nz).fill(.1),magneticT:.5,
   innerVoltageV:Array(nz).fill(null),outerVoltageV:Array(nz).fill(.01),lowerVoltageV:Array(n).fill(null),
   upperVoltageV:Array.from({length:n},(_,i)=>i<n/2?0:null)}};
 let state:FuelSpatialState={lightMass:Array(n).fill(1/n),heavyMass:Array(n).fill(1/n),omegaRadS:Array.from({length:n},(_,i)=>2e5*(1-(i+.5)/n)),
  gasEnergyJ:Array.from({length:n},(_,i)=>1.5*K*N/n*(1000+100*(i+.5)/n)),linerEnergyJ:initialFuelLinerEnergy(liner,1200)};
 const initialState=structuredClone(state),steps=[];let failure:string|undefined;
 const started=performance.now();
 for(let k=0;k<count;k++){
  try{const result=advanceFuelSpatialOperation(setup,state,T/count);state=result.state;
   const {payload:_payload,...thermal}=result.thermal;steps.push({dtS:T/count,result:{...result,thermal}});
  }catch(error){failure=String(error);break;}
 }
 cases.push({id:`mixture-n${n}-t${count}`,setup,initialState,steps,failure,requestedSteps:count});
 console.log(JSON.stringify({id:cases.at(-1)!.id,steps:steps.length,failure,seconds:(performance.now()-started)/1000}));
}
const manifest=readFileSync('v43-last-manifest.json');
const canonical=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(manifest.toString())).sort(([a],[b])=>a<b?-1:a>b?1:0)));
writeFileSync(process.argv[2],JSON.stringify({sourceSHA256:createHash('sha256').update(canonical).digest('hex'),
 sourceManifestSHA256:createHash('sha256').update(manifest).digest('hex'),cases})+'\n',{flag:'wx'});

/** Same physical v68 case; only explicit time knots and liner grid vary. */
import {readFileSync,writeFileSync,mkdirSync,createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import {createFuelSpatialStepper,type FuelSpatialSetup,type FuelSpatialState} from '../../src/fuel-spatial-operation.js';
import {solveFuelCurrent} from '../../src/fuel-current.js';
import {createFuelLiner,initialFuelLinerEnergy} from '../../src/fuel-thermal.js';
type Spec={id:string;wall:number;meshFamily:'quadratic'|'exponential-8';steps:number;nominalSteps:number|null;durationS:number};
const sha=(raw:string|Buffer)=>createHash('sha256').update(raw).digest('hex');
const seedRaw=readFileSync(process.argv[2]),seed=JSON.parse(seedRaw.toString()),specRaw=readFileSync(process.argv[3]);
if(seed.baselinePacketSHA256!=='286543ae336ccc70cf37a24b960de015249000604108ceadd8070e43def2fad2'||
 seed.baselineSourceSHA256!=='4d28113802de70f2624f3d5146f5e8f22508103e6ae8f255575d2ea62d935631')throw new Error('Require hash-bound complete v68 anchor seed.');
const specs:Spec[]=JSON.parse(specRaw.toString()),selected:string[]=JSON.parse(process.argv[5]),folder=process.argv[4];
if(!selected.length||new Set(selected).size!==selected.length||selected.some(id=>specs.filter(s=>s.id===id).length!==1))throw new Error('Select distinct existing case IDs.');
const manifest=JSON.parse(readFileSync('v43-last-manifest.json','utf8'));
const sourceSHA256=sha(JSON.stringify(Object.fromEntries(Object.entries(manifest).sort(([a],[b])=>a<b?-1:a>b?1:0))));
const provenance={sourceSHA256,specificationSHA256:sha(specRaw),seedSHA256:sha(seedRaw),baselinePacketSHA256:seed.baselinePacketSHA256};
mkdirSync(folder,{recursive:true});
for(const id of selected){
 const spec=specs.find(s=>s.id===id)!;
 if(!/^[a-z0-9-]+$/.test(id)||!['quadratic','exponential-8'].includes(spec.meshFamily)||!Number.isSafeInteger(spec.steps)||spec.steps<1||
  !Number.isFinite(spec.durationS)||spec.durationS<=0||spec.nominalSteps!==null&&(!Number.isSafeInteger(spec.nominalSteps)||spec.nominalSteps<spec.steps))throw new Error('Invalid explicit study specification.');
 const setup:FuelSpatialSetup=structuredClone(seed.setup),R=setup.radiusM,L=setup.lengthM;
 const thickness=setup.liner.radiusEdgesM.at(-1)!-R;
 setup.liner=createFuelLiner({radiusM:R,lengthM:L,thicknessM:thickness,cells:spec.wall,
  radiusEdgesM:Array.from({length:spec.wall+1},(_,i)=>R+thickness*(spec.meshFamily==='quadratic'?(i/spec.wall)**2:Math.expm1(8*i/spec.wall)/Math.expm1(8)))});
 let state:FuelSpatialState={...structuredClone(seed.initialState),linerEnergyJ:initialFuelLinerEnergy(setup.liner,1200)};
 const initialState=structuredClone(state),nr=state.omegaRadS.length,nz=setup.electrical.axialEdgesM.length-1;
 const initialElectrical=solveFuelCurrent({...setup.electrical,omegaRadS:Array.from({length:nr*nz},(_,i)=>state.omegaRadS[i%nr])});
 const knots=Array.from({length:spec.steps+1},(_,k)=>spec.nominalSteps===null?spec.durationS*k/spec.steps:.001*(k/spec.nominalSteps)**2);
 if(Math.abs(knots.at(-1)!-spec.durationS)>64*Number.EPSILON*spec.durationS)throw new Error('Duration does not match the explicit requested time grid.');
 const base={id,setup,initialState,initialElectrical,requestedSteps:spec.steps,spec},prefix=folder+'/'+id;
 writeFileSync(prefix+'.request.json',JSON.stringify({...provenance,case:base})+'\n',{flag:'wx'});
 writeFileSync(prefix+'.steps.ndjson','',{flag:'wx'});
 const started=performance.now(),advance=createFuelSpatialStepper(setup);let accepted=0,failure:string|null=null;
 for(let k=0;k<spec.steps;k++){
  const dtS=knots[k+1]-knots[k];
  try{
   const output=advance(state,dtS);state=output.state;const {payload:_,...thermal}=output.thermal;
   writeFileSync(prefix+'.steps.ndjson',JSON.stringify({dtS,result:{...output,thermal}})+'\n',{flag:'a'});accepted++;
   if(accepted%16===0)writeFileSync(prefix+'.progress.json',JSON.stringify({id,accepted,timeS:knots[accepted],seconds:(performance.now()-started)/1000})+'\n');
  }catch(error){failure=String(error);break;}
 }
 writeFileSync(prefix+'.json',JSON.stringify(provenance).slice(0,-1)+',"cases":['+JSON.stringify(base).slice(0,-1)+',"steps":[',{flag:'wx'});
 let first=true;
 for await(const line of createInterface({input:createReadStream(prefix+'.steps.ndjson'),crlfDelay:Infinity})){
  writeFileSync(prefix+'.json',(first?'':',')+line,{flag:'a'});first=false;
 }
 writeFileSync(prefix+'.json','],"failure":'+JSON.stringify(failure)+'}]}\n',{flag:'a'});
 const progress={id,accepted,requested:spec.steps,failure,seconds:(performance.now()-started)/1000};
 writeFileSync(prefix+'.progress.json',JSON.stringify(progress)+'\n');console.log(JSON.stringify(progress));
 if(failure)process.exitCode=1;
}

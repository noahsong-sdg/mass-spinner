/** Execute only in the offline scientific runner. Keep failures and exact states. */
import {readFileSync,readdirSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {simulateFuelSpatialExperiment,validateFuelSpatialExperiment,type FuelSpatialExperimentConfig} from '../src/fuel-spatial-experiment.js';
import {assessSpatialRefinement,type SpatialRefinementAxis} from '../src/fuel-spatial-convergence.js';
const sha=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');
const output=process.argv[2]??'study-output';
const mode=process.argv[3]??'uniform';
if(!['uniform','upper-graded','tight-current'].includes(mode))throw new RangeError('Unknown spatial study mode.');
// Exclusive creation precedes every computation/write; preserve older partials.
mkdirSync(output);
const walk=(path:string):string[]=>readdirSync(path,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path+'/'+e.name):[path+'/'+e.name]);
const files=[...walk('src'),'package-lock.json','scripts/study-fuel-spatial.ts','docs/SPATIAL-EXPERIMENT-PROTOCOL.md'].sort();
const sourceFiles=Object.fromEntries(files.map(path=>[path,sha(readFileSync(path))]));
const sourceHash=sha(JSON.stringify(sourceFiles));
const cases:{id:string;config:FuelSpatialExperimentConfig;result?:ReturnType<typeof simulateFuelSpatialExperiment>;failure?:string;elapsedMs:number}[]=[];
const requested:Partial<FuelSpatialExperimentConfig>[]=[];
const matrices=mode==='uniform'?[[[4,8,16],[2,4,8],[16,32,64]],[[8,16,32],[32,64,128],[64,128,256]]]:mode==='upper-graded'?[[[8,16,32],[8,16,32],[64,128,256]]]:[];
for(const [radials,axials,timesteps]of matrices)
 for(const radialCells of radials)for(const axialCells of axials)for(const steps of timesteps)requested.push({radialCells,axialCells,steps});
if(mode==='uniform')requested.push({radialCells:16,axialCells:16,steps:64});
if(mode==='upper-graded')for(const axialCells of [64,128])requested.push({radialCells:32,axialCells,steps:256});
if(mode==='tight-current')for(const currentRelativeTolerance of [1e-11,1e-13,1e-15])for(const steps of [64,128,256])
 requested.push({radialCells:32,axialCells:128,steps,currentRelativeTolerance});
for(const input of requested){
 const config=validateFuelSpatialExperiment({...input,axialSpacingPower:mode==='upper-graded'?2:1});
 const {radialCells,axialCells,steps}=config;
 const id=`r${radialCells}-z${axialCells}-t${steps}`+(mode==='tight-current'?`-e${config.currentRelativeTolerance}`:''),started=performance.now();
 const record:typeof cases[number]={id,config,elapsedMs:0};
 try{record.result=simulateFuelSpatialExperiment(config);}catch(error){record.failure=String(error);}
 record.elapsedMs=performance.now()-started;cases.push(record);
 console.log(JSON.stringify({id,failure:record.failure??null,elapsedMs:record.elapsedMs}));
 writeFileSync(output+'/histories.partial.json',JSON.stringify({sourceHash,sourceFiles,cases})+'\n');
}
const comparisons=[];
for(const axis of ['radialCells','axialCells','steps'] as SpatialRefinementAxis[]){
 const seen=new Set<string>();
 for(const record of cases){
  const others=(Object.keys(record.config) as (keyof FuelSpatialExperimentConfig)[]).filter(k=>k!==axis);
  const key=others.map(k=>record.config[k]).join('/');if(seen.has(key))continue;seen.add(key);
  const selected=cases.filter(c=>others.every(k=>c.config[k]===record.config[k])).sort((a,b)=>a.config[axis]-b.config[axis]);
  for(let i=0;i<selected.length-2;i++){
   const triple=selected.slice(i,i+3);
   if(triple[1].config[axis]!==2*triple[0].config[axis]||triple[2].config[axis]!==2*triple[1].config[axis])continue;
   const ids=triple.map(c=>c.id);
   if(triple.some(c=>!c.result)){comparisons.push({axis,ids,blocked:'Incomplete trajectory'});continue;}
   const result=assessSpatialRefinement(triple.map(c=>c.result!) as [NonNullable<typeof record.result>,NonNullable<typeof record.result>,NonNullable<typeof record.result>],axis);
   comparisons.push({...result,ids});console.log(JSON.stringify({axis,ids,metrics:result.metrics}));
  }
 }
}
const summary={schemaVersion:1,kind:'spatial-argon-convergence-study',mode,sourceHash,sourceFiles,
 operationalComplete:cases.every(c=>!c.failure),numericallyQualified:false,experimentallyQualified:false,
 cases:cases.map(({id,config,failure,elapsedMs,result})=>({id,config,failure:failure??null,elapsedMs,
  endpoint:result?.snapshots.at(-1),budgets:result?.budgets})),comparisons};
writeFileSync(output+'/histories.json',JSON.stringify({sourceHash,sourceFiles,cases})+'\n',{flag:'wx'});
writeFileSync(output+'/assessment.json',JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({operationalComplete:summary.operationalComplete,cases:cases.length,comparisons:comparisons.length,sourceHash}));
if(!summary.operationalComplete)process.exitCode=1;

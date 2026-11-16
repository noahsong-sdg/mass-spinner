/** Execute only in the offline scientific runner. Keep failures and exact states. */
import {readFileSync,readdirSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {simulateFuelSpatialExperiment} from '../src/fuel-spatial-experiment.js';
import {assessSpatialRefinement,type SpatialRefinementAxis} from '../src/fuel-spatial-convergence.js';
const sha=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');
const walk=(path:string):string[]=>readdirSync(path,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path+'/'+e.name):[path+'/'+e.name]);
const files=[...walk('src'),'package-lock.json','scripts/study-fuel-spatial.ts','docs/SPATIAL-EXPERIMENT-PROTOCOL.md'].sort();
const sourceFiles=Object.fromEntries(files.map(path=>[path,sha(readFileSync(path))]));
const sourceHash=sha(JSON.stringify(sourceFiles));
const cases:{id:string;config:{radialCells:number;axialCells:number;steps:number};result?:ReturnType<typeof simulateFuelSpatialExperiment>;failure?:string;elapsedMs:number}[]=[];
mkdirSync('study-output',{recursive:true});
for(const radialCells of [4,8,16])for(const axialCells of [2,4,8])for(const steps of [16,32,64]){
 const config={radialCells,axialCells,steps},id=`r${radialCells}-z${axialCells}-t${steps}`,started=performance.now();
 const record:typeof cases[number]={id,config,elapsedMs:0};
 try{record.result=simulateFuelSpatialExperiment(config);}catch(error){record.failure=String(error);}
 record.elapsedMs=performance.now()-started;cases.push(record);
 console.log(JSON.stringify({id,failure:record.failure??null,elapsedMs:record.elapsedMs}));
 writeFileSync('study-output/histories.partial.json',JSON.stringify({sourceHash,sourceFiles,cases})+'\n');
}
const comparisons=[];
for(const axis of ['radialCells','axialCells','steps'] as SpatialRefinementAxis[]){
 const others=(['radialCells','axialCells','steps'] as const).filter(k=>k!==axis);
 const seen=new Set<string>();
 for(const record of cases){
  const key=others.map(k=>record.config[k]).join('/');if(seen.has(key))continue;seen.add(key);
  const selected=cases.filter(c=>others.every(k=>c.config[k]===record.config[k])).sort((a,b)=>a.config[axis]-b.config[axis]);
  if(selected.some(c=>!c.result)){comparisons.push({axis,ids:selected.map(c=>c.id),blocked:'Incomplete trajectory'});continue;}
  const result=assessSpatialRefinement(selected.map(c=>c.result!) as [NonNullable<typeof record.result>,NonNullable<typeof record.result>,NonNullable<typeof record.result>],axis);
  comparisons.push({...result,ids:selected.map(c=>c.id)});
  console.log(JSON.stringify({axis,ids:selected.map(c=>c.id),metrics:result.metrics}));
 }
}
const summary={schemaVersion:1,kind:'spatial-argon-convergence-study',sourceHash,sourceFiles,
 operationalComplete:cases.every(c=>!c.failure),numericallyQualified:false,experimentallyQualified:false,
 cases:cases.map(({id,config,failure,elapsedMs,result})=>({id,config,failure:failure??null,elapsedMs,
  endpoint:result?.snapshots.at(-1),budgets:result?.budgets})),comparisons};
writeFileSync('study-output/histories.json',JSON.stringify({sourceHash,sourceFiles,cases})+'\n',{flag:'wx'});
writeFileSync('study-output/assessment.json',JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({operationalComplete:summary.operationalComplete,cases:cases.length,comparisons:comparisons.length,sourceHash}));
if(!summary.operationalComplete)process.exitCode=1;

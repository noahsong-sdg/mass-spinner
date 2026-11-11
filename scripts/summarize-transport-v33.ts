import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {summarizeConvergence,type ConvergencePlan,type SeedRun} from '../src/convergence.js';

// Explicit paths avoid silently admitting stale, pilot or duplicate artifacts.
const [planPath,mapPath,manifestPath,outputPath]=process.argv.slice(2);
const mapping=JSON.parse(readFileSync(mapPath,'utf8')) as Record<string,string>;
const verify=()=>{for(const [name,expected] of Object.entries(mapping))
 if(createHash('sha256').update(readFileSync(name)).digest('hex')!==expected)throw new Error('Changed input: '+name);};
verify();
const plan=JSON.parse(readFileSync(planPath,'utf8')) as ConvergencePlan;
const manifest=JSON.parse(readFileSync(manifestPath,'utf8')) as {runs:{path:string;sha256:string;status:string;exitCode:number}[]};
const runs=manifest.runs.map(({path,sha256,status,exitCode})=>{
 if(status!=='complete'||exitCode!==0)throw new Error('Run process did not complete: '+path);
 const bytes=readFileSync(path);
 if(createHash('sha256').update(bytes).digest('hex')!==sha256)throw new Error('Changed run: '+path);
 const {raw,...run}=JSON.parse(gunzipSync(bytes).toString()) as SeedRun;
 return run; // The summarizer consumes recorded observables; raw audits run separately.
});
const sourceHash=createHash('sha256').update(JSON.stringify(mapping)).digest('hex');
const summary=summarizeConvergence(plan,runs,sourceHash);
verify();
writeFileSync(outputPath,JSON.stringify({sourceHash,runCount:runs.length,...summary},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:summary.status,runCount:runs.length,checks:summary.checks,
 comparisons:summary.comparisons.map(c=>({...c,observables:Object.entries(c.observables)
  .filter(([,o])=>o.tolerance!==null).reduce((counts,[,o])=>({...counts,[o.status]:(counts[o.status]??0)+1}),{} as Record<string,number>)}))}));

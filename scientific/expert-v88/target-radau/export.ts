import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {simulateCoupledTarget} from '../../../src/coupled-target.js';
const here=new URL('./',import.meta.url),root=new URL('../../../',here);
const sha=(raw:Uint8Array)=>createHash('sha256').update(raw).digest('hex');
const read=(name:string)=>readFileSync(new URL(name,root));
const sourceFiles=['src/coupled-target.ts','src/target-conduction.ts','src/target-material.ts',
 'src/deuteron-stopping.ts','src/fusion-reactor.ts','src/physics.ts','src/material-realism.ts',
 'scientific/expert-v88/target-radau/export.ts','scientific/expert-v88/target-radau/cases.json',
 'scientific/expert-v88/target-radau/PROTOCOL.md'];
const sourceSHA256=Object.fromEntries(sourceFiles.map(name=>[name,sha(read(name))]));
const fixture=JSON.parse(readFileSync(new URL('./cases.json',here),'utf8'));
const output=new URL('./results/browser.json',here);
if(existsSync(output))throw new Error('Preserve existing browser evidence; use a fresh output copy.');
const rows=[];
for(const row of fixture.cases)for(const step of fixture.stepsS){
 const beam={...fixture.beam,...row.beam},config={...fixture.config,...row.config,maxStepS:step};
 try{const result=simulateCoupledTarget(beam,config);rows.push({id:row.id,stepS:step,beam,config,completed:true,solver:result.solver,history:result.history});}
 catch(error){rows.push({id:row.id,stepS:step,beam,config,completed:false,error:String(error)});}
}
mkdirSync(new URL('./results/',here),{recursive:true});
writeFileSync(output,JSON.stringify({schema:1,sourceSHA256,nodeVersion:process.version,rows,
 experimentalQualification:false},null,2)+'\n');
console.log(JSON.stringify(rows.map(r=>({id:r.id,stepS:r.stepS,completed:r.completed,solver:r.solver})),null,2));
if(rows.some(r=>!r.completed))process.exitCode=1;

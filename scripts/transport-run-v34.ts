import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {executeSeed,type ConvergenceLevel} from '../src/convergence.ts';
import type {DoublewellExecutionMode} from '../src/doublewell-dynamics.ts';

const [input,mapPath,output]=process.argv.slice(2);
const mapping=JSON.parse(readFileSync(mapPath,'utf8')) as Record<string,string>;
const verify=()=>{for(const [name,expected] of Object.entries(mapping))
 if(createHash('sha256').update(readFileSync(name)).digest('hex')!==expected)throw new Error('Changed source: '+name);};
verify();
const request=JSON.parse(readFileSync(input,'utf8')) as {level:ConvergenceLevel;seed:number;executionMode:DoublewellExecutionMode};
const sourceHash=createHash('sha256').update(JSON.stringify(mapping)).digest('hex');
const result=executeSeed(request.level,request.seed,sourceHash,request.executionMode);
verify();
writeFileSync(output,gzipSync(JSON.stringify(result)),{flag:'wx'});
console.log(JSON.stringify({level:result.level,seed:result.seed,status:result.status,error:result.error,
 executionMode:result.executionMode,randomSource:result.randomSource,sourceHash,durationMs:result.durationMs,diagnostics:result.diagnostics}));
if(result.status!=='complete')process.exitCode=1;

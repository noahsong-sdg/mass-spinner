/** Join one immutable producer's three bounded captures. No simulation or
 * rescoring: the existing assessor and independent byte auditor follow. */
import {constants,copyFileSync,createReadStream,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const [input,output]=process.argv.slice(2),grids=[1024,2048,4096],times=[64,128,256];
type Case={n:number;steps:number;file:string;sha256:string;rows:number;failure:string|null};
const captures=grids.map(n=>{
 const root=join(input,`gas-${n}`),bytes=readFileSync(join(root,'index.json')),packet=JSON.parse(bytes.toString('utf8'));
 if(packet.schemaVersion!==1||!Array.isArray(packet.cases)||packet.cases.length!==times.length||
  times.some(t=>packet.cases.filter((c:Case)=>c.n===n&&c.steps===t&&c.file===`coupled-g${n}-e16-z32-t${t}.jsonl.gz`&&
   c.failure===null&&c.rows===t+1).length!==1))
  throw new RangeError('Capture must contain its three distinct frozen grid/time cases.');
 return {root,packet,sha256:createHash('sha256').update(bytes).digest('hex')};
});
const keys=['schemaVersion','conditions','durationS','totalParticles','sourceFiles','requests'];
if(captures.some(c=>keys.some(key=>JSON.stringify(c.packet[key])!==JSON.stringify(captures[0].packet[key]))))
 throw new RangeError('Capture cohorts must have identical producer identities and frozen protocol.');
for(const capture of captures)for(const c of capture.packet.cases as Case[]){
 const hash=createHash('sha256');
 for await(const chunk of createReadStream(join(capture.root,c.file)))hash.update(chunk);
 if(hash.digest('hex')!==c.sha256)throw new RangeError('Captured stream byte identity mismatch.');
}
mkdirSync(output);
const cases=captures.flatMap(c=>c.packet.cases as Case[]).sort((a,b)=>a.n-b.n||a.steps-b.steps);
for(const capture of captures)for(const c of capture.packet.cases as Case[])
 copyFileSync(join(capture.root,c.file),join(output,c.file),constants.COPYFILE_EXCL);
writeFileSync(join(output,'index.json'),JSON.stringify({...captures[0].packet,cases,
 mergeCodeSha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),
 captureIndexes:captures.map((c,i)=>({grid:grids[i],sha256:c.sha256}))})+'\n',{flag:'wx'});

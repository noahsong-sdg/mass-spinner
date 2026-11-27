import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,readdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/heat-reuse-index.json',import.meta.url),'utf8'));
function attempt(change:(packet:typeof fixture,n:number)=>void,tamper=false){
 const root=mkdtempSync(join(tmpdir(),'nested-capture-'));
 try{
  const expected=[];
  for(const n of [1024,2048,4096]){
   const packet=structuredClone(fixture);packet.cases=packet.cases.filter((c:{n:number})=>c.n===n);
   for(const c of packet.cases)c.sha256=createHash('sha256').update(`captured ${n} ${c.steps}`).digest('hex');
   change(packet,n);expected.push(...packet.cases);
   const folder=join(root,`gas-${n}`);mkdirSync(folder);writeFileSync(join(folder,'index.json'),JSON.stringify(packet));
   for(const c of packet.cases)writeFileSync(join(folder,c.file),`captured ${n} ${c.steps}`);
   if(tamper&&n===2048)writeFileSync(join(folder,packet.cases[0].file),'changed captured bytes');
  }
  const out=join(root,'joined'),result=spawnSync(process.execPath,['--import','tsx','scripts/merge-fuel-nested-captures.ts',root,out],{encoding:'utf8'});
  return {status:result.status,error:result.stderr,folders:readdirSync(root),
   expected,packet:result.status===0?JSON.parse(readFileSync(join(out,'index.json'),'utf8')):null};
 }finally{rmSync(root,{recursive:true,force:true});}
}
test('joins a complete immutable cohort without changing producer receipts',()=>{
 const result=attempt(()=>{});assert.equal(result.status,0,result.error);
 assert.deepEqual(result.packet.cases,result.expected);assert.deepEqual(result.packet.sourceFiles,fixture.sourceFiles);
 assert.equal(result.packet.captureIndexes.length,3);
});
test('refuses stale producer cohorts and missing or duplicate capture cases before writing output',()=>{
 for(const change of [(p:typeof fixture,n:number)=>{if(n===2048)p.sourceFiles['src/fuel-gas.ts']='0'.repeat(64);},
  (p:typeof fixture,n:number)=>{if(n===2048)p.conditions.gasWallWK*=2;},
  (p:typeof fixture,n:number)=>{if(n===2048)p.cases.pop();},
  (p:typeof fixture,n:number)=>{if(n===2048)p.cases[1]=p.cases[0];},
  (p:typeof fixture,n:number)=>{if(n===2048)p.cases[0].failure='incomplete step';},
  (p:typeof fixture,n:number)=>{if(n===2048)p.cases[0].rows--;}]){
  const result=attempt(change);assert.notEqual(result.status,0);assert.ok(!result.folders.includes('joined'));
  assert.match(result.error,/distinct frozen|identical producer/);
 }
});
test('refuses tampered native bytes before joining or assessment',()=>{
 const result=attempt(()=>{},true);assert.notEqual(result.status,0);
 assert.ok(!result.folders.includes('joined'));assert.match(result.error,/byte identity mismatch/);
});

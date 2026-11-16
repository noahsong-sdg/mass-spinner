import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const fixture=readFileSync(new URL('./fixtures/heat-reuse-index.json',import.meta.url),'utf8');
function attempt(change:(packet:ReturnType<typeof JSON.parse>)=>void){
 const root=mkdtempSync(join(tmpdir(),'heat-reuse-'));
 try{
  const packet=JSON.parse(fixture);change(packet);writeFileSync(join(root,'index.json'),JSON.stringify(packet));
  const result=spawnSync(process.execPath,['--import','tsx','scripts/probe-fuel-nested-coupling.ts',root,'--assess-only'],{encoding:'utf8'});
  assert.notEqual(result.status,0);assert.deepEqual(readdirSync(root),['index.json'],'Reuse must never start or overwrite a native trajectory.');
  return result.stderr;
 }finally{rmSync(root,{recursive:true,force:true});}
}
test('retained old index is admitted without new metadata, then requires its existing native streams',()=>{
 const error=attempt(()=>{});
 assert.match(error,/ENOENT/);assert.match(error,/coupled-g1024-e16-z32-t64.jsonl.gz/);
 assert.doesNotMatch(error,/unchanged protocol/);
});
test('reuse refuses consistently stale configurations and missing producer identity before reading trajectories',()=>{
 assert.match(attempt(p=>{for(const c of p.cases)c.config.numberDensityM3*=2;}),/unchanged protocol/);
 assert.match(attempt(p=>{delete p.sourceFiles;}),/unchanged protocol/);
 assert.match(attempt(p=>{p.cases.pop();}),/unchanged protocol/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

test('study CLI refuses a persisted output directory before changing old partial or final evidence',t=>{
 const output=mkdtempSync(join(tmpdir(),'spatial-study-stale-'));
 t.after(()=>rmSync(output,{recursive:true,force:true}));
 const names=['histories.partial.json','histories.json','assessment.json'];
 for(const name of names)writeFileSync(join(output,name),'retained '+name+'\n');
 const child=spawnSync(process.execPath,['--import','tsx','scripts/study-fuel-spatial.ts',output],{encoding:'utf8',timeout:30_000});
 assert.notEqual(child.status,0);assert.match(child.stderr,/EEXIST/);assert.equal(child.stdout,'');
 for(const name of names)assert.equal(readFileSync(join(output,name),'utf8'),'retained '+name+'\n');
});

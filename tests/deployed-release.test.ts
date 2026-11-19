import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {sealRelease} from '../scripts/release-manifest.ts';
import {verifyDeployedRelease} from '../scripts/verify-deployed-release.ts';

async function fixture(){
 const root=await mkdtemp(join(tmpdir(),'deployed-'));await mkdir(join(root,'assets'));
 await writeFile(join(root,'index.html'),'qualified old UI');
 await writeFile(join(root,'assets/retained-12345678.js'),'retained lazy module');
 await writeFile(join(root,'data.json'),'qualified old data');
 const manifest=await sealRelease(root,'a'.repeat(40));
 return {root,manifest,download:(name:string)=>readFile(join(root,name))};
}

test('post-deployment admission verifies every served file independently of current UI semantics',async t=>{
 const f=await fixture();t.after(()=>rm(f.root,{recursive:true,force:true}));const requests:string[]=[];
 assert.deepEqual(await verifyDeployedRelease(f.root,async name=>{requests.push(name);return f.download(name);}),f.manifest);
 assert.deepEqual(requests.sort(),['release-manifest.json',...Object.keys(f.manifest.files)].sort());
});

test('post-deployment admission rejects a stale manifest before asset requests',async t=>{
 const f=await fixture();t.after(()=>rm(f.root,{recursive:true,force:true}));const requests:string[]=[];
 const stale=Buffer.from(JSON.stringify({...f.manifest,sourceRevision:'b'.repeat(40)}));
 await assert.rejects(verifyDeployedRelease(f.root,async name=>{requests.push(name);return stale;}),/Deployed manifest differs/);
 assert.deepEqual(requests,['release-manifest.json']);
});

test('a matching deployed manifest cannot conceal stale HTML, corrupt retained chunks or missing data',async t=>{
 const f=await fixture();t.after(()=>rm(f.root,{recursive:true,force:true}));
 for(const name of ['index.html','assets/retained-12345678.js']){
  await assert.rejects(verifyDeployedRelease(f.root,file=>file===name?Promise.resolve(Buffer.from('incorrect served bytes')):f.download(file)),/Deployed asset digest mismatch/);
 }
 await assert.rejects(verifyDeployedRelease(f.root,file=>file==='data.json'?Promise.reject(new Error('HTTP 404')):f.download(file)),/HTTP 404/);
});

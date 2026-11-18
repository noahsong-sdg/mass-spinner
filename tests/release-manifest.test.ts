import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,symlink,mkdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {sealRelease,verifyRelease,retainAssets} from '../scripts/release-manifest.ts';

test('release admission rejects changed bytes, missing files, stale extra assets and symlinks',async t=>{
 const root=await mkdtemp(join(tmpdir(),'release-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await writeFile(join(root,'index.html'),'current');
 const manifest=await sealRelease(root,'a'.repeat(40));
 assert.deepEqual(await verifyRelease(root),manifest);
 await writeFile(join(root,'index.html'),'old');await assert.rejects(verifyRelease(root),/digest mismatch/);
 await writeFile(join(root,'index.html'),'current');await writeFile(join(root,'stale.js'),'previous build');
 await assert.rejects(verifyRelease(root),/inventory differs/);await rm(join(root,'stale.js'));
 await rm(join(root,'index.html'));await assert.rejects(verifyRelease(root),/ENOENT/);
 await symlink('release-manifest.json',join(root,'index.html'));await assert.rejects(sealRelease(root,'b'.repeat(40)),/symlink/);
});

test('version skew retains only verified hashed chunks and leaves current entry points intact',async t=>{
 const root=await mkdtemp(join(tmpdir(),'retain-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const current=join(root,'new'),previous=join(root,'old');
 for(const dir of [current,previous])await mkdir(join(dir,'assets'),{recursive:true});
 await writeFile(join(previous,'index.html'),'old page');await writeFile(join(previous,'assets/lazy-12345678.js'),'old lazy module');
 await writeFile(join(previous,'mutable.json'),'old data');await sealRelease(previous,'a'.repeat(40));
 await writeFile(join(current,'index.html'),'new page');await writeFile(join(current,'assets/main-abcdefgh.js'),'new module');await sealRelease(current,'b'.repeat(40));
 const manifest=await retainAssets(current,previous);assert.equal(manifest.sourceRevision,'b'.repeat(40));assert.equal(manifest.retainedFrom,'a'.repeat(40));
 assert.equal(await readFile(join(current,'index.html'),'utf8'),'new page');assert.equal(await readFile(join(current,'assets/lazy-12345678.js'),'utf8'),'old lazy module');
 await assert.rejects(readFile(join(current,'mutable.json')),/ENOENT/);
 await writeFile(join(previous,'assets/lazy-12345678.js'),'tampered');await assert.rejects(retainAssets(current,previous),/digest mismatch/);
});

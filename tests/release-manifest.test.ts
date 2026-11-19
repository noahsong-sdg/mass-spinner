import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,symlink,mkdir,readFile,cp} from 'node:fs/promises';
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


test('prepared releases retain A-only and B-only modules through C and rollback without carrying stale HTML/data',async t=>{
 const root=await mkdtemp(join(tmpdir(),'generations-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const versions=['a','b','c'].map(name=>join(root,name));
 for(const [i,directory]of versions.entries()){
  await mkdir(join(directory,'assets'),{recursive:true});
  await writeFile(join(directory,'index.html'),`page ${i}`);await writeFile(join(directory,'data.json'),`data ${i}`);
  await writeFile(join(directory,`assets/lazy-${String(i).repeat(8)}.js`),`module ${i}`);
  await sealRelease(directory,String(i).repeat(40));
 }
 const [a,b,c]=versions as [string,string,string],rollback=join(root,'rollback');
 await cp(a,rollback,{recursive:true});
 await retainAssets(b,a);const current=await retainAssets(c,b);
 assert.equal(current.sourceRevision,'2'.repeat(40));
 for(let i=0;i<3;i++)assert.equal(await readFile(join(c,`assets/lazy-${String(i).repeat(8)}.js`),'utf8'),`module ${i}`);
 assert.equal(await readFile(join(c,'index.html'),'utf8'),'page 2');assert.equal(await readFile(join(c,'data.json'),'utf8'),'data 2');
 const restored=await retainAssets(rollback,c);assert.equal(restored.sourceRevision,'0'.repeat(40));
 for(let i=0;i<3;i++)assert.equal(await readFile(join(rollback,`assets/lazy-${String(i).repeat(8)}.js`),'utf8'),`module ${i}`);
 assert.equal(await readFile(join(rollback,'index.html'),'utf8'),'page 0');assert.equal(await readFile(join(rollback,'data.json'),'utf8'),'data 0');
});

test('retention rejects independently valid artifacts with a conflicting content-hashed filename',async t=>{
 const root=await mkdtemp(join(tmpdir(),'collision-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const current=join(root,'current'),previous=join(root,'previous');
 for(const [directory,content]of [[current,'new'],[previous,'old']] as const){
  await mkdir(join(directory,'assets'),{recursive:true});await writeFile(join(directory,'assets/lazy-12345678.js'),content);
  await sealRelease(directory,(directory===current?'a':'b').repeat(40));
 }
 await assert.rejects(retainAssets(current,previous),/Hashed asset collision/);
 assert.equal(await readFile(join(current,'assets/lazy-12345678.js'),'utf8'),'new');
 await verifyRelease(current);
});

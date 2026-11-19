import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,mkdir,writeFile,readFile,rm,cp,access} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {bootstrapRelease} from '../scripts/bootstrap-release.ts';
import {sealRelease,retainAssets,verifyRelease,type ReleaseManifest} from '../scripts/release-manifest.ts';

const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
async function fixture(){
 const root=await mkdtemp(join(tmpdir(),'bootstrap-')),base=join(root,'base'),old=join(root,'old'),prepared=join(root,'prepared');
 for(const [directory,label]of [[base,'current'],[old,'older']] as const){
  await mkdir(join(directory,'assets'),{recursive:true});
  await writeFile(join(directory,'index.html'),label);await writeFile(join(directory,'data.json'),label);
  await writeFile(join(directory,'_redirects'),'/old /index.html 301\n');await writeFile(join(directory,'_headers'),'/*\n  X-Test: qualified\n');
  await writeFile(join(directory,`assets/lazy-${label}12345678.js`),`export const label='${label}';`);
  await sealRelease(directory,(label==='current'?'a':'b').repeat(40));
 }
 await cp(base,prepared,{recursive:true});await retainAssets(prepared,old);
 const bytes=await readFile(join(prepared,'release-manifest.json'));
 return {root,base,prepared,bytes,destination:join(root,'restored'),download:(name:string)=>readFile(join(prepared,name))};
}

test('explicit bootstrap admits all pinned prepared generations against the qualified base',async t=>{
 const f=await fixture();t.after(()=>rm(f.root,{recursive:true,force:true}));
 const requested:string[]=[];
 const restored=await bootstrapRelease(f.base,f.destination,hash(f.bytes),async name=>{
  requested.push(name);if(name==='_redirects'||name==='_headers')throw new Error('HTTP 404: deployment control');return f.download(name);
 });
 assert.ok(!requested.includes('_redirects')&&!requested.includes('_headers'));
 assert.equal(await readFile(join(f.destination,'_redirects'),'utf8'),await readFile(join(f.base,'_redirects'),'utf8'));
 assert.equal(await readFile(join(f.destination,'_headers'),'utf8'),await readFile(join(f.base,'_headers'),'utf8'));
 assert.deepEqual(restored,await verifyRelease(f.prepared));
 assert.equal(await readFile(join(f.destination,'index.html'),'utf8'),'current');
 assert.match(await readFile(join(f.destination,'assets/lazy-older12345678.js'),'utf8'),/older/);
});

test('bootstrap rejects stale identities, changed/missing base files, unqualified extras and unsafe paths before fetching assets',async t=>{
 const f=await fixture();t.after(()=>rm(f.root,{recursive:true,force:true}));
 const edits:[string,(manifest:ReleaseManifest)=>void,RegExp][]=[
  ['source',m=>{m.sourceRevision='c'.repeat(40);},/identity differs/],
  ['lock',m=>{m.lockSHA256='c'.repeat(64);},/identity differs/],
  ['node',m=>{m.node='another runtime';},/identity differs/],
  ['base changed',m=>{m.files['index.html']='c'.repeat(64);},/base digest differs/],
  ['control changed',m=>{m.files['_redirects']='c'.repeat(64);},/base digest differs/],
  ['control missing',m=>{delete m.files['_headers'];},/base digest differs/],
  ['base missing',m=>{delete m.files['data.json'];},/base digest differs/],
  ['old HTML',m=>{m.files['old.html']='c'.repeat(64);},/unqualified entrypoint or data/],
  ['old data',m=>{m.files['stale.json']='c'.repeat(64);},/unqualified entrypoint or data/],
  ['unhashed module',m=>{m.files['assets/old.js']='c'.repeat(64);},/unqualified entrypoint or data/],
  ['path traversal',m=>{m.files['../lazy-12345678.js']='c'.repeat(64);},/Invalid release path/],
  ['absolute path',m=>{m.files['/lazy-12345678.js']='c'.repeat(64);},/Invalid release path/],
  ['empty path',m=>{m.files['']='c'.repeat(64);},/Invalid release path/],
  ['non-string digest',m=>{Object.assign(m.files,{'assets/lazy-12345678.js':['c'.repeat(64)]});},/Invalid release path or digest/],
 ];
 for(const [label,edit,error]of edits){
  const manifest=JSON.parse(f.bytes.toString()) as ReleaseManifest;edit(manifest);
  const bytes=Buffer.from(JSON.stringify(manifest)),requests:string[]=[];
  await assert.rejects(bootstrapRelease(f.base,f.destination,hash(bytes),async name=>{requests.push(name);return bytes;}),error,label);
  assert.deepEqual(requests,['release-manifest.json'],label);await assert.rejects(access(f.destination),/ENOENT/,label);
 }
});

test('bootstrap rejects a changed pinned manifest, corrupted assets and an already populated destination',async t=>{
 const f=await fixture();t.after(()=>rm(f.root,{recursive:true,force:true}));
 await assert.rejects(bootstrapRelease(f.base,f.destination,'0'.repeat(64),f.download),/manifest digest mismatch/);
 await assert.rejects(access(f.destination),/ENOENT/);
 await assert.rejects(bootstrapRelease(f.base,f.destination,hash(f.bytes),name=>name==='assets/lazy-older12345678.js'?Promise.resolve(Buffer.from('corrupted')):f.download(name)),/asset digest mismatch/);
 await assert.rejects(access(f.destination),/ENOENT/);
 await mkdir(f.destination);await writeFile(join(f.destination,'keep.txt'),'existing data');
 await assert.rejects(bootstrapRelease(f.base,f.destination,hash(f.bytes),f.download),/EEXIST/);
 assert.equal(await readFile(join(f.destination,'keep.txt'),'utf8'),'existing data');
});

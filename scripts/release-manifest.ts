import {createHash} from 'node:crypto';
import {readdir,readFile,writeFile,lstat,mkdir,copyFile} from 'node:fs/promises';
import {resolve,relative,sep,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';

export type ReleaseManifest={schemaVersion:1;sourceRevision:string;lockSHA256:string;node:string;files:Record<string,string>;retainedFrom?:string};
const digest=(data:Uint8Array)=>createHash('sha256').update(data).digest('hex');

async function inventory(root:string,directory=root):Promise<Record<string,string>>{
 const files:Record<string,string>={};
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const path=resolve(directory,entry.name),name=relative(root,path).split(sep).join('/');
  if(entry.isSymbolicLink())throw new Error(`Release contains a symlink: ${name}`);
  if(entry.isDirectory())Object.assign(files,await inventory(root,path));
  else if(name!=='release-manifest.json')files[name]=digest(await readFile(path));
 }
 return Object.fromEntries(Object.entries(files).sort(([a],[b])=>a.localeCompare(b)));
}

export async function sealRelease(directory:string,sourceRevision:string):Promise<ReleaseManifest>{
 if(!/^[a-f0-9]{40}$/.test(sourceRevision))throw new Error('A full source revision is required.');
 const manifest:ReleaseManifest={schemaVersion:1,sourceRevision,lockSHA256:digest(await readFile('package-lock.json')),node:process.version,files:await inventory(resolve(directory))};
 await writeFile(resolve(directory,'release-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 return manifest;
}

export async function verifyRelease(directory:string):Promise<ReleaseManifest>{
 const root=resolve(directory),manifest:unknown=JSON.parse(await readFile(resolve(root,'release-manifest.json'),'utf8'));
 if(!manifest||typeof manifest!=='object')throw new Error('Missing release manifest.');
 const value=manifest as ReleaseManifest;
 if(value.schemaVersion!==1||!/^[a-f0-9]{40}$/.test(value.sourceRevision)||!/^[a-f0-9]{64}$/.test(value.lockSHA256)||!value.files||typeof value.files!=='object'||Array.isArray(value.files)||typeof value.node!=='string')throw new Error('Invalid release identity.');
 for(const [name,hash]of Object.entries(value.files)){
  const path=resolve(root,name);
  if(relative(root,path).startsWith('..')||name!==relative(root,path).split(sep).join('/')||!/^[a-f0-9]{64}$/.test(hash))throw new Error('Invalid release path or digest.');
  if(!(await lstat(path)).isFile()||digest(await readFile(path))!==hash)throw new Error(`Release digest mismatch: ${name}`);
 }
 const current=await inventory(root);
 if(JSON.stringify(current)!==JSON.stringify(value.files))throw new Error('Release file inventory differs.');
 return value;
}

/** Retain only content-hashed Vite chunks; never carry old HTML or unhashed data. */
export async function retainAssets(directory:string,previous:string){
 const current=await verifyRelease(directory),old=await verifyRelease(previous);
 for(const [name,hash]of Object.entries(old.files)){
  if(!/^assets\/(?:[^/]+\/)*[^/]+-[A-Za-z0-9_-]{8,}\.(?:js|css|wasm)$/.test(name))continue;
  if(current.files[name]){
   if(current.files[name]!==hash)throw new Error(`Hashed asset collision: ${name}`);
   continue;
  }
  const destination=resolve(directory,name);await mkdir(dirname(destination),{recursive:true});
  await copyFile(resolve(previous,name),destination);
 }
 const manifest={...current,retainedFrom:old.sourceRevision,files:await inventory(resolve(directory))};
 await writeFile(resolve(directory,'release-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 return verifyRelease(directory);
}

if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename)){
 const [action,directory='release',previous]=process.argv.slice(2);
 const result=action==='seal'?await sealRelease(directory,execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()):action==='verify'?await verifyRelease(directory):action==='retain'&&previous?await retainAssets(directory,previous):null;
 if(!result)throw new Error('Usage: release-manifest.ts seal|verify [directory] | retain directory previous');
 console.log(`${result.sourceRevision}: ${Object.keys(result.files).length} verified files`);
}

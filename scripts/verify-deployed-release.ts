import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {isDeploymentControlFile,verifyRelease} from './release-manifest.ts';
import {downloadReleaseFile,inspectReleaseRedirect,RELEASE_ORIGIN} from './release-download.ts';

const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');

/** Verify deployed bytes against the admitted artifact, independent of UI version. */
export async function verifyDeployedRelease(directory:string,download:(name:string)=>Promise<Uint8Array>,inspect?:(source:string)=>Promise<{status:number;location:string}>){
 const manifest=await verifyRelease(directory),expected=await readFile(resolve(directory,'release-manifest.json'));
 const redirects: {source:string;destination:string}[]=[];
 if(Object.hasOwn(manifest.files,'_redirects')){
  for(const line of (await readFile(resolve(directory,'_redirects'),'utf8')).split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith('#'))){
   const [source,destination,code,...extra]=line.split(/\s+/);
   if(!source||!/^\/(?!\/)[^\s:*?#\\]*$/.test(source)||!destination||!/^\/(?!\/)[^\s:*\\]*$/.test(destination)||code!=='301'||extra.length)throw new Error(`Only literal same-origin 301 redirects are qualified: ${line}`);
   redirects.push({source,destination});
  }
 }
 if(redirects.length&&!inspect)throw new Error('Redirect behavior inspection is required.');
 if(digest(await download('release-manifest.json'))!==digest(expected))throw new Error('Deployed manifest differs from the admitted artifact.');
 const entries=Object.entries(manifest.files).filter(([name])=>!isDeploymentControlFile(name));let next=0;
 const workers=await Promise.allSettled(Array.from({length:4},async()=>{
  while(next<entries.length){
   const [name,hash]=entries[next++]!;
   if(digest(await download(name))!==hash)throw new Error(`Deployed asset digest mismatch: ${name}`);
  }
 }));
 for(const worker of workers)if(worker.status==='rejected')throw worker.reason;
 if(inspect)for(const {source,destination}of redirects){
  const actual=await inspect(source);
  if(actual.status!==301||!actual.location||new URL(actual.location,new URL(source,RELEASE_ORIGIN)).href!==new URL(destination,RELEASE_ORIGIN).href)throw new Error(`Deployed redirect differs: ${source}`);
 }
 return manifest;
}

if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename)){
 const manifest=await verifyDeployedRelease(process.argv[2]??'release',async name=>{
  const bytes=await downloadReleaseFile(name);
  if(name==='release-manifest.json')await writeFile('deployed-manifest.json',bytes);
  return bytes;
 },inspectReleaseRedirect);
 const controls=Object.keys(manifest.files).filter(isDeploymentControlFile);
 console.log(`${manifest.sourceRevision}: ${Object.keys(manifest.files).length-controls.length} served files verified; ${controls.length} deployment control files verified locally.`);
 if(controls.includes('_headers'))console.log('Deployed header behavior is not qualified.');
}

import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {verifyRelease} from './release-manifest.ts';
import {downloadReleaseFile} from './release-download.ts';

const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');

/** Verify deployed bytes against the admitted artifact, independent of UI version. */
export async function verifyDeployedRelease(directory:string,download:(name:string)=>Promise<Uint8Array>){
 const manifest=await verifyRelease(directory),expected=await readFile(resolve(directory,'release-manifest.json'));
 if(digest(await download('release-manifest.json'))!==digest(expected))throw new Error('Deployed manifest differs from the admitted artifact.');
 const entries=Object.entries(manifest.files);let next=0;
 const workers=await Promise.allSettled(Array.from({length:4},async()=>{
  while(next<entries.length){
   const [name,hash]=entries[next++]!;
   if(digest(await download(name))!==hash)throw new Error(`Deployed asset digest mismatch: ${name}`);
  }
 }));
 for(const worker of workers)if(worker.status==='rejected')throw worker.reason;
 return manifest;
}

if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename)){
 const manifest=await verifyDeployedRelease(process.argv[2]??'release',async name=>{
  const bytes=await downloadReleaseFile(name);
  if(name==='release-manifest.json')await writeFile('deployed-manifest.json',bytes);
  return bytes;
 });
 console.log(`${manifest.sourceRevision}: ${Object.keys(manifest.files).length} deployed files verified`);
}

import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {isDeploymentControlFile,isRetainableAsset,readReleaseManifest,verifyRelease} from './release-manifest.ts';
import {downloadReleaseFile} from './release-download.ts';

const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
type DownloadAsset=(name:string)=>Promise<Uint8Array>;

/** One explicit migration from a pinned, already deployed prepared tree. The
 * qualified base admits entrypoints/data; only hashed chunks may extend it. */
export async function bootstrapRelease(verifiedDirectory:string,directory:string,manifestSHA256:string,download:DownloadAsset){
 if(!/^[a-f0-9]{64}$/.test(manifestSHA256))throw new Error('A pinned bootstrap manifest SHA256 is required.');
 const base=await verifyRelease(verifiedDirectory),bytes=await download('release-manifest.json');
 if(digest(bytes)!==manifestSHA256)throw new Error('Bootstrap manifest digest mismatch.');
 const root=resolve(directory);await mkdir(root);
 try{
  await writeFile(resolve(root,'release-manifest.json'),bytes);
  // Validate every path/digest before any manifest-directed network request.
  const prepared=await readReleaseManifest(root);
  if(prepared.sourceRevision!==base.sourceRevision||prepared.lockSHA256!==base.lockSHA256||prepared.node!==base.node)throw new Error('Bootstrap release identity differs from its qualified base.');
  for(const [name,hash]of Object.entries(base.files))if(prepared.files[name]!==hash)throw new Error(`Bootstrap base digest differs: ${name}`);
  for(const name of Object.keys(prepared.files))if(!Object.hasOwn(base.files,name)&&!isRetainableAsset(name))throw new Error(`Bootstrap contains an unqualified entrypoint or data file: ${name}`);
  const names=Object.keys(prepared.files);let next=0;
  const workers=await Promise.allSettled(Array.from({length:4},async()=>{
   while(next<names.length){
    const name=names[next++]!,content=isDeploymentControlFile(name)?await readFile(resolve(verifiedDirectory,name)):await download(name);
    if(digest(content)!==prepared.files[name])throw new Error(`Bootstrap asset digest mismatch: ${name}`);
    await mkdir(dirname(resolve(root,name)),{recursive:true});await writeFile(resolve(root,name),content);
   }
  }));
  for(const worker of workers)if(worker.status==='rejected')throw worker.reason;
  return await verifyRelease(root);
 }catch(error){await rm(root,{recursive:true,force:true});throw error;}
}

if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename)){
 const [verified,destination,hash]=process.argv.slice(2);
 if(!verified||!destination||!hash)throw new Error('Usage: bootstrap-release.ts verified-directory new-directory manifest-sha256');
 const manifest=await bootstrapRelease(verified,destination,hash,downloadReleaseFile);
 console.log(`${manifest.sourceRevision}: ${Object.keys(manifest.files).length} admitted bootstrap files`);
}

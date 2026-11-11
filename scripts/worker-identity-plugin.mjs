import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {relative,resolve} from 'node:path';

const marker='__MASS_SPINNER_WORKER_IDENTITY_V1__';
const hash=value=>createHash('sha256').update(value).digest('hex');

/** Runs in Vite's worker build, whose module IDs are the producing import graph. */
export function workerIdentityPlugin(root){
 const identityModule=resolve(root,'src/worker-identity.ts');
 return {
  name:'worker-producing-code',
  transform(_code,id){
   if(id===identityModule)return `export const workerProducingCode=${JSON.stringify(marker)};`;
  },
  renderChunk(code){
   if(!code.includes(marker))return;
   const files=new Set([...this.getModuleIds()].filter(id=>id.startsWith(root+'/')&&!id.includes('?')));
   for(const file of ['package.json','package-lock.json','vite.config.mjs','scripts/worker-identity-plugin.mjs'])files.add(resolve(root,file));
   const sourceFiles=Object.fromEntries([...files].sort().map(file=>[relative(root,file),hash(readFileSync(file))]));
   const identity={schemaVersion:1,algorithm:'sha256',sourceHash:hash(JSON.stringify(sourceFiles)),sourceFiles};
   const updated=code.replace(new RegExp(`(["'])${marker}\\1`,'g'),()=>JSON.stringify(identity));
   if(updated.includes(marker))throw new Error('Worker producing-code identity was not bound.');
   return {code:updated,map:null};
  },
 };
}

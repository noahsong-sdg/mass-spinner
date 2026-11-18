import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
export function equilibriumIdentityPlugin(root){
 const hash=v=>createHash('sha256').update(v).digest('hex');
 const files=['src/array-shape.ts','src/fuel-equilibrium.ts','src/fuel-centrifuge.ts','src/fuel-equilibrium-ui.ts','src/equilibrium-identity.ts','scripts/equilibrium-identity-plugin.mjs','vite.config.mjs','package.json','package-lock.json'];
 return {name:'equilibrium-producing-code',transform(_code,id){
  if(id!==resolve(root,'src/equilibrium-identity.ts'))return;
  const sourceFiles=Object.fromEntries(files.map(file=>[file,hash(readFileSync(resolve(root,file)))]));
  return `export const equilibriumProducingCode=${JSON.stringify({schemaVersion:1,algorithm:'sha256',sourceHash:hash(JSON.stringify(sourceFiles)),sourceFiles})};`;
 }};
}

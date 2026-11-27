import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {matchesGlob} from 'node:path';

test('maintained qualification workflows cover source changes after merge and on pull requests',()=>{
 const inputs:Record<string,string[]>={
  'active-science':['scientific/active/uv.lock','scientific/catalog/evidence.json','scientific/public-data-campaign/study.py','src/fuel-thermal.ts','src/array-shape.ts','schemas/scenario.json','scripts/export-thermal-toolchain.ts','package-lock.json','ci/Dockerfile.science'],
  'blender-lts':['blender/render.py','web-assets/models/centrifuge-assembly.glb','ci/Dockerfile.blender'],
  'fenicsx-qualification':['scientific/current-fenicsx-reference/reference.py','scientific/nonrigid-v98/fem98.py','ci/Dockerfile.fenicsx'],
 };
 for(const [name,files]of Object.entries(inputs)){
  const path=`.github/workflows/${name}.yml`,source=readFileSync(path,'utf8');
  for(const event of ['push','pull_request']){
   const block=new RegExp(`^  ${event}:\\n((?:    [^\\n]*\\n)+)`,'m').exec(source)?.[1];
   assert.ok(block,`${name}: ${event} trigger required`);
   assert.doesNotMatch(block,/branches(?:-ignore)?:/,`${name}: qualification must survive leaving the migration branch`);
   const list=/paths: \[([^\]]+)\]/.exec(block)?.[1];
   assert.ok(list,`${name}: explicit path coverage required`);
   const patterns=list.split(',').map(value=>value.trim());
   for(const file of [...files,path])assert.ok(patterns.some(pattern=>matchesGlob(file,pattern)),`${name}: ${event} misses ${file}`);
  }
 }
});

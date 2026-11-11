import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const html=readFileSync('release/index.html','utf8');
const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(match=>match[1]));
for(const file of ['src/main.js','src/study-ui.js']){
 const source=readFileSync(file,'utf8');
 for(const match of source.matchAll(/\$\('([a-z][a-z0-9-]*)'\)/g))
  assert.ok(ids.has(match[1]),`Missing application control in ${file}: ${match[1]}`);
}
for(const match of html.matchAll(/(?:src|href)="(\/[^"#]+)"/g))
  assert.ok(existsSync(`release${match[1]}`),`Missing published resource: ${match[1]}`);
for(const name of readdirSync('release/assets').filter(name=>name.endsWith('.js'))){
  const parsed=spawnSync(process.execPath,['--check',`release/assets/${name}`],{encoding:'utf8'});
  assert.equal(parsed.status,0,parsed.stderr);
}
for(const name of ['separator.glb','separator-cutaway.png','TUTORIAL-REVIEW.md','VALIDATION.md',
 'COUPLED-TARGET-V35.md','MARATHON-REALISM-V35.md','marathon-reference/neutrons-v35.json','marathon-reference/h1-endfb81-v35.json','marathon-reference/implantation-v35.json'])
  assert.ok(existsSync(`release/${name}`),`Missing deployment asset: ${name}`);
const atlas=JSON.parse(readFileSync('release/reference-atlas/manifest.json','utf8'));
const apparatus=JSON.parse(readFileSync('release/renders/manifest.json','utf8'));
for(const mode of ['beam-target','gyro','icr','curved','centrifuge','rotating','doublewell','doublewell-dynamics','blanket']){
 const asset=apparatus.assets[mode];assert.ok(asset,`Missing rendered mechanism: ${mode}`);
 for(const path of [asset.image,asset.png,asset.model])assert.ok(path&&existsSync(`release${path}`),`Missing apparatus resource: ${path}`);
}
assert.ok(atlas.length>=8);
for(const entry of atlas){
 assert.ok(existsSync(`release${entry.image}`),`Missing reference diagram: ${entry.image}`);
 assert.ok(entry.alt&&entry.pros.length&&entry.cons.length&&entry.sources.length,`Incomplete reference: ${entry.id}`);
}
assert.ok(readdirSync('release/assets').some(name=>name.startsWith('worker-')),'Missing physics worker');
console.log('Built modules parse; HTML resources, physics worker and deployment assets exist. Not a browser runtime check.');
